import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Animated
} from 'react-native';
import {
  Heart,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Trash2,
  AlertCircle,
  Plus,
  Send,
  MoreVertical,
  Megaphone,
  Info,
  AlertTriangle,
  Menu
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import SalesforceService from '../../services/SalesforceService';
import Theme from '../../theme/Theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function AdminPrayerModeration() {
  const { member } = useAuth();
  const adminName = member?.name || 'Administrator';
  const { openDrawer } = React.useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'confirm' | 'success' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    onCancel: undefined as (() => void) | undefined,
    confirmText: '',
    cancelText: ''
  });
  const showAlert = (config: any) => setAlertConfig({ ...config, visible: true });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showPostAs, setShowPostAs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const successAnim = React.useRef(new Animated.Value(0)).current;

  const triggerSuccess = () => {
    setShowSuccessModal(true);
    Animated.spring(successAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start();
  };

  const closeSuccess = () => {
    Animated.timing(successAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => setShowSuccessModal(false));
  };

  const handleMemberSearch = async (query: string) => {
    setMemberSearchQuery(query);
    if (query.length < 3) {
      setMemberSearchResults([]);
      return;
    }
    setSearchingMembers(true);
    try {
      const results = await SalesforceService.searchMembers(query);
      setMemberSearchResults(results);
    } catch (error) {
      console.error('Member search error:', error);
    } finally {
      setSearchingMembers(false);
    }
  };

  const prayerCategories = [
    'Pray for me',
    'Pray for my family',
    'Pray for healing',
    'Pray for peace and strength',
    'Other (if necessary)'
  ];

  const [pastorRequest, setPastorRequest] = useState({
    en: '',
    te: '',
    category: 'Pray for me',
    postAs: adminName
  });
  // Update default postAs when member info loads
  useEffect(() => {
    if (member?.name) {
      setPastorRequest(prev => ({ ...prev, postAs: member.name }));
    }
  }, [member]);

  const postAsOptions = [
    adminName,
    'Church of GOD — Corporate',
    'Anonymous'
  ];

  const fetchPrayers = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await SalesforceService.getPrayerRequests({ isAdmin: true });
      setPrayers(data);
    } catch (error) {
      console.error('Error fetching admin prayers:', error);
      showAlert({ title: 'Error', message: 'Failed to load prayer requests from Salesforce.', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrayers(true);
  };

  const handleAnswer = (id: string) => {
    // 1. Immediate optimistic UI update
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, status: 'Answered' } : p));
    
    // 2. Immediate success card
    showAlert({ title: 'Success', message: 'Prayer request status updated as Answered.', type: 'success' });
    // 3. Background API call
    SalesforceService.markAsAnswered(id).then(() => {
      fetchPrayers(true); // Sync fresh data in background
    }).catch(err => {
      // Revert if failed
      fetchPrayers(true);
      showAlert({ title: 'Error', message: 'Failed to update status.', type: 'error' });
    });
  };

  const handleRemove = async (id: string) => {
    showAlert({
      title: 'Remove Request',
      message: 'Are you sure you want to permanently delete this prayer request?',
      type: 'confirm',
      confirmText: 'REMOVE',
      cancelText: 'CANCEL',
      onConfirm: async () => {
        try {
          await SalesforceService.deletePrayerRequest(id);
          fetchPrayers(true);
          showAlert({ title: 'Deleted', message: 'Prayer request removed successfully.', type: 'success' });
        } catch (err) {
          showAlert({ title: 'Error', message: 'Failed to delete request', type: 'error' });
        }
      },
      onCancel: () => closeAlert()
    });
  };

  const handlePublish = async () => {
    if (!pastorRequest.en.trim()) {
      showAlert({ title: 'Missing Info', message: 'Please enter the prayer request text.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await SalesforceService.submitPrayerRequest({
        name: selectedMember ? selectedMember.name : pastorRequest.postAs,
        phone: selectedMember ? selectedMember.phone : null,
        contactId: selectedMember ? selectedMember.id : null,
        requestEn: pastorRequest.en,
        requestTe: pastorRequest.te,
        category: pastorRequest.category
      });
      setPastorRequest({ ...pastorRequest, en: '', te: '' });
      setSelectedMember(null);
      setMemberSearchQuery('');
      setShowCreateModal(false);
      triggerSuccess();
      fetchPrayers(true);
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to publish request.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingPrayers = prayers.filter(p => !p.isAnswered);
  const answeredPrayers = prayers.filter(p => p.isAnswered);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return Math.floor(hours / 24) + "d ago";
  };

  const renderPrayerCard = (item: any, isAnswered = false) => (
    <View key={item.id} style={[styles.pCard, isAnswered && styles.pCardAnswered]}>
      <View style={styles.pCardHd}>
        <View style={[styles.pAvatar, { backgroundColor: isAnswered ? '#059669' : '#7C3AED' }]}>
          <Text style={styles.pAvatarTxt}>{(item.name || 'F').charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.pUserName}>{item.name}</Text>
            {isAnswered && (
              <View style={styles.ansBadge}>
                <CheckCircle2 size={10} color={Theme.Colors.success} />
                <Text style={styles.ansBadgeTxt}>Processed</Text>
              </View>
            )}
          </View>
          <Text style={styles.pTime}>{getTimeAgo(item.createdAt)}{item.phone ? ` · ${item.phone}` : ''}</Text>
        </View>
        {!isAnswered && (
          <TouchableOpacity onPress={() => handleRemove(item.id)}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pTextContainer}>
        <Text style={styles.pText}>{item.text}</Text>
        {item.textTe && item.textTe.trim() !== (item.text || '').trim() && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: isDark ? colors.border : '#cbd5e1' }}>
            <Text style={[styles.pText, { fontStyle: 'italic', color: isDark ? '#cbd5e1' : '#475569' }]}>
              {item.textTe}
            </Text>
          </View>
        )}
      </View>

      {/* REPLIES / COMMENTS SECTION */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          <Text style={styles.repliesHeader}>Comments</Text>
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

      <View style={styles.pFooter}>
        <View style={styles.catBadge}>
          <View style={styles.catDot} />
          <Text style={styles.catTxt}>{item.category || 'General'}</Text>
        </View>

        {!isAnswered && (
          <View style={styles.pActions}>
            <TouchableOpacity
              style={[styles.pActionBtn, { backgroundColor: '#F0FDF4' }]}
              onPress={() => handleAnswer(item.id)}
            >
              <CheckCircle2 size={12} color="#15803D" />
              <Text style={[styles.pActionBtnTxt, { color: '#15803D' }]}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.Colors.primary} />
        <Text style={{ marginTop: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Loading Prayer Wall...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
        <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={openDrawer} style={{ padding: 4 }}>
              <Menu size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Prayers</Text>
            </View>

            <TouchableOpacity style={styles.headerCreateBtn} onPress={() => setShowCreateModal(true)}>
              <Plus size={14} color="#1a2d5a" />
              <Text style={styles.headerCreateBtnTxt}>Create</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statsPill}>
            <Text style={styles.statsPillText}>
              <Text style={{ color: '#ef4444', fontWeight: '800' }}>{pendingPrayers.length}</Text> New Requests
            </Text>
            <Text style={styles.statsDivider}>|</Text>
            <Text style={styles.statsPillText}>
              <Text style={{ color: '#10b981', fontWeight: '800' }}>{answeredPrayers.length}</Text> Processed
            </Text>
          </View>
        </View>

        {/* ── Pending Review ── */}
        {pendingPrayers.length > 0 && (
          <>
            <View style={styles.listHd}>
              <Text style={[styles.listHdTitle, { color: Theme.Colors.accent }]}>Requests for Review ({pendingPrayers.length})</Text>
            </View>
            {pendingPrayers.map(p => renderPrayerCard(p))}
          </>
        )}

        {/* ── Answered Section ── */}
        {answeredPrayers.length > 0 && (
          <>
            <View style={[styles.listHd, { marginTop: 20 }]}>
              <Text style={styles.listHdTitle}>Recent History</Text>
            </View>
            {answeredPrayers.slice(0, 5).map(p => renderPrayerCard(p, true))}
          </>
        )}

      </ScrollView>

      {/* ── Create Prayer Request Modal ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>Create New Prayer Request</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
                <XCircle size={24} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* Member Lookup */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Church Member</Text>
                <View style={styles.searchBox}>
                  <TextInput
                    placeholder="Search by name or phone..."
                    style={styles.searchInput}
                    value={memberSearchQuery}
                    onChangeText={handleMemberSearch}
                  />
                  {searchingMembers && <ActivityIndicator size="small" color={Theme.Colors.primary} />}
                </View>

                {memberSearchResults.length > 0 && !selectedMember && (
                  <View style={styles.searchResults}>
                    {memberSearchResults.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.searchItem}
                        onPress={() => {
                          setSelectedMember(m);
                          setMemberSearchResults([]);
                          setMemberSearchQuery(m.name);
                        }}
                      >
                        <View>
                          <Text style={styles.searchItemName}>{m.name}</Text>
                          <Text style={styles.searchItemPhone}>{m.phone || 'No Phone'}</Text>
                        </View>
                        <Plus size={14} color={Theme.Colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedMember && (
                  <View style={styles.selectedBadge}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <User size={14} color="#fff" />
                      <Text style={styles.selectedBadgeTxt}>{selectedMember.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedMember(null)}>
                      <XCircle size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prayer Category</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowPicker(!showPicker)}
                >
                  <Text style={styles.pickerTxt}>
                    {pastorRequest.category || 'Select Category'}
                  </Text>
                  <MoreVertical size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>

                {showPicker && (
                  <View style={styles.categoryList}>
                    {prayerCategories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catOption, pastorRequest.category === cat && styles.catOptionActive]}
                        onPress={() => {
                          setPastorRequest({ ...pastorRequest, category: cat });
                          setShowPicker(false);
                        }}
                      >
                        <Text style={[styles.catOptionTxt, pastorRequest.category === cat && { color: '#fff' }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prayer request text — English</Text>
                <View style={styles.textArea}>
                  <TextInput
                    placeholder="Type the prayer request details..."
                    multiline
                    numberOfLines={4}
                    style={styles.textInput}
                    value={pastorRequest.en}
                    onChangeText={t => setPastorRequest({ ...pastorRequest, en: t })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Detailed Prayer Request</Text>
                <View style={styles.textArea}>
                  <TextInput
                    placeholder="తెలుగులో ప్రార్థన విజ్ఞాపన..."
                    multiline
                    numberOfLines={4}
                    style={[styles.textInput, { fontStyle: 'italic' }]}
                    value={pastorRequest.te}
                    onChangeText={t => setPastorRequest({ ...pastorRequest, te: t })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Post as</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowPostAs(!showPostAs)}
                >
                  <Text style={styles.pickerTxt}>{pastorRequest.postAs}</Text>
                  <MoreVertical size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>

                {showPostAs && (
                  <View style={styles.categoryList}>
                    {postAsOptions.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.catOption, pastorRequest.postAs === opt && styles.catOptionActive]}
                        onPress={() => {
                          setPastorRequest({ ...pastorRequest, postAs: opt });
                          setShowPostAs(false);
                        }}
                      >
                        <Text style={[styles.catOptionTxt, pastorRequest.postAs === opt && { color: '#fff' }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.publishBtn, submitting && { opacity: 0.7 }, { marginTop: 10, marginBottom: 40 }]}
                onPress={handlePublish}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Megaphone size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.publishBtnTxt}>Submit Prayer Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={alertConfig.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.alertOverlayBg}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconWrapper, alertConfig.type === 'error' ? { backgroundColor: '#fee2e2' } : alertConfig.type === 'confirm' ? { backgroundColor: '#e0e7ff' } : { backgroundColor: '#dcfce7' }]}>
               {alertConfig.type === 'success' && <CheckCircle size={32} color="#16a34a" />}
               {alertConfig.type === 'error' && <AlertTriangle size={32} color="#dc2626" />}
               {alertConfig.type === 'confirm' && <Info size={32} color="#4f46e5" />}
            </View>
            <Text style={styles.alertTitleTxt}>{alertConfig.title}</Text>
            <Text style={styles.alertMsgTxt}>{alertConfig.message}</Text>
            
            <View style={styles.alertActionsRow}>
              {alertConfig.type === 'confirm' && (
                <TouchableOpacity style={[styles.alertBtn, styles.alertBtnCancelUi]} onPress={alertConfig.onCancel || closeAlert}>
                  <Text style={styles.alertBtnCancelTxtUi}>{alertConfig.cancelText || 'Cancel'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.alertBtn, alertConfig.type === 'error' ? { backgroundColor: '#dc2626' } : { backgroundColor: '#1a2d5a' }]} 
                onPress={() => {
                  if (alertConfig.onConfirm) {
                    closeAlert();
                    alertConfig.onConfirm();
                  } else {
                    closeAlert();
                  }
                }}
              >
                <Text style={styles.alertBtnConfirmTxtUi}>{alertConfig.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.successCard,
              {
                transform: [
                  { scale: successAnim },
                  { translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }
                ],
                opacity: successAnim
              }
            ]}
          >
            <View style={styles.successIconBox}>
              <CheckCircle2 size={40} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Request Published!</Text>
            <Text style={styles.successSub}>
              The prayer request has been successfully created and linked to Salesforce.
            </Text>
            
            <TouchableOpacity style={styles.successBtn} onPress={closeSuccess}>
              <Text style={styles.successBtnTxt}>Great, Thank you!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => {
  const customBorder = isDark ? colors.border : '#cbd5e1';
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 14, paddingTop: 10, paddingBottom: 40 },

  headerOuter: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 0,
    paddingBottom: 4,
  },
  headerInner: {
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FCD34D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  headerCreateBtnTxt: { fontSize: 12, fontWeight: '700', color: '#1a2d5a' },

  statsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18, marginTop: 15 },
  statsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#000' },
  statsPillText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  statsDivider: { fontSize: 15, color: '#94a3b8', marginHorizontal: 15 },

  listHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  listHdTitle: { fontSize: 13, fontWeight: '700', color: Theme.Colors.error },

  pCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: customBorder },
  pCardAnswered: isDark ? {} : { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  pCardHd: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pAvatarTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pUserName: { fontSize: 13, fontWeight: '700', color: colors.text },
  pTime: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  ansBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ansBadgeTxt: { fontSize: 8, fontWeight: '700', color: Theme.Colors.success },

  pTextContainer: { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderRadius: 12, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: customBorder },
  pText: { fontSize: 13, color: isDark ? '#cbd5e1' : '#4b5563', lineHeight: 22 },

  pFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1' },
  catTxt: { fontSize: 10, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b' },

  pActions: { flexDirection: 'row', gap: 8 },
  pActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? '#334155' : '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  pActionBtnTxt: { fontSize: 10, fontWeight: '700', color: Theme.Colors.primary },

  pastorSection: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: customBorder },
  pastorSecTitle: { fontSize: 14, fontWeight: '700', color: Theme.Colors.primary, marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 8 },
  textArea: { backgroundColor: colors.card, borderWidth: 1, borderColor: customBorder, borderRadius: 10, minHeight: 80, paddingHorizontal: 12, marginBottom: 10 },
  textInput: { fontSize: 12, color: colors.text, paddingVertical: 12, textAlignVertical: 'top' },
  pickerBtn: { height: 48, backgroundColor: colors.card, borderWidth: 1, borderColor: customBorder, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  pickerTxt: { fontSize: 13, color: colors.text, fontWeight: '500' },
  categoryList: { backgroundColor: colors.card, borderWidth: 1, borderColor: customBorder, borderRadius: 10, padding: 4, marginTop: 4, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  catOption: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 0.5, borderBottomColor: customBorder },
  catOptionActive: { backgroundColor: '#2563EB' },
  catOptionTxt: { fontSize: 13, color: colors.text },
  publishBtn: { height: 56, backgroundColor: '#0f1e3a', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 14, marginTop: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  publishBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Search Styles
  searchBox: {
    height: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: customBorder,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },
  searchResults: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: customBorder,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  searchItem: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: customBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  searchItemName: { fontSize: 13, fontWeight: '700', color: colors.text },
  searchItemPhone: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8
  },
  selectedBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  createModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  createModalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  createModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 1, borderBottomColor: customBorder },
  createModalTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : Theme.Colors.primary },
  closeBtn: { padding: 4 },

  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  successCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: isDark ? '#93c5fd' : '#1a2d5a',
    marginBottom: 10,
    textAlign: 'center'
  },
  successSub: {
    fontSize: 14,
    color: isDark ? '#94a3b8' : '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30
  },
  successBtn: {
    backgroundColor: '#1a2d5a',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center'
  },
  successBtnTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  
  // Replies Styles
  repliesContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: customBorder },
  repliesHeader: { fontSize: 12, fontWeight: '800', color: isDark ? '#93c5fd' : '#1a2d5a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  replyCard: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  replyAuthor: { fontSize: 12, fontWeight: '700', color: isDark ? '#93c5fd' : '#1a2d5a' },
  replyDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  replyBody: { fontSize: 13, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 20 },

  // Custom Alert Modal
  alertOverlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  alertCard: { width: '85%', backgroundColor: colors.card, borderRadius: 28, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
  alertIconWrapper: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitleTxt: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  alertMsgTxt: { fontSize: 14, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  alertActionsRow: { flexDirection: 'row', width: '100%', gap: 12 },
  alertBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertBtnCancelUi: { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
  alertBtnCancelTxtUi: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 15, fontWeight: '700' },
  alertBtnConfirmTxtUi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
}
