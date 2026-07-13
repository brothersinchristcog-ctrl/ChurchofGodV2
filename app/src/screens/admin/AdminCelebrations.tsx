import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Modal,
  TextInput
} from 'react-native';
import { Gift, Heart, Send, Calendar, CheckCircle2, Search } from 'lucide-react-native';
import SalesforceService from '../../services/SalesforceService';
import Theme from '../../theme/Theme';

export default function AdminCelebrations() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [filter, setFilter] = useState<'Today' | 'This Week' | 'This Month'>('Today');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const getOrdinalNum = (n: number) => {
    return n + (['st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10 - 1] || 'th');
  };

  const calculateYears = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    if (year <= 1900) return null; // Salesforce default empty dates or old dates
    const currentYear = new Date().getFullYear();
    return currentYear - year;
  };

  const fetchCelebrations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await SalesforceService.getAllCelebrations();
      
      const parsed: any[] = [];

      data.forEach(rec => {
        // Handle Birthdays
        if (rec.Birthdate) {
          parsed.push({
            id: `bday-${rec.Id}`,
            contactId: rec.Id,
            type: 'birthday',
            name: rec.Name,
            phone: rec.Phone || rec.MobilePhone,
            date: rec.Birthdate,
            years: calculateYears(rec.Birthdate)
          });
        }
      });

      // Handle Anniversaries (group by AccountId)
      const accountGroups: { [accountId: string]: any[] } = {};
      data.forEach(rec => {
        if (rec.Anniversary_Date__c) {
          const accId = rec.AccountId || rec.Id;
          if (!accountGroups[accId]) accountGroups[accId] = [];
          accountGroups[accId].push(rec);
        }
      });

      Object.values(accountGroups).forEach(group => {
        if (group.length > 0) {
          const husband = group.find(m => m.Gender__c === 'Male') || group[0];
          const wife = group.find(m => m.Gender__c === 'Female') || group[1] || group[0];
          
          parsed.push({
            id: `anniv-${husband.Id}`,
            contactId: husband.Id,
            type: 'anniversary',
            name: `${husband.Name} & ${wife.Name}`,
            phone: husband.Phone || husband.MobilePhone || wife.Phone || wife.MobilePhone,
            date: husband.Anniversary_Date__c,
            years: calculateYears(husband.Anniversary_Date__c)
          });
        }
      });

      setCelebrations(parsed);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch celebrations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const getFilteredData = () => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return celebrations.filter(item => {
      const dateParts = item.date.split('-');
      if (dateParts.length < 3) return false;
      const m = parseInt(dateParts[1], 10);
      const d = parseInt(dateParts[2], 10);

      if (filter === 'Today') {
        return m === todayMonth && d === todayDate;
      } 
      if (filter === 'This Month') {
        return m === todayMonth;
      }
      if (filter === 'This Week') {
        const thisYearDate = new Date(today.getFullYear(), m - 1, d);
        return thisYearDate >= startOfWeek && thisYearDate <= endOfWeek;
      }
      return false;
    }).sort((a, b) => {
      const d1 = parseInt(a.date.split('-')[2], 10);
      const d2 = parseInt(b.date.split('-')[2], 10);
      return d1 - d2;
    });
  };

  const handleSendGreeting = (item: any) => {
    if (!item.phone) {
      Alert.alert('Missing Phone', 'This member does not have a Phone or MobilePhone on file in Salesforce. Cannot send personalized push notification.');
      return;
    }

    setSelectedItem(item);
    setMessageTitle(item.type === 'birthday' ? `🎂 Happy Birthday, ${item.name.split(' ')[0]}!` : `💐 Happy Anniversary!`);
    setMessageText(item.type === 'birthday' 
      ? 'Wishing you a very Happy Birthday! May God bless you abundantly today. 🎂🙏' 
      : 'Wishing you a wonderful wedding anniversary! May God bless your home with love and joy. 💒💐'
    );
    setModalVisible(true);
  };

  const confirmSend = async () => {
    if (!selectedItem) return;
    if (!messageTitle.trim() || !messageText.trim()) {
      Alert.alert('Validation', 'Title and message cannot be empty.');
      return;
    }
    
    setIsSending(true);
    try {
      const success = await SalesforceService.sendPersonalGreeting(
        selectedItem.contactId, 
        selectedItem.phone, 
        messageTitle, 
        messageText, 
        selectedItem.type
      );
      if (success) {
        Alert.alert('Success', `Greeting sent to ${selectedItem.name}!`);
        setModalVisible(false);
      } else {
        Alert.alert('Error', 'Failed to send greeting.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send greeting.');
    } finally {
      setIsSending(false);
    }
  };

  const filteredData = getFilteredData();

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.Colors.primary} />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Celebrations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎉 Celebrations</Text>
        <Text style={styles.headerSub}>Birthdays & Anniversaries directory</Text>
      </View>

      {/* Segmented Filter */}
      <View style={styles.filterWrapper}>
        <View style={styles.filterContainer}>
          {(['Today', 'This Week', 'This Month'] as const).map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCelebrations(true)} />}
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={40} color="#cbd5e1" />
            <Text style={styles.emptyTxt}>No celebrations found for {filter.toLowerCase()}.</Text>
          </View>
        ) : (
          filteredData.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { backgroundColor: item.type === 'birthday' ? '#fef3c7' : '#fce7f3' }]}>
                  {item.type === 'birthday' ? (
                    <Gift size={20} color="#d97706" />
                  ) : (
                    <Heart size={20} color="#be185d" />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(2000, parseInt(item.date.split('-')[1]) - 1, parseInt(item.date.split('-')[2])).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    {' '}• {item.type === 'birthday' ? 'Birthday' : 'Anniversary'} 
                    {item.years && item.years > 0 ? ` (${getOrdinalNum(item.years)})` : ''}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: item.type === 'birthday' ? '#d97706' : '#be185d' }]}
                onPress={() => handleSendGreeting(item)}
              >
                <Send size={14} color="#fff" />
                <Text style={styles.sendBtnTxt}>Send Greeting</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Custom Greeting Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Greeting to {selectedItem?.name}</Text>
            
            <Text style={styles.inputLabel}>Notification Title</Text>
            <TextInput
              style={styles.textInput}
              value={messageTitle}
              onChangeText={setMessageTitle}
              placeholder="E.g. Happy Birthday!"
            />

            <Text style={styles.inputLabel}>Notification Message</Text>
            <TextInput
              style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
              multiline
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your personal message here..."
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setModalVisible(false)}
                disabled={isSending}
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: selectedItem?.type === 'birthday' ? '#d97706' : '#be185d' }]} 
                onPress={confirmSend}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnTxt}>Send Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  
  filterWrapper: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15 },
  filterContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  filterTabActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  filterTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterTxtActive: { color: Theme.Colors.primary, fontWeight: '800' },

  scroll: { padding: 15 },
  
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTxt: { marginTop: 12, fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { marginLeft: 12, flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardDate: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 16, gap: 6 },
  sendBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', marginBottom: 16, backgroundColor: '#f8fafc' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  cancelBtnTxt: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  confirmBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
