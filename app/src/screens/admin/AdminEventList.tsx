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
  Alert
} from 'react-native';
import { MapPin, Clock, Calendar, Trash2, Info, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';

import SalesforceService from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

export default function AdminEventList() {
  const { setActiveTab, setEditingData } = useContext(AdminTabContext);
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
          
          <Clock size={10} color="#6B7280" style={{ marginLeft: 8 }} />
          <Text style={styles.eiMetaTxt}>
            {formatDisplayTime(event.startTime)}
            {event.endTime ? ` — ${formatDisplayTime(event.endTime)}` : ''}
          </Text>
        </View>
        <View style={styles.eiMetaRow}>
          <MapPin size={10} color="#6B7280" />
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
          <Text style={{ color: '#1a2d5a', fontSize: 10, fontWeight: '800' }}>Edit →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Section Heading ── */}
        <View style={styles.secHd}>
          <View>
            <Text style={styles.secTitle}>📅 Event Manager</Text>
            <Text style={styles.secSub}>Church Gatherings · కూటములు</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => { setEditingData(null); setActiveTab(9); }}>
            <Text style={styles.newBtnTxt}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, activeFilter === 'all' && styles.statCardActive]} 
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNum, { color: '#15803D' }]}>
              {events.filter(e => 
                !e.status || 
                e.status.toLowerCase().includes('pub') || 
                e.status.toLowerCase().includes('act')
              ).length}
            </Text>
            <Text style={styles.statLbl}>Published (All)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, activeFilter === 'upcoming' && styles.statCardActive]} 
            onPress={() => setActiveFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNum, { color: '#c0392b' }]}>{upcomingCount}</Text>
            <Text style={styles.statLbl}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, activeFilter === 'past' && styles.statCardActive]} 
            onPress={() => setActiveFilter(activeFilter === 'past' ? 'all' : 'past')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNum, { color: '#1a2d5a' }]}>{pastCount}</Text>
            <Text style={styles.statLbl}>Past Events</Text>
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
                  <TouchableOpacity 
                    style={styles.showMoreBtn} 
                    onPress={() => setShowAllPastEvents(!showAllPastEvents)}
                  >
                    <Text style={styles.showMoreTxt}>
                      {showAllPastEvents ? 'Show less ↑' : `Show more (${pastEvents.length - 5}) ↓`}
                    </Text>
                  </TouchableOpacity>
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
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  statCardActive: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  statNum: { fontSize: 22, fontWeight: '600' },
  statLbl: { fontSize: 9, color: '#6B7280', marginTop: 2 },

  listLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },

  eventItem: { backgroundColor: '#fff', borderRadius: 11, borderWidth: 0.5, borderColor: '#e5e7eb', padding: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featuredItem: { borderWidth: 1.5, borderColor: '#1a2d5a', backgroundColor: '#EFF6FF' },
  eiThumb: { width: 100, height: 56, backgroundColor: '#0f172a', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eiThumbImg: { width: '100%', height: '100%' },
  eiThumbTxt: { color: '#475569', fontSize: 8, fontWeight: '800' },
  eiBody: { flex: 1 },
  eiTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  eiTe: { fontSize: 11, color: '#1a2d5a', fontStyle: 'italic', marginTop: 1 },
  eiMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  eiMetaTxt: { fontSize: 10, color: '#6B7280', marginLeft: 4 },
  eiFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 4 },
  eiEdit: { position: 'absolute', top: 12, right: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },

  badgeDraft: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeDraftTxt: { color: '#475569', fontSize: 9, fontWeight: '800' },
  
  showMoreBtn: { padding: 12, alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 8, marginTop: 4 },
  showMoreTxt: { color: '#334155', fontSize: 12, fontWeight: '700' },
  emptyTxt: { fontSize: 12, color: '#64748b', fontStyle: 'italic', paddingVertical: 10 },

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
  alertBtnConfirmTxtUi: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
