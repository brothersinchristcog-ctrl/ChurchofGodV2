import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar,
  Image,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Calendar, Trash2, Info, CheckCircle, AlertTriangle, Menu } from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';

import SalesforceService from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

export default function AdminEventList() {
  const { setActiveTab, setEditingData, openDrawer } = useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllPastEvents, setShowAllPastEvents] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past'>('all');

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
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await SalesforceService.getEvents();
      console.log('📊 [AdminEventList] Fetched Events:', JSON.stringify(data.slice(0, 2), null, 2));
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastEvents = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  
  const upcomingCount = upcomingEvents.length;
  const pastCount = pastEvents.length;
  const displayedPastEvents = showAllPastEvents ? pastEvents : pastEvents.slice(0, 5);

  const formatDate = (sfDate: string) => {
    if (!sfDate) return '';
    try {
      const d = new Date(sfDate);
      if (isNaN(d.getTime())) return sfDate;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return sfDate;
    }
  };

  const formatDisplayTime = (sfTime: string) => {
    if (!sfTime || typeof sfTime !== 'string') return '';
    // If it's already formatted (e.g. "10:00 AM"), return as is
    if (sfTime.includes('AM') || sfTime.includes('PM')) return sfTime;
    
    try {
      // Salesforce Time field returns HH:mm:ss.SSSZ
      const timePart = sfTime.split('.')[0]; // Get HH:mm:ss
      const [hours, minutes] = timePart.split(':');
      let h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${minutes} ${ampm}`;
    } catch (e) {
      return sfTime;
    }
  };

  const handleEdit = (event: any) => {
    setEditingData(event);
    setActiveTab(9); // Switch to Event Editor tab (index 9)
  };

  const handleDelete = (id: string, name: string) => {
    showAlert({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${name}"?`,
      type: 'confirm',
      confirmText: 'DELETE',
      cancelText: 'CANCEL',
      onConfirm: () => {
        // Optimistic delete
        setEvents(prev => prev.filter(e => e.id !== id));
        showAlert({ title: 'Deleted', message: 'Event removed successfully.', type: 'success' });
        
        // Background API call
        SalesforceService.deleteEvent(id).then(() => {
          fetchEvents();
        }).catch(err => {
          fetchEvents(); // Revert
          showAlert({ title: 'Error', message: 'Failed to delete event', type: 'error' });
        });
      },
      onCancel: () => closeAlert()
    });
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  const renderEventCard = (event: any, idx: number, isUpcoming: boolean) => (
    <View key={event.id} style={[styles.eventItem, isUpcoming && idx === 0 && styles.featuredItem]}>
      <TouchableOpacity style={[styles.eiThumb, { backgroundColor: event.bannerColor || '#1a2d5a' }]} onPress={() => handleEdit(event)}>
        {event.bannerUrl ? (
          <Image source={{ uri: event.bannerUrl }} style={styles.eiThumbImg} resizeMode="cover" />
        ) : (
          <Text style={styles.eiThumbTxt}>IMG</Text>
        )}
      </TouchableOpacity>
      <View style={styles.eiBody}>
        <Text style={styles.eiTitle} numberOfLines={1}>{event.name || 'No Title'}</Text>
        <Text style={styles.eiTe} numberOfLines={1}>{event.titleTe || ''}</Text>
        <View style={styles.eiMetaRow}>
          <Calendar size={10} color="#c0392b" />
          <Text style={[styles.eiMetaTxt, { color: '#c0392b', fontWeight: '600' }]}>{formatDate(event.date)}</Text>
          
          <Clock size={10} color={colors.textSecondary} style={{ marginLeft: 8 }} />
          <Text style={styles.eiMetaTxt}>
            {formatDisplayTime(event.startTime)}
            {event.endTime ? ` — ${formatDisplayTime(event.endTime)}` : ''}
          </Text>
        </View>
        <View style={styles.eiMetaRow}>
          <MapPin size={10} color={colors.textSecondary} />
          <Text style={styles.eiMetaTxt} numberOfLines={1}>{event.venueEn || event.location || 'No Venue'}</Text>
        </View>
        <View style={styles.eiFoot}>
          {event.status?.toLowerCase().includes('dra') ? (
            <View style={[styles.badgeDraft, { flexShrink: 1 }]}>
              <Text style={styles.badgeDraftTxt} numberOfLines={1}>DRAFT</Text>
            </View>
          ) : (
            <View style={{ flexShrink: 1 }} />
          )}
          <TouchableOpacity onPress={() => handleDelete(event.id, event.name)} style={{ padding: 4 }}>
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => handleEdit(event)} style={styles.eiEdit}>
          <Text style={{ color: isDark ? '#93c5fd' : '#1a2d5a', fontSize: 10, fontWeight: '800' }}>Edit →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Curved Gradient Header ── */}
      <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
        <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            
            <TouchableOpacity onPress={openDrawer} style={{ padding: 4 }}>
              <Menu size={26} color="#fff" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Event Manager</Text>
            </View>

            <TouchableOpacity style={styles.newBtn} onPress={() => { setEditingData(null); setActiveTab(9); }}>
              <Text style={styles.newBtnTxt}>+ New</Text>
            </TouchableOpacity>

          </View>
        </LinearGradient>
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Stats Single Badge ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statBadge, activeFilter === 'all' && styles.statBadgeActive]} 
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={styles.statNum}>
              {events.filter(e => 
                !e.status || 
                e.status.toLowerCase().includes('pub') || 
                e.status.toLowerCase().includes('act')
              ).length}
            </Text>
            <Text style={styles.statLbl}>Published</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity 
            style={[styles.statBadge, activeFilter === 'upcoming' && styles.statBadgeActive]} 
            onPress={() => setActiveFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
            activeOpacity={0.8}
          >
            <Text style={styles.statNum}>{upcomingCount}</Text>
            <Text style={styles.statLbl}>Upcoming</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity 
            style={[styles.statBadge, activeFilter === 'past' && styles.statBadgeActive]} 
            onPress={() => setActiveFilter(activeFilter === 'past' ? 'all' : 'past')}
            activeOpacity={0.8}
          >
            <Text style={styles.statNum}>{pastCount}</Text>
            <Text style={styles.statLbl}>Past</Text>
          </TouchableOpacity>
        </View>

        {(activeFilter === 'all' || activeFilter === 'upcoming') && (
          <>
            <Text style={styles.listLabel}>Upcoming events</Text>
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, idx) => renderEventCard(event, idx, true))
            ) : (
              <Text style={styles.emptyTxt}>No upcoming events found.</Text>
            )}
          </>
        )}

        {(activeFilter === 'all' || activeFilter === 'past') && (
          <>
            <Text style={[styles.listLabel, { marginTop: activeFilter === 'all' ? 20 : 0 }]}>Past events</Text>
            
            {displayedPastEvents.length > 0 ? (
              <>
                {displayedPastEvents.map((event, idx) => renderEventCard(event, idx, false))}
                
                {pastEvents.length > 5 && (
                  <View style={{ alignItems: 'center', marginTop: 8 }}>
                    <TouchableOpacity 
                      style={styles.showMoreBtn} 
                      onPress={() => setShowAllPastEvents(!showAllPastEvents)}
                    >
                      <Text style={styles.showMoreTxt}>
                        {showAllPastEvents ? 'Show less ↑' : `Show more (${pastEvents.length - 5}) ↓`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyTxt}>No past events.</Text>
            )}
          </>
        )}

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

function getStyles(colors: any, isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: 14, paddingBottom: 80 },

  headerOuter: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    marginHorizontal: 0,
    marginTop: -20,
    paddingBottom: 4,
  },
  headerInner: {
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  newBtn: { backgroundColor: '#FCD34D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, borderWidth: 1, borderColor: '#FBBF24' },
  newBtnTxt: { color: '#1a2d5a', fontSize: 12, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    borderRadius: 100,
    padding: 3,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#d1d5db',
    alignSelf: 'center',
    width: '90%',
  },
  statBadge: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 100,
    backgroundColor: 'transparent',
  },
  statBadgeActive: {
    backgroundColor: isDark ? '#334155' : '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statDivider: { width: 1, height: 32, backgroundColor: isDark ? '#334155' : '#e2e8f0' },
  statNum: { fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' },
  statNumActive: { color: isDark ? '#fff' : '#1a2d5a' },
  statLbl: { fontSize: 8, marginTop: 1, color: isDark ? '#94a3b8' : '#6b7280' },
  statLblActive: { color: isDark ? '#93c5fd' : '#1a2d5a' },

  listLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 4 },

  eventItem: { backgroundColor: colors.card, borderRadius: 11, borderWidth: 0.5, borderColor: colors.border, padding: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featuredItem: { borderWidth: 1.5, borderColor: '#1a2d5a', backgroundColor: isDark ? '#1e3a5f' : '#EFF6FF' },
  eiThumb: { width: 100, height: 56, backgroundColor: '#0f172a', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eiThumbImg: { width: '100%', height: '100%' },
  eiThumbTxt: { color: '#475569', fontSize: 8, fontWeight: '800' },
  eiBody: { flex: 1 },
  eiTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  eiTe: { fontSize: 11, color: isDark ? '#93c5fd' : '#1a2d5a', fontStyle: 'italic', marginTop: 1 },
  eiMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  eiMetaTxt: { fontSize: 10, color: colors.textSecondary, marginLeft: 4 },
  eiFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 4 },
  eiEdit: { position: 'absolute', top: 12, right: 12, backgroundColor: isDark ? '#1e3a5f' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },

  badgeDraft: { backgroundColor: isDark ? '#334155' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeDraftTxt: { color: isDark ? '#94a3b8' : '#475569', fontSize: 9, fontWeight: '800' },
  
  showMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#d1d5db',
    backgroundColor: 'transparent',
  },
  showMoreTxt: { color: isDark ? '#94a3b8' : '#374151', fontSize: 12, fontWeight: '600' },
  emptyTxt: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 10 },

  // Custom Alert Modal
  alertOverlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  alertCard: { width: '85%', backgroundColor: colors.card, borderRadius: 28, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
  alertIconWrapper: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitleTxt: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  alertMsgTxt: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  alertActionsRow: { flexDirection: 'row', width: '100%', gap: 12 },
  alertBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertBtnCancelUi: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
  alertBtnCancelTxtUi: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  alertBtnConfirmTxtUi: { color: '#fff', fontSize: 15, fontWeight: '700' }
});}
