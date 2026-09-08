import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, ImageBackground, Keyboard, Modal } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import SalesforceService from '../../services/SalesforceService';
import { ChevronLeft, ArrowLeft, Send, MessageCircle, Phone as PhoneIcon, Video, MoreVertical, User, Check, CheckCheck, Search, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  fromPhone: string;
  fromName: string;
  text: string;
  timestamp: Date;
  type: 'incoming' | 'outgoing';
  isRead?: boolean;
  adminId?: string;
  adminName?: string;
  sendMethod?: string;
  imageUrl?: string;
}

interface Conversation {
  phone: string;
  name: string;
  latestMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
  unreadCount?: number;
  assignedAdmin?: string;
}

export default function AdminInbox() {
  const { member } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // Chat View State
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'my_chats' | 'all_chats'>('my_chats');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const executeDeleteChats = async () => {
    if (!activeChat) return;
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      const querySnapshot = await firestore()
        .collection('whatsapp_messages')
        .where('fromPhone', '==', activeChat.phone)
        .get();
      
      const batch = firestore().batch();
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setActiveChat(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
      Alert.alert("Error", "Failed to delete chat messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const sfMembers = await SalesforceService.getAdminMembers();
        if (sfMembers && sfMembers.length > 0) {
          const map: Record<string, string> = {};
          sfMembers.forEach(contact => {
            const name = contact.Name || `${contact.FirstName || ''} ${contact.LastName || ''}`.trim();
            if (name) {
              if (contact.Phone) {
                const digits = contact.Phone.replace(/\D/g, '');
                if (digits.length >= 10) map[digits.slice(-10)] = name;
              }
              if (contact.MobilePhone) {
                const digits = contact.MobilePhone.replace(/\D/g, '');
                if (digits.length >= 10) map[digits.slice(-10)] = name;
              }
            }
          });
          setContactMap(map);
        }

        const usersSnap = await firestore().collection('users').get();
        const photoMap: Record<string, string> = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.photoURL && data.phone) {
            const digits = data.phone.replace(/\D/g, '');
            if (digits.length >= 10) photoMap[digits.slice(-10)] = data.photoURL;
          }
        });
        setUserPhotos(photoMap);

      } catch (e) {
        console.warn('Could not load Salesforce contacts or user photos', e);
      }
    })();
  }, []);

  const getPhotoUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    return userPhotos[last10];
  };

  const getDisplayName = (waName: string | undefined, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    
    if (contactMap[last10]) return contactMap[last10];
    if (waName && waName !== '.' && waName !== 'Unknown') return waName;
    return phone;
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Hide splash screen after 1.5 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    // Listen to whatsapp_messages collection
    const unsubscribe = firestore()
      .collection('whatsapp_messages')
      .orderBy('timestamp', 'asc') // Fetch older first, so we can group them
      .onSnapshot((snapshot) => {
        if (!snapshot) return;

        const messages: ChatMessage[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.fromPhone) {
            messages.push({
              id: doc.id,
              fromPhone: data.fromPhone,
              fromName: data.fromName || data.fromPhone,
              text: data.text || '',
              timestamp: data.timestamp?.toDate() || new Date(),
              type: data.type || 'incoming',
              isRead: data.isRead ?? false,
              adminId: data.adminId || data.conversationOwner,
              adminName: data.adminName,
              sendMethod: data.sendMethod,
              imageUrl: data.imageUrl
            });
          }
        });

        // Group by phone
        const map = new Map<string, Conversation>();
        messages.forEach(msg => {
          if (!map.has(msg.fromPhone)) {
            map.set(msg.fromPhone, {
              phone: msg.fromPhone,
              name: msg.fromName,
              latestMessage: msg.text,
              timestamp: msg.timestamp,
              messages: [],
              unreadCount: 0
            });
          }
          const conv = map.get(msg.fromPhone)!;
          conv.messages.push(msg);
          if (msg.type === 'incoming' && !msg.isRead) {
            conv.unreadCount! += 1;
          }
          // Update latest message info
          if (msg.timestamp >= conv.timestamp) {
            conv.latestMessage = msg.text;
            conv.timestamp = msg.timestamp;
            conv.name = msg.type === 'incoming' && msg.fromName !== 'Unknown' ? msg.fromName : conv.name;
          }
          if (msg.adminId && msg.adminId !== 'unassigned') {
            conv.assignedAdmin = msg.adminId;
          }
        });

        // Convert to array and sort by latest activity
        const sortedConvs = Array.from(map.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setConversations(sortedConvs);
        
        // If a chat is active, update its messages array
        if (activeChat) {
          const updatedActive = map.get(activeChat.phone);
          if (updatedActive) {
            setActiveChat(updatedActive);
          }
        }
        
        setLoading(false);
      }, (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      });

    return () => {
      unsubscribe();
      clearTimeout(splashTimer);
    };
  }, [activeChat?.phone]);

  const handleSend = async () => {
    if (!replyText.trim() || !activeChat) return;
    const textToSend = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      const sendWish = functions().app.functions('asia-south1').httpsCallable('sendWhatsAppWish');
      await sendWish({
        phoneNumber: activeChat.phone,
        messageBody: textToSend
      });

      const admin = auth().currentUser;
      const adminId = admin?.uid || 'unknown_admin';
      
      let adminName = member?.name || admin?.displayName;
      if (!adminName && admin) {
        try {
          const userDoc = await firestore().collection('users').doc(admin.uid).get();
          adminName = userDoc.data()?.name;
        } catch (e) {}
      }
      adminName = adminName || admin?.email?.split('@')[0] || 'Admin';

      await firestore().collection('whatsapp_messages').add({
        fromPhone: activeChat.phone,
        fromName: activeChat.name,
        text: textToSend,
        timestamp: new Date(),
        type: 'outgoing',
        adminId: adminId,
        adminName: adminName,
        conversationOwner: adminId,
        createdAt: firestore.FieldValue.serverTimestamp()
      });

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to send message. Ensure the user messaged you within the last 24 hours.');
      setReplyText(textToSend); // put text back on failure
    } finally {
      setSending(false);
    }
  };

  const openChat = async (item: Conversation) => {
    setActiveChat(item);
    // Mark all unread incoming messages as read
    const unreadMessages = item.messages.filter(m => m.type === 'incoming' && !m.isRead);
    if (unreadMessages.length > 0) {
      try {
        const batch = firestore().batch();
        unreadMessages.forEach(msg => {
          const docRef = firestore().collection('whatsapp_messages').doc(msg.id);
          batch.update(docRef, { isRead: true });
        });
        await batch.commit();
      } catch (e) {
        console.error('Error marking messages as read', e);
      }
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isToday = item.timestamp.toLocaleDateString() === new Date().toLocaleDateString();
    const displayName = getDisplayName(item.name, item.phone);
    return (
      <View style={styles.convItem}>
        <TouchableOpacity 
          style={styles.avatar}
          onPress={() => setPreviewImage(getPhotoUrl(item.phone) || 'default')}
        >
          {getPhotoUrl(item.phone) ? (
            <Image source={{ uri: getPhotoUrl(item.phone) }} style={{ width: 50, height: 50, borderRadius: 25 }} />
          ) : (
            <User size={30} color="#cbd5e1" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.convDetails} onPress={() => openChat(item)}>
          <View style={styles.convHeader}>
            <Text style={styles.convName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.convTime}>
              {isToday 
                ? item.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : item.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.msgPreviewContainer}>
            {item.messages[item.messages.length - 1]?.type === 'outgoing' && (
              <CheckCheck size={14} color="#53bdeb" style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.convMessage, item.unreadCount ? { color: '#fff', fontWeight: 'bold' } : {}]} numberOfLines={1}>
              {item.latestMessage}
            </Text>
            {!!item.unreadCount && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => {
    const isIncoming = item.type === 'incoming';
    const currentMessageDate = item.timestamp.toLocaleDateString();
    let showDateBadge = false;
    let dateText = '';
    
    // In an inverted list, the array is reversed. index 0 is the newest message.
    // index + 1 is the older message.
    // We show a date badge visually *above* this message if it's the oldest message of the day.
    const reversedMessages = [...activeChat!.messages].reverse();
    const olderMessage = reversedMessages[index + 1];
    
    if (!olderMessage || olderMessage.timestamp.toLocaleDateString() !== currentMessageDate) {
      showDateBadge = true;
    }

    if (showDateBadge) {
      const today = new Date().toLocaleDateString();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      if (currentMessageDate === today) {
        dateText = 'Today';
      } else if (currentMessageDate === yesterday) {
        dateText = 'Yesterday';
      } else {
        dateText = item.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    // Because the list is inverted, rendering the badge *after* the bubble 
    // makes it appear *above* the bubble visually.
    return (
      <View>
        <View style={[styles.msgWrapper, isIncoming ? styles.msgWrapperIncoming : styles.msgWrapperOutgoing]}>
          <View style={{ alignItems: isIncoming ? 'flex-start' : 'flex-end' }}>
            <View style={[styles.msgBubble, isIncoming ? styles.msgBubbleIncoming : styles.msgBubbleOutgoing]}>
              {item.imageUrl && (
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} 
                  resizeMode="cover" 
                />
              )}
              <Text style={styles.msgText}>{item.text}</Text>
              <View style={styles.msgFooter}>
                <Text style={styles.msgTime}>
                  {item.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </Text>
                {!isIncoming && (
                  <CheckCheck size={14} color="#53bdeb" style={{ marginLeft: 4 }} />
                )}
              </View>
            </View>
            {!isIncoming && (item.adminName || item.sendMethod) && (
              <View style={{ backgroundColor: '#202c33', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#8696a0', fontStyle: 'italic' }}>
                  {item.sendMethod === 'Auto Sent' ? '🤖 Auto Sent' : `Sent by ${item.adminName || 'Admin'}${item.sendMethod ? ` (${item.sendMethod === 'System Sent' ? '🌐 ' : '📱 '}${item.sendMethod})` : ''}`}
                </Text>
              </View>
            )}
          </View>
        </View>
        {showDateBadge && (
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <View style={{ backgroundColor: '#202c33', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: '#8696a0', fontSize: 12, fontWeight: '500' }}>{dateText}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashCenter}>
          <Image 
            source={{ uri: 'https://img.icons8.com/color/512/whatsapp--v1.png' }}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.splashFooter}>
          <Text style={styles.splashFrom}>from</Text>
          <View style={styles.metaRow}>
            <Image 
              source={{ uri: 'https://img.icons8.com/ios-filled/512/meta.png' }}
              style={{ width: 22, height: 14, tintColor: '#25D366' }}
              resizeMode="contain"
            />
            <Text style={styles.splashMeta}>Meta</Text>
          </View>
        </View>
      </View>
    );
  }

  if (activeChat) {
    return (
      <>
        <KeyboardAvoidingView 
          style={[styles.chatContainer, Platform.OS === 'android' && { paddingBottom: keyboardHeight }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backBtn}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.avatar, styles.headerAvatar]}
            onPress={() => setPreviewImage(getPhotoUrl(activeChat.phone) || 'default')}
          >
            {getPhotoUrl(activeChat.phone) ? (
              <Image source={{ uri: getPhotoUrl(activeChat.phone) }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <User size={20} color="#cbd5e1" />
            )}
          </TouchableOpacity>
          <View style={[styles.chatHeaderInfo, { marginLeft: 6 }]}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {getDisplayName(activeChat.name, activeChat.phone)}
            </Text>
          </View>
          <View style={styles.chatHeaderIcons}>
            <PhoneIcon size={20} color="#fff" style={styles.headerIcon} />
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              <MoreVertical size={20} color="#fff" />
            </TouchableOpacity>
            {showMenu && (
              <View style={{ position: 'absolute', top: 40, right: 10, backgroundColor: '#233138', borderRadius: 8, paddingVertical: 6, minWidth: 160, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
                <TouchableOpacity onPress={() => { setShowMenu(false); setShowDeleteConfirm(true); }} style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Trash2 size={18} color="#ff6b6b" />
                  <Text style={{ color: '#ff6b6b', fontSize: 16, fontWeight: '500' }}>Delete chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chatBackground}>
          <FlatList
            ref={flatListRef}
            data={[...activeChat.messages].reverse()}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            inverted
          />

          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor="#8696a0"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={1000}
              />
              {replyText.trim().length > 0 && (
                <TouchableOpacity 
                  style={[styles.insideSendBtn, sending && styles.sendBtnDisabled]} 
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={16} color="#fff" style={{ marginLeft: -2, marginTop: 2 }} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewModal}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
          {previewImage === 'default' ? (
            <View style={{ width: 250, height: 250, borderRadius: 125, backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' }}>
              <User size={120} color="#fff" />
            </View>
          ) : previewImage ? (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11, 20, 26, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Trash2 size={30} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' }}>Delete Conversation?</Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
              This will permanently delete all messages with <Text style={{ fontWeight: '700', color: '#334155' }}>{activeChat?.name && activeChat.name !== 'Unknown' ? activeChat.name : activeChat?.phone}</Text>. This action cannot be undone.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 15, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' }} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 15, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }} onPress={executeDeleteChats}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        <View style={styles.headerIcons}>
          <MoreVertical size={24} color="#fff" />
        </View>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#8696a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#8696a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>



      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#075E54" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={48} color="#cbd5e1" strokeWidth={1} />
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          data={conversations.filter(conv => {
            const q = searchQuery.toLowerCase();
            const name = getDisplayName(conv.name, conv.phone).toLowerCase();
            const phone = conv.phone.toLowerCase();
            return name.includes(q) || phone.includes(q);
          })}
          keyExtractor={item => item.phone}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewModal}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
          {previewImage === 'default' ? (
            <View style={{ width: 250, height: 250, borderRadius: 125, backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' }}>
              <User size={120} color="#fff" />
            </View>
          ) : previewImage ? (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashFooter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  splashFrom: {
    fontSize: 14,
    color: '#8696a0',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 4,
  },
  splashMeta: {
    fontSize: 20,
    fontWeight: '600',
    color: '#25D366',
  },
  container: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#0b141a',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#0b141a',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeTab: {
    backgroundColor: '#075E54', // Pure dark green
    borderColor: '#075E54',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  activeTabText: {
    color: '#ffffff', // White text on dark green background
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#0b141a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0b141a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    height: '100%',
  },
  listContent: {
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  convItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
  },
  convDetails: {
    flex: 1,
    marginLeft: 15,
    paddingBottom: 12,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  convTime: {
    fontSize: 12,
    color: '#667781',
  },
  msgPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  convMessage: {
    fontSize: 14,
    color: '#667781',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#00a884',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#111b21',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Chat View Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
    paddingBottom: 10,
    paddingHorizontal: 5,
    backgroundColor: '#0b141a',
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -2,
    marginRight: 8,
  },
  chatHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 1,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  chatHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  headerIcon: {
    marginRight: 20,
  },
  chatBackground: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  chatList: {
    padding: 10,
    paddingBottom: 20,
  },
  msgWrapper: {
    width: '100%',
    marginBottom: 4,
    flexDirection: 'row',
  },
  msgWrapperIncoming: {
    justifyContent: 'flex-start',
  },
  msgWrapperOutgoing: {
    justifyContent: 'flex-end',
  },
  msgBubble: {
    maxWidth: '80%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  msgBubbleIncoming: {
    backgroundColor: '#202c33', // WhatsApp standard dark grey for incoming
    borderTopLeftRadius: 0,
  },
  msgBubbleOutgoing: {
    backgroundColor: '#005c4b', // Green for admin
    borderTopRightRadius: 0,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#e9edef',
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: -2,
  },
  msgTime: {
    fontSize: 11,
    color: '#8696a0',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202c33',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 44,
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#e9edef',
    padding: 0,
    margin: 0,
    paddingVertical: 4,
  },
  insideSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
