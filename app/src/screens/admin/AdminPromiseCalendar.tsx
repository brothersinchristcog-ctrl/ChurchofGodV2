import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu } from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';

import SalesforceService from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

export default function AdminPromiseCalendar() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { setActiveTab, setEditingData, openDrawer } = useContext(AdminTabContext);
  const [loading, setLoading] = useState(true);
  const [promises, setPromises] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const data = await SalesforceService.getCalendarData(now.getFullYear(), now.getMonth() + 1);
      setPromises(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);
    setShowSuccess(false);
    setShowError(false);

    try {
      let DocumentPicker;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch (e) {
        throw new Error('File upload requires a Development Build with expo-document-picker linked.');
      }

      if (!DocumentPicker || !DocumentPicker.getDocumentAsync) {
        throw new Error('Native Document Picker is unavailable in this environment.');
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        setImporting(false);
        return;
      }

      const response = await fetch(result.assets[0].uri);
      const finalCsvText = await response.text();

      // Basic CSV Parser
      const rows = finalCsvText.split(/\r?\n/);
      if (rows.length < 2) throw new Error('Data is empty or invalid format.');

      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const dataRows = rows.slice(1).filter(r => r.trim().length > 0);

      let count = 0;
      for (const rowStr of dataRows) {
        const cols = rowStr.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const rowData: any = {};
        headers.forEach((h, i) => { rowData[h] = cols[i]; });

        const promiseData = {
          date: rowData.date,
          verseReferenceEn: rowData.en_ref || rowData['english reference'],
          verse: rowData.en_verse || rowData['english verse'],
          verseReferenceTe: rowData.te_ref || rowData['telugu reference'],
          verseTelugu: rowData.te_verse || rowData['telugu verse'],
          youtubeId: rowData.youtube_url || rowData['youtube url'],
          status: 'Published'
        };

        // Check if date already exists in current calendar
        const existingRecord = promises.find(p => p.date === promiseData.date);
        
        if (promiseData.date && promiseData.verse) {
          const finalData = {
            ...promiseData,
            id: existingRecord?.id
          };
          
          await SalesforceService.createDailyPromise(finalData);
          count++;
          setImportProgress(count);
        }
      }

      setShowSuccess(true);
      fetchCalendarData();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Import failed. Check format.');
      setShowError(true);
    } finally {
      setImporting(false);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate days in current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDate = now.getDate();

  const getMonthName = (m: number) => {
    return new Date(2000, m).toLocaleString('en-US', { month: 'long' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
          <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' }}>
              <TouchableOpacity onPress={openDrawer} style={{ position: 'absolute', left: 0, padding: 4, zIndex: 10 }}>
                <Menu size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Promise Calendar</Text>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* ── Subtitle ── */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <LinearGradient 
            colors={['#8b5cf6', '#3b82f6']} 
            style={{ padding: 1.5, borderRadius: 20 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={[styles.secSub, { marginTop: 0, fontSize: 12, fontWeight: '600' }]}>{getMonthName(month)} {year} — tap any date</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Calendar Grid ── */}
        <View style={styles.calGrid}>
          {weekDays.map(d => (
            <View key={d} style={styles.calHeader}><Text style={styles.calHeaderTxt}>{d}</Text></View>
          ))}
          
          {/* Empty days for start of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.calDay} />
          ))}

          {days.map(day => {
            const isToday = day === todayDate;
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const promise = promises.find(p => p.date === dStr);
            
            const isMissing = !promise;
            const isDraft = promise?.status === 'Draft';
            const isPublished = promise?.status === 'Published';
            const isScheduled = promise?.status === 'Scheduled';

            return (
              <TouchableOpacity 
                key={day} 
                style={[
                  styles.calDay,
                  isMissing && styles.cMiss,
                  isDraft && styles.cDft,
                  (isPublished || isScheduled) && styles.cPub,
                  isToday && { borderWidth: 0, overflow: 'hidden', backgroundColor: 'transparent' }
                ]}
                onPress={() => { 
                  setEditingData(promise || { date: dStr }); 
                  setActiveTab(1); 
                }}
              >
                {isToday && (
                  <LinearGradient
                    colors={['#ec4899', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 1.5 }}
                  >
                    <View style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 6.5 }} />
                  </LinearGradient>
                )}
                
                <View style={{ zIndex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[styles.calNum, isToday && styles.cTodayNum, isMissing && styles.cMissNum, isDraft && styles.cDftNum]}>{day}</Text>
                  <Text style={[styles.calStatus, isToday && styles.cTodayStatus, isMissing && styles.cMissStatus, isDraft && styles.cDftStatus]}>
                    {isToday ? 'Today' : isMissing ? 'MISSING' : isDraft ? 'DRAFT' : 'OK'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Legend ── */}
        <View style={styles.legendRow}>
          <LegendItem color={isDark ? '#064e3b' : '#dcfce7'} border={isDark ? '#065f46' : '#86efac'} label="Published" styles={styles} />
          <LegendItem color={isDark ? '#78350f' : '#fef3c7'} border={isDark ? '#92400e' : '#fcd34d'} label="Draft" styles={styles} />
          <LegendItem color={isDark ? '#1e293b' : '#f1f5f9'} border={isDark ? '#475569' : '#cbd5e1'} label="Missing" styles={styles} />
          <LegendItem color={isDark ? '#1e293b' : '#fff'} border="#ec4899" label="Today" styles={styles} />
        </View>

        {/* ── Import ── */}
        <View style={styles.importWrap}>
          <View style={styles.importHd}>
            <Text style={styles.importHdTXT}>📁 Import from CSV / Excel</Text>
            {importing && <ActivityIndicator size="small" color="#fff" />}
          </View>
          
          <View style={styles.importBody}>
            {importing ? (
              <View style={styles.progressBox}>
                <Text style={styles.progressTxt}>Importing: {importProgress} records processed...</Text>
                <ActivityIndicator color="#1a2d5a" style={{ marginTop: 10 }} />
              </View>
            ) : (
              <>
                <Text style={styles.importHint}>Upload a spreadsheet with columns: Date, English Reference, English Verse, Telugu Reference, Telugu Verse, YouTube URL</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={handleImport}>
                  <Text style={styles.uploadIcon}>📊</Text>
                  <Text style={styles.uploadTxt}>Tap to upload CSV or Excel file</Text>
                  <Text style={styles.uploadSubHint}>Columns: date · en_ref · en_verse · te_ref · te_verse · youtube_url</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Status Modals */}
        {showSuccess && (
          <View style={styles.statusMsg}>
            <Text style={styles.statusMsgTxt}>✅ Import Successful!</Text>
          </View>
        )}
        {showError && (
          <View style={[styles.statusMsg, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statusMsgTxt, { color: '#991B1B' }]}>❌ {errorMsg}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function LegendItem({ color, border, label, styles }: any) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: color, borderColor: border }]} />
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

function getStyles(colors: any, isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 14, paddingBottom: 80 },

  secHd: { marginBottom: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#c0392b' },
  secTitle: { fontSize: 15, fontWeight: '600', color: '#1a2d5a' },
  secSub: { fontSize: 10, color: isDark ? '#94a3b8' : '#6B7280', marginTop: 2 },

  headerOuter: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 15,
    marginHorizontal: -14,
    marginTop: -14,
    paddingBottom: 3, 
  },
  headerInner: {
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

  alertAmber: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', gap: 8, borderWidth: 0.5, borderColor: '#FDE68A' },
  alertIcon: { fontSize: 16 },
  alertTxt: { fontSize: 11, color: '#78350F', lineHeight: 16 },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  calHeader: { width: (width - 28 - 24) / 7, textAlign: 'center', paddingVertical: 4 },
  calHeaderTxt: { fontSize: 10, color: isDark ? '#ffffff' : '#000000', fontWeight: '700', textAlign: 'center' },
  calDay: { width: (width - 28 - 24) / 7, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? colors.card : '#ffffff', borderWidth: isDark ? 0.5 : 1, borderColor: isDark ? colors.border : '#e5e7eb' },
  calNum: { fontSize: 12, fontWeight: '600', color: colors.text },
  calStatus: { fontSize: 7, fontWeight: '500', marginTop: 2 },

  cPub: { backgroundColor: isDark ? '#064e3b' : '#dcfce7', borderColor: isDark ? '#065f46' : '#86efac' },
  cDft: { backgroundColor: isDark ? '#78350f' : '#fef3c7', borderColor: isDark ? '#92400e' : '#fcd34d' },
  cDftNum: { color: isDark ? '#fde68a' : '#92400E' },
  cDftStatus: { color: isDark ? '#fcd34d' : '#D97706' },
  cMiss: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#475569' : '#cbd5e1' },
  cMissNum: { color: isDark ? '#94a3b8' : '#64748b' },
  cMissStatus: { color: isDark ? '#64748b' : '#94a3b8' },
  cTodayNum: { color: isDark ? '#f472b6' : '#db2777', fontSize: 13, fontWeight: '800' },
  cTodayStatus: { color: isDark ? '#ec4899' : '#be185d', fontWeight: '700' },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 0.5 },
  legendTxt: { fontSize: 10, color: isDark ? '#94a3b8' : '#6B7280' },

  importWrap: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
  importHd: { backgroundColor: '#1a2d5a', padding: 10, paddingHorizontal: 14 },
  importHdTXT: { color: '#fff', fontSize: 11, fontWeight: '500' },
  importBody: { padding: 12, paddingHorizontal: 14 },
  importHint: { fontSize: 11, color: isDark ? '#94a3b8' : '#6B7280', marginBottom: 10, lineHeight: 16 },
  uploadBox: { borderWidth: 2, borderStyle: 'dashed', borderColor: isDark ? '#334155' : '#d1d5db', borderRadius: 12, padding: 20, alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#f9fafb' },
  uploadIcon: { fontSize: 26, marginBottom: 6 },
  uploadTxt: { fontSize: 11, color: isDark ? '#94a3b8' : '#6B7280', fontWeight: '500' },
  uploadSubHint: { fontSize: 10, color: isDark ? '#64748b' : '#9CA3AF', marginTop: 3, textAlign: 'center' },
  
  progressBox: { alignItems: 'center', padding: 20 },
  progressTxt: { fontSize: 12, fontWeight: '700', color: isDark ? '#60a5fa' : '#1a2d5a' },
  
  statusMsg: { backgroundColor: '#DCFCE7', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  statusMsgTxt: { fontSize: 12, fontWeight: '700', color: '#166534' },

  importTabs: { flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#f3f4f6', padding: 4, gap: 4 },
  importTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  importTabActive: { backgroundColor: colors.card, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  importTabTxt: { fontSize: 11, fontWeight: '600', color: isDark ? '#94a3b8' : '#6B7280' },
  importTabTxtActive: { color: isDark ? '#60a5fa' : '#1a2d5a' },

  manualEntry: { gap: 10 },
  manualInput: { backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 12, color: colors.text, height: 120, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  processBtn: { backgroundColor: '#1a2d5a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 5 },
  processBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' }
});
}
