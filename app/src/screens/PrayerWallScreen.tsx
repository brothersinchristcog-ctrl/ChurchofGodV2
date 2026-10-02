import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
  Modal,
  InteractionManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  ChevronLeft,
  CheckCircle, 
  MessageCircle, 
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import firestore from '@react-native-firebase/firestore';
import SalesforceService, { SalesforceMember } from '../services/SalesforceService';
import { PrayerRequest } from '../types/schema';

interface PrayerFormProps {
  prayerInput: string;
  setPrayerInput: (text: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  categories: any[];
  isSubmitting: boolean;
  handleSubmit: () => void;
  isPublic: boolean;
  setIsPublic: (val: boolean) => void;
  activeTab: 'request' | 'mine';
  setActiveTab: (tab: 'request' | 'mine') => void;
}

const PrayerForm = ({ 
  prayerInput, 
  setPrayerInput, 
  category, 
  setCategory, 
  categories, 
  isSubmitting, 
  handleSubmit,
  isPublic,
  setIsPublic,
  activeTab,
  setActiveTab
}: PrayerFormProps) => (
  <View>
    {/* Tab Badge */}
    <View style={styles.badgeContainer}>
      <TouchableOpacity 
        style={[styles.badgeBtn, activeTab === 'mine' && styles.badgeBtnActive]}
        onPress={() => setActiveTab('mine')}
      >
        <Text style={[styles.badgeText, activeTab === 'mine' && styles.badgeTextActive]}>My Prayers</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.badgeBtn, activeTab === 'request' && styles.badgeBtnActive]}
        onPress={() => setActiveTab('request')}
      >
        <Text style={[styles.badgeText, activeTab === 'request' && styles.badgeTextActive]}>Public Prayer Requests</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.composeCard}>
      <View style={styles.composeHeader}>
        <CheckCircle size={16} color="#fff" />
        <Text style={styles.composeHeaderText}>SUBMIT PRAYER REQUEST</Text>
      </View>
      <View style={styles.composeBody}>
      <Text style={styles.inputLabel}>Select Category</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.catList}
      >
        {categories.map((cat) => (
          <TouchableOpacity 
            key={cat.label}
            style={[styles.catBtn, category === cat.label && styles.catBtnActive]}
            onPress={() => setCategory(cat.label)}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, category === cat.label && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.inputLabel}>Detailed Prayer Request</Text>
      <TextInput
        style={styles.composeInput}
        placeholder="Share your prayer request... తెలుగులో కూడా రాయవచ్చు…"
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        value={prayerInput}
        onChangeText={setPrayerInput}
        blurOnSubmit={false}
      />
      <View style={styles.composeFooter}>
        <View style={styles.publicToggleRow}>
          <Text style={styles.publicToggleText}>Public</Text>
          <TouchableOpacity 
            style={[styles.customToggle, isPublic ? styles.customToggleActive : styles.customToggleInactive]}
            onPress={() => setIsPublic(!isPublic)}
            activeOpacity={0.9}
          >
            <View style={[styles.customToggleKnob, isPublic ? styles.customToggleKnobActive : styles.customToggleKnobInactive]} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request 🙏</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>

    {/* Section Header for the Prayer Wall Feed */}
    <View style={styles.wallSectionHeader}>
      <View style={styles.wallHeaderLine} />
      <Text style={styles.wallHeaderText}>COMMUNITY PRAYERS</Text>
      <View style={styles.wallHeaderLine} />
    </View>
  </View>
  </View>
);

const PrayerItem = React.memo(({ 
  item, 
  userPhone, 
  prayedSet, 
  replyInput, 
  setReplyInput, 
  submittingReplyId, 
  handlePray, 
  handleReplySubmit, 
  handleDelete,
  getTimeAgo,
  isPublicWall,
  handlePublicPray
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAnswered = item.isAnswered;
  const initial = item.name.charAt(0).toUpperCase();
  const isOwner = !!(userPhone && item.phone && userPhone === item.phone);
  
  return (
    <View style={[styles.prayerCard, isAnswered && styles.cardAnswered]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: isAnswered ? '#166534' : '#7c3aed' }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isAnswered && styles.nameAnswered]}>
              {item.name}
              {isAnswered && <Text style={styles.answeredBadge}> ✨ Answered!</Text>}
            </Text>
          </View>
          <Text style={styles.metaText}>
            {getTimeAgo(new Date(item.createdAt))} · {item.category || 'General'}
          </Text>
        </View>
      </View>
      
      <View style={[styles.textContainer, isAnswered && styles.textContainerAnswered]}>
        <Text style={[styles.prayerText, isAnswered && styles.prayerTextAnswered]}>
          {item.text}
        </Text>
      </View>

      {/* REPLIES SECTION */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          <Text style={styles.repliesHeader}>Comments & Replies</Text>
          {item.replies.map((reply: any) => (
            <View key={reply.id} style={styles.replyCard}>
              <View style={styles.replyHeader}>
                <Text style={styles.replyAuthor}>{reply.author}</Text>
                <Text style={styles.replyDate}>{new Date(reply.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <Text style={styles.replyBody}>{reply.body}</Text>
            </View>
          ))}
        </View>
      )}

      {isOwner && isAnswered && (
        <View style={styles.addReplyContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Add a comment or thank you note..."
            placeholderTextColor="#94a3b8"
            value={replyInput || ''}
            onChangeText={(text) => setReplyInput(item.id, text)}
            multiline
          />
          <TouchableOpacity 
            style={[styles.replySubmitBtn, !replyInput?.trim() && styles.replySubmitBtnDisabled]}
            onPress={() => handleReplySubmit(item.id)}
            disabled={!replyInput?.trim() || submittingReplyId === item.id}
          >
            {submittingReplyId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.replySubmitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cardFooter}>
        {isPublicWall ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity 
              style={[styles.iprayedBtn, (prayedSet.has(item.id) || isAnswered || isOwner) && styles.iprayedBtnActive]}
              onPress={() => handlePublicPray(item.id)}
              disabled={prayedSet.has(item.id) || isAnswered || isOwner}
            >
              <CheckCircle2 size={14} color={prayedSet.has(item.id) || isAnswered || isOwner ? '#16a34a' : '#2563eb'} />
              <Text style={[styles.iprayedText, (prayedSet.has(item.id) || isAnswered || isOwner) ? styles.iprayedTextAnswered : { color: '#2563eb' }]}>
                {prayedSet.has(item.id) || isAnswered || isOwner ? `Praying (${item.prayCount})` : `I will pray for you (${item.prayCount})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.iprayedBtn, 
                { 
                  paddingHorizontal: 12, 
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  backgroundColor: '#fff'
                }
              ]} 
              onPress={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp size={16} color="#1a2d5a" /> : <ChevronDown size={16} color="#1a2d5a" />}
            </TouchableOpacity>
          </View>
        ) : isOwner ? (
          isAnswered ? (
            <View style={[styles.iprayedBtn, styles.iprayedBtnActive, { backgroundColor: '#dcfce7', borderColor: '#dcfce7' }]}>
              <CheckCircle2 size={14} color="#16a34a" />
              <Text style={[styles.iprayedText, { color: '#16a34a' }]}>Answered</Text>
            </View>
          ) : (
            <View style={[styles.iprayedBtn, { backgroundColor: '#f1f5f9', opacity: 0.7 }]}>
              <Text style={[styles.iprayedText, { color: '#94a3b8' }]}>My Request</Text>
            </View>
          )
        ) : (
          <TouchableOpacity 
            style={[styles.iprayedBtn, (prayedSet.has(item.id) || isAnswered) && styles.iprayedBtnActive]}
            onPress={() => handlePray(item.id, isOwner)}
            disabled={prayedSet.has(item.id) || isAnswered}
          >
            <CheckCircle2 size={14} color={prayedSet.has(item.id) || isAnswered ? '#16a34a' : '#7c3aed'} />
            <Text style={[styles.iprayedText, (prayedSet.has(item.id) || isAnswered) && styles.iprayedTextAnswered]}>
              {prayedSet.has(item.id) || isAnswered ? `We Prayed (${item.prayCount})` : `I prayed (${item.prayCount})`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {isOwner && !isPublicWall && (
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          {!isPublicWall && (
            <Text style={styles.footerDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      {/* WHO PRAYED INLINE LIST */}
      {isExpanded && item.prayingUsers && item.prayingUsers.length > 0 && (
        <View style={styles.prayingList}>
          <Text style={styles.prayingListHeader}>Members praying for you:</Text>
          {item.prayingUsers.map((u: any, idx: number) => {
            const name = typeof u === 'string' ? 'Anonymous Member' : u.name;
            return (
              <View key={idx} style={styles.prayingListItem}>
                <View style={styles.prayingListDot} />
                <Text style={styles.prayingListText}>{name}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
});

export default function PrayerWallScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [member, setMember] = useState<SalesforceMember | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prayedSet, setPrayedSet] = useState(new Set<string>());
  const [replyInputs, setReplyInputs] = useState<{[key: string]: string}>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  
  // Form State
  const [prayerInput, setPrayerInput] = useState('');
  const [category, setCategory] = useState('Pray for me');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'mine'>('mine');
  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);

  useEffect(() => {
    if (route?.params?.openPublicWall) {
      setActiveTab('request');
      navigation.setParams({ openPublicWall: undefined });
    }
  }, [route?.params?.openPublicWall]);

  const categories = [
    { label: 'Pray for me', icon: '👤' },
    { label: 'Pray for my family', icon: '🏠' },
    { label: 'Pray for healing', icon: '🏥' },
    { label: 'Pray for peace and strength', icon: '🕊️' },
    { label: 'Other (if necessary)', icon: '✨' }
  ];

  const fetchPrayers = async (contactId?: string, isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await SalesforceService.getPrayerRequests({ contactId });
      
      // Fetch Firestore reactions safely
      let reactions: Record<string, any> = {};
      try {
        const snapshot = await firestore().collection('prayer_reactions').get();
        snapshot.docs.forEach(doc => {
          reactions[doc.id] = doc.data();
        });
      } catch (err) {
        console.log('Firebase reactions fetch failed', err);
      }

      // Merge Salesforce data with Firebase reactions
      const mergedData = data.map((p: any) => {
        const reactionData = reactions[p.id] || { count: 0, users: [] };
        return {
          ...p,
          prayCount: reactionData.count || 0,
          prayingUsers: reactionData.users || []
        };
      });

      setPrayers(mergedData);
    } catch (error) {
      console.error('Error fetching prayers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPublicPrayers = async () => {
    try {
      const data = await SalesforceService.getPrayerRequests({ publicWall: true });
      
      // Fetch Firestore reactions safely
      let reactions: Record<string, any> = {};
      try {
        const snapshot = await firestore().collection('prayer_reactions').get();
        snapshot.docs.forEach(doc => {
          reactions[doc.id] = doc.data();
        });
      } catch (err) {
        console.log('Firebase reactions fetch failed, likely due to security rules. Continuing with 0 reactions.', err);
      }

      // Merge Salesforce data with Firebase reactions
      const mergedData = data.map((p: any) => {
        const reactionData = reactions[p.id] || { count: 0, users: [] };
        let hasPrayed = false;
        if (user?.uid) {
           hasPrayed = reactionData.users.some((u: any) => typeof u === 'string' ? u === user.uid : u.uid === user.uid);
        }
        if (hasPrayed) {
          // Pre-populate prayed set if the user already clicked "I will pray for you"
          setPrayedSet(prev => new Set(prev).add(p.id));
        }
        return {
          ...p,
          prayCount: reactionData.count || 0,
          prayingUsers: reactionData.users || []
        };
      });

      setPublicPrayers(mergedData);
    } catch (error) {
      console.error('Error fetching public prayers:', error);
    }
  };

  useEffect(() => {
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      const init = async () => {
        let contactId = undefined;
        if (user?.phoneNumber) {
          const result = await SalesforceService.checkContactExists(user.phoneNumber);
          if (result?.exists && result.member) {
            setMember(result.member);
            contactId = result.member.id;
          }
        }
        fetchPrayers(contactId, false);
      };
      init();
    });
    return () => interactionPromise.cancel();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      const interactionPromise = InteractionManager.runAfterInteractions(() => {
        fetchPrayers(member?.id, true);
      });
      return () => interactionPromise.cancel();
    }, [member?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrayers(member?.id || undefined, true);
    if (activeTab === 'request') fetchPublicPrayers();
  };

  // Fetch public prayers when switching to that tab
  useEffect(() => {
    if (activeTab === 'request') {
      fetchPublicPrayers();
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    if (!prayerInput.trim()) {
      Alert.alert('Missing Info', 'Please share your prayer request.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SalesforceService.submitPrayerRequest({
        name: member?.name || user?.displayName || 'Faithful Member',
        phone: user?.phoneNumber || '',
        contactId: member?.id || null,
        request: prayerInput,
        category: category,
        isAnonymous: !isPublic,
        isPublic: isPublic
      });

      setShowSuccess(true);
      setPrayerInput('');
      setIsPublic(false);
      fetchPrayers(member?.id || undefined, true);
    } catch (err) {
      Alert.alert('Error', 'Unable to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return Math.floor(hours / 24) + " days ago";
  };

  const handlePray = (id: string, isOwner: boolean) => {
    if (isOwner || prayedSet.has(id)) return;
    
    setPrayedSet(prev => new Set(prev).add(id));
    setPrayers(prevPrayers => 
      prevPrayers.map(p => p.id === id ? { ...p, prayCount: (p.prayCount || 0) + 1 } : p)
    );
  };

  const handlePublicPray = async (id: string) => {
    if (prayedSet.has(id) || !user?.uid) return;
    
    // Optimistic UI update
    setPrayedSet(prev => new Set(prev).add(id));
    setPublicPrayers(prevPrayers => 
      prevPrayers.map(p => p.id === id ? { ...p, prayCount: (p.prayCount || 0) + 1 } : p)
    );

    try {
      const authorName = member?.name || user?.displayName || 'Member';
      // Store reaction in Firebase
      await firestore().collection('prayer_reactions').doc(id).set({
        count: firestore.FieldValue.increment(1),
        users: firestore.FieldValue.arrayUnion({ uid: user.uid, name: authorName })
      }, { merge: true });
    } catch (error) {
      console.error('Error recording prayer reaction:', error);
      Alert.alert('Error', 'Unable to record your reaction. Please try again.');
    }
  };

  const handleReplySubmit = async (caseId: string) => {
    const comment = replyInputs[caseId]?.trim();
    if (!comment) return;
    
    setSubmittingReplyId(caseId);
    try {
      const authorName = member?.name || user?.displayName || 'Member';
      await SalesforceService.addPrayerComment(caseId, comment, authorName);
      setReplyInputs(prev => ({ ...prev, [caseId]: '' }));
      fetchPrayers(member?.id || undefined, true);
    } catch (err) {
      Alert.alert('Error', 'Unable to post comment. Please try again.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to remove this prayer request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await SalesforceService.deletePrayerRequest(id);
              fetchPrayers(member?.id || undefined, true);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  const handleSetReplyInput = (id: string, text: string) => {
    setReplyInputs(prev => ({ ...prev, [id]: text }));
  };

  const renderPrayerItem = ({ item }: { item: PrayerRequest }) => {
    return (
      <PrayerItem 
        item={item} 
        userPhone={user?.phoneNumber}
        prayedSet={prayedSet}
        replyInput={replyInputs[item.id]}
        setReplyInput={(id: string, text: string) => setReplyInputs(prev => ({...prev, [id]: text}))}
        submittingReplyId={submittingReplyId}
        handlePray={handlePray}
        handleReplySubmit={handleReplySubmit}
        handleDelete={handleDelete}
        getTimeAgo={getTimeAgo}
        isPublicWall={activeTab === 'request'}
        handlePublicPray={handlePublicPray}
      />
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.primary }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Connecting to Prayer Wall...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? "#0a2350" : "#1a2d5a"} />
      
      {/* 🔥 Page Header 🔥 */}
      <LinearGradient
        colors={isDark ? ['#60a5fa', '#3b82f6', '#60a5fa'] : ['#1e40af', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          paddingBottom: 4,
          elevation: 8,
          shadowColor: '#030a1e',
          shadowOpacity: 0.75,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <View style={[styles.header, { backgroundColor: isDark ? '#0a2350' : '#1a2d5a', paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Tabs', { screen: 'Home' });
              }
            }}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Prayer Wall</Text>
            <Text style={styles.headerSub}>{prayers.length} requests · Share your prayer</Text>
          </View>
  
          <View style={{ width: 60 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={activeTab === 'request' ? publicPrayers : prayers}
        renderItem={renderPrayerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" />}
        ListHeaderComponent={
          activeTab === 'mine' ? (
            <PrayerForm 
              prayerInput={prayerInput}
              setPrayerInput={setPrayerInput}
              category={category}
              setCategory={setCategory}
              categories={categories}
              isSubmitting={isSubmitting}
              handleSubmit={handleSubmit}
              isPublic={isPublic}
              setIsPublic={setIsPublic}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : (
            <View style={styles.badgeContainer}>
              <TouchableOpacity 
                style={[styles.badgeBtn]}
                onPress={() => setActiveTab('mine')}
              >
                <Text style={[styles.badgeText]}>My Prayers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.badgeBtn, styles.badgeBtnActive]}
                onPress={() => setActiveTab('request')}
              >
                <Text style={[styles.badgeText, styles.badgeTextActive]}>Public Prayer Requests</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListEmptyComponent={
          activeTab === 'request' ? (
            <View style={styles.emptyState}>
              <MessageCircle size={50} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Public Prayer Requests</Text>
              <Text style={styles.emptySub}>Approved prayer requests from church members will appear here.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MessageCircle size={50} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No prayer requests yet</Text>
              <Text style={styles.emptySub}>Be the first to share your burden with the community.</Text>
            </View>
          )
        }
      />

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}><CheckCircle size={40} color="#fff" /></View>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successSub}>May God answer your prayers according to His will.</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.doneBtnTxt}>Amen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#1a2d5a', marginTop: 15, fontWeight: '600' },

  // Header
  header: {
    backgroundColor: '#1a2d5a',
    paddingTop: Platform.OS === 'ios' ? 60 : 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#aac4e8', fontSize: 12, marginTop: 2 },
  themeToggle: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  themeToggleText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  listContainer: { paddingBottom: 150 },

  badgeContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24, // Added spacing below badge
    borderRadius: 25,
    padding: 4,
  },
  badgeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  badgeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#000'
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  badgeTextActive: {
    color: '#1a2d5a',
    fontWeight: '800'
  },

  // Custom Toggle Button
  customToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleActive: {
    backgroundColor: '#1a2d5a',
  },
  customToggleInactive: {
    backgroundColor: '#cbd5e1',
  },
  customToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  customToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  customToggleKnobInactive: {
    alignSelf: 'flex-start',
  },

  // Compose Card
  composeCard: { 
    margin: 20, 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1a2d5a',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  composeHeader: { 
    backgroundColor: '#1a2d5a', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  composeHeaderText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
  composeBody: { padding: 20 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  catList: { gap: 12, paddingBottom: 15 },
  catBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    gap: 8
  },
  catBtnActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 13, color: '#475569', fontWeight: '700' },
  catLabelActive: { color: '#fff' },

  composeInput: { 
    width: '100%', 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    padding: 18, 
    fontSize: 15, 
    lineHeight: 24,
    color: '#1e293b', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0',
    minHeight: 140, 
    textAlignVertical: 'top',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  composeFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  submitBtn: { 
    backgroundColor: '#1a2d5a', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 15, 
    elevation: 4,
    shadowColor: '#1a2d5a',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  publicToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  publicToggleText: { fontSize: 13, fontWeight: '700', color: '#1a2d5a' },

  // Prayer Card
  prayerCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginHorizontal: 20, 
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardAnswered: { borderColor: '#bbf7d0', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  nameAnswered: { color: '#166534' },
  answeredBadge: { color: '#16a34a', fontWeight: '800', fontSize: 13 },
  countBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  countTextAnswered: { color: '#166534', backgroundColor: '#dcfce7' },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '400' },
  
  textContainer: { 
    marginBottom: 16, 
    paddingHorizontal: 2
  },
  textContainerAnswered: { },
  prayerText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  prayerTextAnswered: { color: '#166534', fontWeight: '600' },

  repliesContainer: { marginBottom: 15, marginLeft: 15, paddingLeft: 15, borderLeftWidth: 2, borderLeftColor: '#e2e8f0' },
  repliesHeader: { fontSize: 13, fontWeight: '800', color: '#1a2d5a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  replyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  replyAuthor: { fontSize: 13, fontWeight: '700', color: '#1a2d5a' },
  replyDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  replyBody: { fontSize: 14, color: '#475569', lineHeight: 22 },

  addReplyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 5,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end'
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 44,
    maxHeight: 100
  },
  replySubmitBtn: {
    backgroundColor: '#c13b2d',
    paddingHorizontal: 15,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  replySubmitBtnDisabled: {
    backgroundColor: '#94a3b8'
  },
  replySubmitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iprayedBtn: { 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  iprayedBtnActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  iprayedText: { fontSize: 14, color: '#1a2d5a', fontWeight: '800' },
  iprayedTextAnswered: { color: '#16a34a' },
  footerDate: { fontSize: 12, color: '#94a3b8' },

  prayingList: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  prayingListHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  prayingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4
  },
  prayingListDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a2d5a'
  },
  prayingListText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500'
  },

  // Empty State
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a2d5a', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Success Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 45, 90, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  successCard: { backgroundColor: '#fff', width: '100%', borderRadius: 32, padding: 35, alignItems: 'center', elevation: 25 },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#1a2d5a', marginBottom: 12 },
  successSub: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  doneBtn: { backgroundColor: '#c13b2d', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 18, width: '100%', alignItems: 'center' },
  doneBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1 },

  // Wall Section Header
  wallSectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 15, 
    paddingHorizontal: 20 
  },
  wallHeaderLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#e2e8f0' 
  },
  wallHeaderText: { 
    marginHorizontal: 15, 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#1a2d5a', 
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  }
});
