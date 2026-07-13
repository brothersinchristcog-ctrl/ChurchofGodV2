import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Platform, 
  StatusBar,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { 
  Search, 
  Play, 
  Plus, 
  ChevronRight, 
  RefreshCw,
  Video,
  Clock,
  Edit2,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';

import SalesforceService, { Sermon } from '../../services/SalesforceService';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

export default function AdminSermonList() {
  const { setActiveTab, setEditingData } = useContext(AdminTabContext);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

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

  useEffect(() => {
    fetchSermons();
  }, []);

  const fetchSermons = async () => {
    setLoading(true);
    try {
      const data = await SalesforceService.getSermons(50);
      setSermons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sermon: Sermon) => {
    setEditingData(sermon);
    setActiveTab(4); // Switch to New Sermon editor tab
  };

  const handlePlay = (sermon: Sermon) => {
    const id = sermon.youtubeId;
    if (!id) {
      if (sermon.audioUrl) Linking.openURL(sermon.audioUrl);
      return;
    }
    
    let url = id;
    if (!id.includes('http') && id.length === 11) {
      url = `https://www.youtube.com/watch?v=${id}`;
    }
    Linking.openURL(url).catch(err => console.error(err));
  };

  const handleDelete = (sermon: Sermon) => {
    showAlert({
      title: 'Delete Sermon',
      message: `Are you sure you want to delete "${sermon.title}"?\n\nThis action cannot be undone.`,
      type: 'confirm',
      confirmText: 'DELETE',
      cancelText: 'CANCEL',
      onConfirm: async () => {
        if (!sermon.id) return;
        try {
          setLoading(true);
          await SalesforceService.deleteSermon(sermon.id);
          fetchSermons();
          showAlert({ title: 'Deleted', message: 'Sermon removed successfully.', type: 'success' });
        } catch (err: any) {
          showAlert({ title: 'Delete Failed', message: err.message || "Could not delete sermon.", type: 'error' });
          setLoading(false);
        }
      },
      onCancel: () => closeAlert()
    });
  };

  const stats = {
    published: sermons.filter(s => s.status === 'Published').length,
    drafts: sermons.filter(s => s.status === 'Draft').length,
    series: [...new Set(sermons.map(s => s.series).filter((s): s is string => Boolean(s)))].length
  };

  const seriesList = ['All', ...new Set(sermons.map(s => s.series).filter((s): s is string => Boolean(s)))];
  const filteredSermons = filter === 'All' ? sermons : sermons.filter(s => s.series === filter);

  if (loading && sermons.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Section Heading ── */}
        <View style={styles.secHd}>
          <View>
            <Text style={styles.secTitle}>Sermons</Text>
            <Text style={styles.secSub}>{sermons.length} sermons · {stats.series} series</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => { setEditingData(null); setActiveTab(4); }}>
            <Text style={styles.newBtnTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Bar ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#15803D' }]}>{stats.published}</Text>
            <Text style={styles.statLbl}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.drafts}</Text>
            <Text style={styles.statLbl}>Drafts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#1a2d5a' }]}>{stats.series}</Text>
            <Text style={styles.statLbl}>Series</Text>
          </View>
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {seriesList.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipTxt, filter === f && styles.filterChipTxtActive]}>
                {f} ({f === 'All' ? sermons.length : sermons.filter(s => s.series === f).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.listLabel}>Latest sermon</Text>

        {filteredSermons.map((sermon, idx) => (
          <View key={sermon.id} style={[styles.sermonItem, idx === 0 && filter === 'All' && styles.featuredItem]}>
            <TouchableOpacity 
              style={[styles.siThumb, idx === 0 && filter === 'All' && styles.featuredThumb]}
              onPress={() => handlePlay(sermon)}
            >
              <Play size={idx === 0 ? 24 : 18} color="#fff" fill="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.siBody} onPress={() => handleEdit(sermon)}>
              <Text style={[styles.siTitle, idx === 0 && filter === 'All' && {fontSize: 14}]} numberOfLines={1}>{sermon.title}</Text>
              {sermon.titleTelugu ? (
                <Text style={styles.siTe} numberOfLines={1}>{sermon.titleTelugu}</Text>
              ) : null}
              <Text style={styles.siMeta}>{sermon.pastor} · {sermon.date} {sermon.duration ? `· ${sermon.duration}` : ''}</Text>
              
              <View style={styles.siFoot}>
                {sermon.series ? (
                  <View style={styles.badgeSeries}><Text style={styles.badgeSeriesTxt}>{sermon.series}</Text></View>
                ) : null}
                {sermon.youtubeId ? <View style={styles.badgeIcon}><Text style={styles.badgeIconTxt}>📺 YouTube</Text></View> : null}
                {sermon.audioUrl ? <View style={styles.badgeIcon}><Text style={styles.badgeIconTxt}>🎙️ Audio</Text></View> : null}
                <View style={[styles.badgeStatus, sermon.status === 'Draft' ? styles.statusDraftBg : styles.statusPubBg]}>
                  <Text style={[styles.badgeStatusTxt, sermon.status === 'Draft' ? styles.statusDraftTxt : styles.statusPubTxt]}>
                    {sermon.status || 'Published'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.editAction} onPress={() => handleEdit(sermon)}>
                <Edit2 size={16} color="#1a2d5a" />
                <Text style={styles.editActionTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(sermon)}>
                <Trash2 size={16} color="#ef4444" />
                <Text style={styles.deleteActionTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f7' },
  scroll: { padding: 14, paddingBottom: 80 },

  secHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#c0392b' },
  secTitle: { fontSize: 15, fontWeight: '600', color: '#1a2d5a' },
  secSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  newBtn: { backgroundColor: '#c0392b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  statNum: { fontSize: 22, fontWeight: '600' },
  statLbl: { fontSize: 9, color: '#6B7280', marginTop: 2 },

  filterRow: { flexDirection: 'row', marginBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 18, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e5e7eb', marginRight: 8 },
  filterChipActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  filterChipTxt: { fontSize: 10, fontWeight: '500', color: '#374151' },
  filterChipTxtActive: { color: '#fff' },

  listLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },

  sermonItem: { backgroundColor: '#fff', borderRadius: 11, borderWidth: 0.5, borderColor: '#e5e7eb', padding: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featuredItem: { borderWidth: 1.5, borderColor: '#1a2d5a', backgroundColor: '#fcfdff', padding: 18 },
  featuredThumb: { width: 70, height: 50 },
  siThumb: { width: 50, height: 38, backgroundColor: '#0f172a', borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  siBody: { flex: 1 },
  siTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  siTe: { fontSize: 12, color: '#1a2d5a', fontStyle: 'italic', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  siMeta: { fontSize: 9, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  siFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  siViews: { marginLeft: 'auto', fontSize: 10, color: '#6B7280', fontWeight: '600' },

  badgeSeries: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5, borderColor: '#dbeafe' },
  badgeSeriesTxt: { color: '#1a2d5a', fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  
  badgeIcon: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeIconTxt: { color: '#4b5563', fontSize: 8, fontWeight: '700' },

  badgeStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPubBg: { backgroundColor: '#F0FDF4' },
  statusPubTxt: { color: '#16a34a' },
  statusDraftBg: { backgroundColor: '#FFFBEB' },
  statusDraftTxt: { color: '#D97706' },
  badgeStatusTxt: { fontSize: 8, fontWeight: '800' },
  
  actionsContainer: { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
  editAction: { paddingLeft: 12, paddingRight: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1 },
  editActionTxt: { fontSize: 9, fontWeight: '700', color: '#1a2d5a', textTransform: 'uppercase' },
  deleteAction: { paddingLeft: 12, paddingRight: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  deleteActionTxt: { fontSize: 9, fontWeight: '700', color: '#ef4444', textTransform: 'uppercase' },

  // Custom Alert Modal
  alertOverlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  alertCard: { width: '85%', backgroundColor: '#fff', borderRadius: 28, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
  alertIconWrapper: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitleTxt: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  alertMsgTxt: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  alertActionsRow: { flexDirection: 'row', width: '100%', gap: 12 },
  alertBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertBtnCancelUi: { backgroundColor: '#f1f5f9' },
  alertBtnCancelTxtUi: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  alertBtnConfirmTxtUi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
