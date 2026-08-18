import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Dimensions, 
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Users, Phone, Mail, ChevronDown, ChevronUp, Clock, UserCheck, Menu, MapPin, Plus, X, Calendar, CheckCircle2, MoreVertical, UserPlus, Send, Search } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';
import SalesforceService from '../../services/SalesforceService';
import Share from 'react-native-share';

const { width } = Dimensions.get('window');

export default function AdminMembers() {
  const { isDark, colors } = useTheme();
  const { openDrawer } = React.useContext(AdminTabContext);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [selectedVillage, setSelectedVillage] = useState<string>('All');
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedHouseholdIds, setExpandedHouseholdIds] = useState<Set<string>>(new Set());
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Action Menu State (3-Dots)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ name: string; phone: string } | null>(null);
  const [inviteUserType, setInviteUserType] = useState('Member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccessDetails, setInviteSuccessDetails] = useState<{ name: string; phone: string; userType: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [addedMemberDetails, setAddedMemberDetails] = useState<{ name: string; phone: string; userType: string } | null>(null);
  const [userTypeOptions, setUserTypeOptions] = useState<{ label: string; value: string }[]>([
    { label: 'Member', value: 'Member' },
    { label: 'Admin', value: 'Admin' },
    { label: 'Pastor', value: 'Pastor' },
    { label: 'Youth', value: 'Youth' },
    { label: 'Non-Member', value: 'Non-Member' }
  ]);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dob: '',
    userType: 'Member',
    gender: 'Male',
    city: ''
  });

  const styles = getStyles(colors, isDark);

  useEffect(() => {
    SalesforceService.getContactUserTypePicklistValues().then(opts => {
      if (opts && opts.length > 0) {
        const uniqueOptsMap = new Map<string, { label: string; value: string }>();
        opts.forEach(o => {
          if (o.value) uniqueOptsMap.set(o.value, o);
        });
        setUserTypeOptions(Array.from(uniqueOptsMap.values()));
      }
    }).catch(e => console.warn('Failed to load picklist options', e));
  }, []);

  const fetchMembers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await SalesforceService.getAdminMembers();
      setMembers(data);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err?.message || 'Failed to fetch members from Salesforce');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchUserPhotos();
  }, []);

  const fetchUserPhotos = async () => {
    try {
      console.log('Fetching user photos from Firestore...');
      const snap = await firestore().collection('users').get();
      const photos: Record<string, string> = {};
      let photoCount = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.photoURL) {
          photoCount++;
          if (data.phone) {
            const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);
            photos[cleanPhone] = data.photoURL;
          }
          if (data.sfContactId) {
            photos[data.sfContactId] = data.photoURL;
          }
          photos[doc.id] = data.photoURL;
        }
      });
      console.log(`Fetched ${photoCount} user photos, setting state...`, Object.keys(photos).length, 'keys');
      setUserPhotos(photos);
    } catch (e) {
      console.warn('Failed to fetch user photos', e);
    }
  };

  const uniqueVillages = React.useMemo(() => {
    const villages = new Set<string>();
    villages.add('All');
    members.forEach(m => {
      if (m.MailingCity && m.MailingCity.trim() !== '') {
        const titleCase = m.MailingCity.trim().toLowerCase().replace(/\b\w/g, (s: string) => s.toUpperCase());
        villages.add(titleCase);
      }
    });
    return Array.from(villages).sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [members]);

  // Pre-index members by AccountId for instantaneous lookup
  const accountMembersMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    members.forEach(m => {
      if (m.AccountId) {
        if (!map.has(m.AccountId)) map.set(m.AccountId, []);
        map.get(m.AccountId)!.push(m);
      }
    });
    return map;
  }, [members]);

  // Stats calculation memoized
  const statsMembers = React.useMemo(() => {
    if (selectedVillage === 'All') return members;
    return members.filter(m => {
      const villageStr = m.MailingCity || '';
      return villageStr.trim().toLowerCase() === selectedVillage.toLowerCase();
    });
  }, [members, selectedVillage]);

  const { totalMembers, activeMembers, inactiveMembers } = React.useMemo(() => {
    let active = 0;
    let inactive = 0;
    statsMembers.forEach(m => {
      if (m.Account?.Active__c === true) active++;
      else inactive++;
    });
    return {
      totalMembers: statsMembers.length,
      activeMembers: active,
      inactiveMembers: inactive
    };
  }, [statsMembers]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleToggleHousehold = (id: string) => {
    const next = new Set(expandedHouseholdIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedHouseholdIds(next);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getPhotoUrl = (member: any) => {
    if (member.Id && userPhotos[member.Id]) return userPhotos[member.Id];
    if (member.Mobile_App_ID__c && userPhotos[member.Mobile_App_ID__c]) return userPhotos[member.Mobile_App_ID__c];
    const phone = member.MobilePhone || member.Phone;
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, '').slice(-10);
      if (userPhotos[clean]) return userPhotos[clean];
    }
    return null;
  };

  const formatLastAppOpened = (dateStr: string) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  const filteredMembers = React.useMemo(() => {
    return members.filter(m => {
      const nameStr = m.Name || '';
      const emailStr = m.Email || '';
      const phoneStr = m.Phone || m.MobilePhone || '';
      const villageStr = m.MailingCity || '';
      
      const matchesSearch = 
        nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emailStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneStr.includes(searchQuery) ||
        villageStr.toLowerCase().includes(searchQuery.toLowerCase());

      const isActive = m.Account?.Active__c === true;
      const matchesStatus = 
        statusFilter === 'All' || 
        (statusFilter === 'Active' && isActive) ||
        (statusFilter === 'Inactive' && !isActive);

      const matchesVillage = selectedVillage === 'All' || villageStr.trim().toLowerCase() === selectedVillage.toLowerCase();

      return matchesSearch && matchesStatus && matchesVillage;
    });
  }, [members, searchQuery, statusFilter, selectedVillage]);

  const handleSaveMember = async () => {
    setAddFormError(null);
    if (!newMember.firstName.trim() || !newMember.lastName.trim() || !newMember.phone.trim()) {
      setAddFormError('Please fill in First Name, Last Name, and Mobile Phone.');
      return;
    }

    setAddFormLoading(true);
    try {
      // 1. Check duplicate
      const checkResult = await SalesforceService.checkContactExists(newMember.phone.trim());
      if (checkResult?.exists && checkResult.member) {
        const m = checkResult.member;
        const firstName = m.firstName || '';
        const lastName = m.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || m.name || 'another contact';
        setAddFormError(`This mobile number (${newMember.phone.trim()}) is already used by ${fullName}.`);
        setAddFormLoading(false);
        return;
      }

      // 2. Create Member (Account + Contact linked)
      const res = await SalesforceService.createMember({
        firstName: newMember.firstName.trim(),
        lastName: newMember.lastName.trim(),
        phone: newMember.phone.trim(),
        dob: newMember.dob || undefined,
        userType: newMember.userType,
        gender: newMember.gender,
        city: newMember.city.trim() || undefined,
      });

      if (res.success) {
        const createdName = `${newMember.firstName.trim()} ${newMember.lastName.trim()}`;
        const createdPhone = newMember.phone.trim();
        const createdType = newMember.userType;

        // Reset form & close form view, show success view
        setNewMember({
          firstName: '',
          lastName: '',
          phone: '',
          dob: '',
          userType: 'Member',
          gender: 'Male',
          city: ''
        });
        setAddedMemberDetails({
          name: createdName,
          phone: createdPhone,
          userType: createdType
        });
        // Refresh list
        fetchMembers(true);
      } else {
        setAddFormError('Failed to create member record.');
      }
    } catch (err: any) {
      console.error('Error adding member:', err);
      setAddFormError(err?.message || 'Error creating member in Salesforce');
    } finally {
      setAddFormLoading(false);
    }
  };

  // Fetch device contacts for Invite Flow
  const fetchDeviceContacts = async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setContactsError('Permission to access device contacts was denied. Please allow contacts permission in device settings.');
        setContactsLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        pageSize: 1000,
        sort: Contacts.SortTypes.FirstName,
      });

      if (data && data.length > 0) {
        const uniqueContactsMap = new Map<string, any>();
        
        data.forEach((c, contactIdx) => {
          const contactName = c.name?.trim() || 
            `${c.firstName || ''} ${c.lastName || ''}`.trim() || 
            c.company?.trim();
          
          if (!c.phoneNumbers || c.phoneNumbers.length === 0) {
            return;
          }

          const displayName = contactName || c.phoneNumbers[0]?.number || 'Unknown Contact';

          c.phoneNumbers.forEach((p, phoneIdx) => {
            const rawPhone = p.number || '';
            const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
            if (cleanPhone.length >= 7 && !uniqueContactsMap.has(cleanPhone)) {
              uniqueContactsMap.set(cleanPhone, {
                id: `contact_${contactIdx}_${phoneIdx}_${cleanPhone}`,
                name: displayName,
                phone: cleanPhone,
                displayPhone: rawPhone
              });
            }
          });
        });
        
        const contactsList = Array.from(uniqueContactsMap.values());
        setDeviceContacts(contactsList);
        if (contactsList.length === 0) {
          setContactsError('No contacts with phone numbers found on device.');
        }
      } else {
        setDeviceContacts([]);
        setContactsError('No contacts found on device.');
      }
    } catch (e: any) {
      console.error('Error fetching device contacts:', e);
      setContactsError(`Could not load contacts: ${e?.message || 'Unknown error'}`);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleOpenInviteModal = () => {
    setIsActionMenuOpen(false);
    setSelectedContact(null);
    setInviteSuccessDetails(null);
    setContactSearchQuery('');
    setIsInviteModalOpen(true);
    fetchDeviceContacts();
  };

  const handleSendInvite = async () => {
    if (!selectedContact) return;
    setContactsError(null);
    setInviteLoading(true);

    try {
      const cleanPhone = selectedContact.phone.slice(-10);
      const contactName = selectedContact.name;

      // 1. Fast local check against already-loaded members list
      const localDuplicate = members.find((m: any) => {
        const mPhone = (m.MobilePhone || m.Phone || '').replace(/\D/g, '');
        return mPhone.length >= 10 && mPhone.endsWith(cleanPhone);
      });
      if (localDuplicate) {
        const existingName = `${localDuplicate.FirstName || ''} ${localDuplicate.LastName || ''}`.trim() || localDuplicate.Name || 'an existing member';
        setContactsError(`⚠️ This mobile number (${cleanPhone}) is already registered in our database for "${existingName}". No new record was created.`);
        setInviteLoading(false);
        return;
      }

      // 2. Also check via Salesforce (catches numbers not in current list view)
      const checkResult = await SalesforceService.checkContactExists(cleanPhone);
      if (checkResult?.exists && checkResult.member) {
        const existingName = `${checkResult.member.firstName || ''} ${checkResult.member.lastName || ''}`.trim() || checkResult.member.name || 'an existing member';
        setContactsError(`⚠️ This mobile number (${cleanPhone}) is already registered in our database for "${existingName}". No new record was created.`);
        setInviteLoading(false);
        return;
      }

      // 2. Pre-create Member in Salesforce (LastName = exact contactName from phone, firstName = "")
      const res = await SalesforceService.createMember({
        firstName: '',
        lastName: contactName,
        phone: cleanPhone,
        userType: inviteUserType,
        gender: 'Male',
      });

      if (res.success) {
        // 3. Construct WhatsApp deep link with warm church greeting and Play Store link
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const appPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.brothersinchrist.churchofgod';
        
        const messageText = `Greetings in Jesus' Name! 🙏✨\n\nDear ${contactName},\n\nYou are warmly invited to join our Church of GOD Mobile Application! ⛪\n\nYour church profile has already been registered for you, so you DO NOT need to sign up. Simply download the app and Sign In directly with your mobile number: ${cleanPhone}\n\n📲 Download the App from Google Play Store:\n${appPlayStoreUrl}\n\nMay God bless you abundantly! ❤️`;

        try {
          const shareOptions: any = {
            social: Share.Social.WHATSAPP as any,
            whatsAppNumber: formattedPhone,
            message: messageText,
          };
          await Share.shareSingle(shareOptions);
        } catch (shareErr) {
          console.log('Share.shareSingle failed, falling back to wa.me URL:', shareErr);
          const waMeUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
          const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
          const canOpen = await Linking.canOpenURL(whatsappUrl).catch(() => false);
          if (canOpen) {
            await Linking.openURL(whatsappUrl).catch(() => Linking.openURL(waMeUrl));
          } else {
            await Linking.openURL(waMeUrl).catch(err => console.warn('Could not open wa.me URL:', err));
          }
        }

        // 4. Display success details card
        setInviteSuccessDetails({
          name: contactName,
          phone: cleanPhone,
          userType: inviteUserType
        });
        fetchMembers(true);
      } else {
        setContactsError('Failed to create invitation record in church directory.');
      }
    } catch (err: any) {
      console.error('Error sending invite:', err);
      setContactsError(err?.message || 'Error creating invitation record');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading && members.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDark ? "#93c5fd" : "#1a2d5a"} />
        <Text style={{ marginTop: 10, color: isDark ? "#93c5fd" : "#1a2d5a", fontWeight: '600' }}>Loading production data...</Text>
      </View>
    );
  }

  if (error && members.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTxt}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMembers()}>
          <Text style={styles.retryBtnTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
        <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <TouchableOpacity onPress={openDrawer} style={{ position: 'absolute', left: 0, padding: 4 }}>
              <Menu size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Church Members</Text>
            <TouchableOpacity 
              activeOpacity={0.6}
              onPress={() => setIsActionMenuOpen(!isActionMenuOpen)} 
              style={{ position: 'absolute', right: 0, padding: 8, backgroundColor: '#f59e0b', borderRadius: 22, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}
            >
              <MoreVertical size={20} color="#1a2d5a" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </LinearGradient>

      {/* 3-Dots Action Popover Menu */}
      {isActionMenuOpen && (
        <Modal transparent={true} visible={isActionMenuOpen} animationType="none" onRequestClose={() => setIsActionMenuOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setIsActionMenuOpen(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', paddingRight: 16, paddingTop: Platform.OS === 'ios' ? 95 : 75, alignItems: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                  borderRadius: 14, 
                  paddingVertical: 6, 
                  width: 180, 
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0'
                }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}
                    onPress={() => {
                      setIsActionMenuOpen(false);
                      setAddFormError(null);
                      setAddedMemberDetails(null);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <UserPlus size={18} color={isDark ? '#38bdf8' : '#1a2d5a'} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>Add Member</Text>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#f1f5f9', marginVertical: 2 }} />

                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}
                    onPress={handleOpenInviteModal}
                  >
                    <Send size={18} color="#22c55e" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>Invite Member</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMembers(true)}
            colors={[isDark ? '#93c5fd' : '#1a2d5a']}
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statsPill}>
            <Text style={[styles.statVal, { color: isDark ? '#93c5fd' : '#1a2d5a' }]}>{totalMembers}</Text>
            <Text style={styles.statLbl}>Total</Text>
            
            <Text style={styles.statDivider}>|</Text>
            
            <Text style={[styles.statVal, { color: isDark ? '#86efac' : '#15803D' }]}>{activeMembers}</Text>
            <Text style={styles.statLbl}>Active</Text>
            
            <Text style={styles.statDivider}>|</Text>
            
            <Text style={[styles.statVal, { color: isDark ? '#fca5a5' : '#c0392b' }]}>{inactiveMembers}</Text>
            <Text style={styles.statLbl}>Inactive</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TextInput
            placeholder="Search by name, email, phone, or village..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters and Dropdown Row */}
        <View style={styles.filterAndDropdownRow}>
          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['All', 'Active', 'Inactive'] as const).map(filter => (
              <TouchableOpacity 
                key={filter} 
                style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text style={[styles.filterChipTxt, statusFilter === filter && styles.filterChipTxtActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Village Dropdown Button */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setIsVillageDropdownOpen(!isVillageDropdownOpen)}
            >
              <Text style={styles.dropdownButtonTxt} numberOfLines={1}>
                {selectedVillage === 'All' ? 'Village: All' : selectedVillage}
              </Text>
              {isVillageDropdownOpen ? (
                <ChevronUp size={16} color={isDark ? "#9ca3af" : "#6B7280"} />
              ) : (
                <ChevronDown size={16} color={isDark ? "#9ca3af" : "#6B7280"} />
              )}
            </TouchableOpacity>
          </View>
        </View>
          
        {isVillageDropdownOpen && (
            <View style={styles.dropdownList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {uniqueVillages.map(village => (
                  <TouchableOpacity 
                    key={village}
                    style={[styles.dropdownItem, selectedVillage === village && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedVillage(village);
                      setIsVillageDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemTxt, selectedVillage === village && styles.dropdownItemTxtActive]}>
                      {village}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        {/* Member Cards List */}
        <View style={[styles.membersList, { zIndex: -1 }]}>
          {filteredMembers.map((member, mIdx) => {
            const isExpanded = expandedId === member.Id;
            const associated = member.AccountId
              ? (accountMembersMap.get(member.AccountId) || []).filter(m => m.Id !== member.Id)
              : [];
            const isActive = member.Account?.Active__c === true;

            return (
              <View 
                key={member.Id ? `${member.Id}_${mIdx}` : `mem_${mIdx}`} 
                style={[styles.memberCard, isExpanded && styles.memberCardExpanded]}
              >
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  activeOpacity={0.7}
                  onPress={() => handleToggleExpand(member.Id)}
                >
                  <View style={styles.profileSection}>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        const url = getPhotoUrl(member);
                        if (url) setPreviewImage(url);
                      }}
                      activeOpacity={0.8}
                    >
                      {getPhotoUrl(member) ? (
                        <Image source={{ uri: getPhotoUrl(member)! }} style={[styles.avatar, { padding: 0 }]} />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTxt}>{getInitials(member.Name)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.nameSection}>
                      <Text style={styles.name}>{member.Name}</Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleTxt}>{member.User_Type__c || 'Member'}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge, 
                          isActive ? styles.statusActive : styles.statusInactive
                        ]}>
                          <Text style={styles.statusTxt}>{isActive ? 'Active' : 'Inactive'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.chevronWrap}>
                    {isExpanded ? (
                      <ChevronUp size={18} color={isDark ? "#9ca3af" : "#6B7280"} />
                    ) : (
                      <ChevronDown size={18} color={isDark ? "#9ca3af" : "#6B7280"} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.contactDetails}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={[styles.contactRow, { 
                        backgroundColor: (member.MobilePhone || member.Phone) ? 'rgba(21, 128, 61, 0.12)' : 'transparent',
                        paddingHorizontal: (member.MobilePhone || member.Phone) ? 10 : 0,
                        paddingVertical: (member.MobilePhone || member.Phone) ? 4 : 0,
                        borderRadius: 12
                      }]}
                      onPress={() => {
                        const phone = member.MobilePhone || member.Phone;
                        if (phone) Linking.openURL(`tel:${phone}`);
                      }}
                      disabled={!(member.MobilePhone || member.Phone)}
                    >
                      <Phone size={12} color={(member.MobilePhone || member.Phone) ? "#15803D" : (isDark ? "#9ca3af" : "#6B7280")} />
                      <Text style={[styles.contactTxt, { 
                        color: (member.MobilePhone || member.Phone) ? "#15803D" : (isDark ? "#9ca3af" : "#4B5563"), 
                        fontWeight: (member.MobilePhone || member.Phone) ? '600' : '400' 
                      }]}>
                        {member.MobilePhone || member.Phone || 'No Phone'}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.contactRow}>
                      <Mail size={12} color={isDark ? "#9ca3af" : "#6B7280"} />
                      <Text style={styles.contactTxt}>{member.Email || 'No Email'}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 15, rowGap: 6, marginTop: 6 }}>
                    {member.Birthdate ? (
                      <View style={styles.contactRow}>
                        <Text style={{ fontSize: 12 }}>🎂</Text>
                        <Text style={styles.contactTxt}>DOB: {new Date(member.Birthdate).toLocaleDateString()}</Text>
                      </View>
                    ) : null}
                    {member.Date_of_Baptism__c ? (
                      <View style={styles.contactRow}>
                        <Text style={{ fontSize: 12 }}>💧</Text>
                        <Text style={styles.contactTxt}>Baptism: {new Date(member.Date_of_Baptism__c).toLocaleDateString()}</Text>
                      </View>
                    ) : null}
                    {member.Anniversary_Date__c ? (
                      <View style={styles.contactRow}>
                        <Text style={{ fontSize: 12 }}>💍</Text>
                        <Text style={styles.contactTxt}>Anniversary: {new Date(member.Anniversary_Date__c).toLocaleDateString()}</Text>
                      </View>
                    ) : null}
                    {member.MailingCity ? (
                      <View style={styles.contactRow}>
                        <MapPin size={12} color={isDark ? "#9ca3af" : "#6B7280"} />
                        <Text style={styles.contactTxt}>{member.MailingCity}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    
                    {/* App Activity Stats */}
                    <View style={styles.statsSubGrid}>
                      <View style={styles.subStatBox}>
                        <View style={styles.subStatLabelRow}>
                          <Clock size={12} color="#c0392b" />
                          <Text style={styles.subStatLabel}>Last App Opened</Text>
                        </View>
                        <Text style={styles.subStatValue}>{formatLastAppOpened(member.Last_App_Opened__c)}</Text>
                      </View>
                      <View style={styles.subStatBox}>
                        <View style={styles.subStatLabelRow}>
                          <UserCheck size={12} color="#15803D" />
                          <Text style={styles.subStatLabel}>Household Contacts</Text>
                        </View>
                        <Text style={styles.subStatValue}>
                          {associated.length} Associated
                        </Text>
                      </View>
                    </View>

                    {/* Household Members breakdown */}
                    <Text style={styles.householdHeader}>
                      Household: {member.Account?.Name || 'No Household Group'}
                    </Text>

                    <View style={styles.householdList}>
                      {associated.length > 0 ? (
                        associated.map((assoc, aIdx) => {
                          const isAssocExpanded = expandedHouseholdIds.has(assoc.Id);
                          return (
                            <TouchableOpacity 
                              key={assoc.Id ? `assoc_${assoc.Id}_${aIdx}` : `assoc_${aIdx}`} 
                              style={[styles.householdItem, { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}
                              onPress={() => handleToggleHousehold(assoc.Id)}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={styles.hiLeft}>
                                  <Text style={styles.hiName}>{assoc.Name}</Text>
                                </View>
                                <View style={[styles.hiRight, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                  <Text style={styles.hiRelation}>{assoc.Title || assoc.User_Type__c || 'Member'}</Text>
                                  {isAssocExpanded ? (
                                    <ChevronUp size={14} color={isDark ? "#9ca3af" : "#6B7280"} />
                                  ) : (
                                    <ChevronDown size={14} color={isDark ? "#9ca3af" : "#6B7280"} />
                                  )}
                                </View>
                              </View>
                              
                              {isAssocExpanded && (
                                <View style={{ marginTop: 8, borderTopWidth: 0.5, borderTopColor: isDark ? '#334155' : '#e5e7eb', paddingTop: 8 }}>
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                    {(assoc.MobilePhone || assoc.Phone) ? (
                                      <TouchableOpacity 
                                        style={[styles.contactRow, { 
                                          backgroundColor: 'rgba(21, 128, 61, 0.12)',
                                          paddingHorizontal: 8,
                                          paddingVertical: 4,
                                          borderRadius: 12
                                        }]}
                                        onPress={() => Linking.openURL(`tel:${assoc.MobilePhone || assoc.Phone}`)}
                                      >
                                        <Phone size={10} color="#15803D" />
                                        <Text style={[styles.contactTxt, { color: '#15803D', fontWeight: '600', fontSize: 11 }]}>
                                          {assoc.MobilePhone || assoc.Phone}
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}
                                    
                                    {assoc.Email ? (
                                      <View style={[styles.contactRow, { paddingVertical: 4 }]}>
                                        <Mail size={12} color={isDark ? "#9ca3af" : "#6B7280"} />
                                        <Text style={[styles.contactTxt, { fontSize: 11 }]}>{assoc.Email}</Text>
                                      </View>
                                    ) : null}
                                  </View>

                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 15, rowGap: 6, marginTop: 6 }}>
                                    {assoc.Birthdate ? (
                                      <View style={styles.contactRow}>
                                        <Text style={{ fontSize: 11 }}>🎂</Text>
                                        <Text style={[styles.contactTxt, { fontSize: 11 }]}>DOB: {new Date(assoc.Birthdate).toLocaleDateString()}</Text>
                                      </View>
                                    ) : null}
                                    {assoc.Date_of_Baptism__c ? (
                                      <View style={styles.contactRow}>
                                        <Text style={{ fontSize: 11 }}>💧</Text>
                                        <Text style={[styles.contactTxt, { fontSize: 11 }]}>Baptism: {new Date(assoc.Date_of_Baptism__c).toLocaleDateString()}</Text>
                                      </View>
                                    ) : null}
                                    {assoc.Anniversary_Date__c ? (
                                      <View style={styles.contactRow}>
                                        <Text style={{ fontSize: 11 }}>💍</Text>
                                        <Text style={[styles.contactTxt, { fontSize: 11 }]}>Anniversary: {new Date(assoc.Anniversary_Date__c).toLocaleDateString()}</Text>
                                      </View>
                                    ) : null}
                                  </View>

                                  {(!assoc.Phone && !assoc.MobilePhone && !assoc.Email && !assoc.Birthdate && !assoc.Date_of_Baptism__c && !assoc.Anniversary_Date__c) ? (
                                    <Text style={styles.hiDetail}>No additional details available</Text>
                                  ) : null}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyHouseholdTxt}>
                          No other household contacts registered.
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footerBranding}>Church of GOD Admin · Member Activity Logs</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Member Modal - Centered Popup Card */}
      <Modal 
        visible={isAddModalOpen} 
        transparent={true} 
        animationType="none"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCard}>
                  {addedMemberDetails ? (
                    /* Stylish Success Card View */
                    <View style={{ alignItems: 'center', paddingVertical: 15 }}>
                      <View style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: 32, 
                        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        marginBottom: 16,
                        borderWidth: 2,
                        borderColor: '#22c55e'
                      }}>
                        <CheckCircle2 size={36} color="#22c55e" />
                      </View>

                      <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                        Member Registered!
                      </Text>
                      <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 20 }}>
                        Member details have been successfully saved to the church directory.
                      </Text>

                      {/* Summary Box */}
                      <View style={{ 
                        width: '100%', 
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                        borderRadius: 14, 
                        padding: 16, 
                        borderWidth: 1, 
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        marginBottom: 20,
                        gap: 8
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Member Name</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>{addedMemberDetails.name}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Mobile Number</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>{addedMemberDetails.phone}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>User Type</Text>
                          <View style={{ backgroundColor: '#1a2d5a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{addedMemberDetails.userType}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                        <TouchableOpacity 
                          style={{ 
                            flex: 1, 
                            paddingVertical: 12, 
                            borderRadius: 12, 
                            borderWidth: 1, 
                            borderColor: isDark ? '#334155' : '#cbd5e1', 
                            alignItems: 'center' 
                          }}
                          onPress={() => setIsAddModalOpen(false)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569' }}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{ 
                            flex: 1.5, 
                            paddingVertical: 12, 
                            borderRadius: 12, 
                            backgroundColor: '#1a2d5a', 
                            alignItems: 'center' 
                          }}
                          onPress={() => {
                            setAddedMemberDetails(null);
                            setAddFormError(null);
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>+ Add Another</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      {/* Modal Header */}
                      <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={styles.modalHeaderBadge}>
                            <UserCheck size={18} color="#f59e0b" />
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.modalTitle}>Add New Member</Text>
                            <TouchableOpacity 
                              activeOpacity={0.5}
                              onPress={() => setIsAddModalOpen(false)} 
                              style={styles.modalCloseBtn} 
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                              <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 15 }}
                    style={{ maxHeight: Dimensions.get('window').height * 0.7 }}
                  >
                    {addFormError ? (
                      <View style={styles.modalErrorBox}>
                        <Text style={styles.modalErrorTxt}>{addFormError}</Text>
                      </View>
                    ) : null}

                    {/* First Name & Last Name */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>First Name <Text style={{ color: '#ef4444' }}>*</Text></Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="John"
                          placeholderTextColor="#94a3b8"
                          value={newMember.firstName}
                          onChangeText={(val) => setNewMember(prev => ({ ...prev, firstName: val }))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>Last Name <Text style={{ color: '#ef4444' }}>*</Text></Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="Doe"
                          placeholderTextColor="#94a3b8"
                          value={newMember.lastName}
                          onChangeText={(val) => setNewMember(prev => ({ ...prev, lastName: val }))}
                        />
                      </View>
                    </View>

                    {/* Mobile Number (Full Width) */}
                    <View style={{ marginBottom: 14 }}>
                      <Text style={styles.formLabel}>Mobile Number <Text style={{ color: '#ef4444' }}>*</Text></Text>
                      <TextInput 
                        style={styles.formInput} 
                        placeholder="9876543210"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        value={newMember.phone}
                        onChangeText={(val) => setNewMember(prev => ({ ...prev, phone: val }))}
                      />
                    </View>

                    {/* Gender & User Type Single Row */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <View style={{ width: 125 }}>
                          <Text style={styles.formLabel}>Gender</Text>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {['Male', 'Female'].map(g => (
                              <TouchableOpacity 
                                key={g}
                                style={[styles.genderChip, newMember.gender === g && styles.genderChipActive, { paddingVertical: 7 }]}
                                onPress={() => setNewMember(prev => ({ ...prev, gender: g }))}
                              >
                                <Text style={[styles.genderChipTxt, newMember.gender === g && styles.genderChipTxtActive, { fontSize: 11 }]}>{g}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>User Type <Text style={{ color: '#ef4444' }}>*</Text></Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {userTypeOptions.map(opt => (
                              <TouchableOpacity 
                                key={opt.value}
                                style={[styles.typeChip, newMember.userType === opt.value && styles.typeChipActive, { paddingHorizontal: 10, paddingVertical: 6 }]}
                                onPress={() => setNewMember(prev => ({ ...prev, userType: opt.value }))}
                              >
                                <Text style={[styles.typeChipTxt, newMember.userType === opt.value && styles.typeChipTxtActive, { fontSize: 11 }]}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>

                    {/* Date of Birth & Village / City Row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>Date of Birth</Text>
                        <TouchableOpacity 
                          style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                          onPress={() => setDatePickerVisibility(true)}
                        >
                          <Text style={{ fontSize: 13, color: newMember.dob ? (isDark ? '#fff' : '#0f172a') : '#94a3b8' }}>
                            {newMember.dob || 'Select DOB'}
                          </Text>
                          <Calendar size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>Village / City</Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="e.g. Hyderabad"
                          placeholderTextColor="#94a3b8"
                          value={newMember.city}
                          onChangeText={(val) => setNewMember(prev => ({ ...prev, city: val }))}
                        />
                      </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                      style={[styles.submitBtn, addFormLoading && { opacity: 0.7 }]}
                      onPress={handleSaveMember}
                      disabled={addFormLoading}
                    >
                      {addFormLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitBtnTxt}>Add Member</Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </Modal>

  {/* Invite Member Modal - Device Contacts & WhatsApp Deep Linking */}
  <Modal
    visible={isInviteModalOpen}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setIsInviteModalOpen(false)}
  >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setIsInviteModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCard}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={[styles.modalHeaderBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Send size={18} color="#22c55e" />
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.modalTitle}>Invite Member</Text>
                        <TouchableOpacity 
                          activeOpacity={0.5}
                          onPress={() => setIsInviteModalOpen(false)} 
                          style={styles.modalCloseBtn} 
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {inviteSuccessDetails ? (
                    /* Stylish Invite Success Card */
                    <View style={{ alignItems: 'center', paddingVertical: 15 }}>
                      <View style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: 32, 
                        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        marginBottom: 16,
                        borderWidth: 2,
                        borderColor: '#22c55e'
                      }}>
                        <CheckCircle2 size={36} color="#22c55e" />
                      </View>

                      <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                        Invitation Sent!
                      </Text>
                      <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 20 }}>
                        Member created in directory and WhatsApp invitation launched.
                      </Text>

                      {/* Summary Box */}
                      <View style={{ 
                        width: '100%', 
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                        borderRadius: 14, 
                        padding: 16, 
                        borderWidth: 1, 
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        marginBottom: 20,
                        gap: 8
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Invited Name</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>{inviteSuccessDetails.name}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Mobile Number</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>{inviteSuccessDetails.phone}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>User Type</Text>
                          <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{inviteSuccessDetails.userType}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                        <TouchableOpacity 
                          style={{ 
                            flex: 1, 
                            paddingVertical: 12, 
                            borderRadius: 12, 
                            borderWidth: 1, 
                            borderColor: isDark ? '#334155' : '#cbd5e1', 
                            alignItems: 'center' 
                          }}
                          onPress={() => setIsInviteModalOpen(false)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569' }}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{ 
                            flex: 1.5, 
                            paddingVertical: 12, 
                            borderRadius: 12, 
                            backgroundColor: '#22c55e', 
                            alignItems: 'center' 
                          }}
                          onPress={() => {
                            setSelectedContact(null);
                            setInviteSuccessDetails(null);
                            setContactsError(null);
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>+ Invite Another</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : selectedContact ? (
                    /* Selected Contact Confirmation View */
                    <View style={{ paddingVertical: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569', marginBottom: 8 }}>
                        SELECTED DEVICE CONTACT
                      </Text>

                      {/* Contact Preview Card */}
                      <View style={{ 
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                        borderRadius: 14, 
                        padding: 16, 
                        borderWidth: 1, 
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: 22, 
                            backgroundColor: '#1a2d5a', 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                          }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                              {selectedContact.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>
                              {selectedContact.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                              📱 {selectedContact.phone}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity 
                          onPress={() => setSelectedContact(null)}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>Change</Text>
                        </TouchableOpacity>
                      </View>

                      {/* User Type Selection */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.formLabel}>User Type <Text style={{ color: '#ef4444' }}>*</Text></Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                          {userTypeOptions.map(opt => (
                            <TouchableOpacity 
                              key={opt.value}
                              style={[styles.typeChip, inviteUserType === opt.value && styles.typeChipActive]}
                              onPress={() => setInviteUserType(opt.value)}
                            >
                              <Text style={[styles.typeChipTxt, inviteUserType === opt.value && styles.typeChipTxtActive]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {contactsError ? (
                        <View style={styles.modalErrorBox}>
                          <Text style={styles.modalErrorTxt}>{contactsError}</Text>
                        </View>
                      ) : null}

                      {/* Send Invite Button */}
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: '#22c55e', 
                          borderRadius: 12, 
                          paddingVertical: 14, 
                          alignItems: 'center', 
                          marginTop: 10, 
                          flexDirection: 'row', 
                          justifyContent: 'center', 
                          gap: 8,
                          opacity: inviteLoading ? 0.7 : 1
                        }}
                        onPress={handleSendInvite}
                        disabled={inviteLoading}
                      >
                        {inviteLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Send size={18} color="#fff" />
                            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Send WhatsApp Invite</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* ===== CONTACTS LIST VIEW ===== */
                    <View>
                      {/* Search Bar */}
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        height: 46,
                        backgroundColor: isDark ? '#0f172a' : '#f1f5f9', 
                        borderWidth: 1, 
                        borderColor: isDark ? '#334155' : '#cbd5e1', 
                        borderRadius: 12, 
                        paddingHorizontal: 12, 
                        marginBottom: 10
                      }}>
                        <Search size={18} color={isDark ? '#38bdf8' : '#22c55e'} />
                        <TextInput 
                          style={{ 
                            flex: 1, 
                            height: 46,
                            paddingHorizontal: 10, 
                            fontSize: 13, 
                            color: isDark ? '#ffffff' : '#0f172a',
                          }}
                          placeholder="Search contacts..."
                          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                          value={contactSearchQuery}
                          onChangeText={setContactSearchQuery}
                        />
                        {contactSearchQuery ? (
                          <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                            <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {contactsError ? (
                        <View style={styles.modalErrorBox}>
                          <Text style={styles.modalErrorTxt}>{contactsError}</Text>
                        </View>
                      ) : null}

                      {/* WHITE CARD with contacts list */}
                      <View style={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 8,
                        elevation: 5,
                      }}>
                        {contactsLoading ? (
                          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                            <ActivityIndicator color="#22c55e" size="large" />
                            <Text style={{ marginTop: 12, color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: '600' }}>
                              Reading phone contacts...
                            </Text>
                          </View>
                        ) : deviceContacts.length === 0 ? (
                          <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                            <Text style={{ fontSize: 30, marginBottom: 8 }}>📱</Text>
                            <Text style={{ textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, marginBottom: 16 }}>
                              No contacts found. Tap below to load your device contacts.
                            </Text>
                            <TouchableOpacity 
                              style={{ backgroundColor: '#22c55e', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                              onPress={fetchDeviceContacts}
                            >
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Load Contacts</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <ScrollView 
                            style={{ height: 320 }}
                            contentContainerStyle={{ padding: 10, paddingBottom: 16 }}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled={true}
                          >
                            {deviceContacts
                              .filter(c => 
                                c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                                c.phone.includes(contactSearchQuery)
                              )
                              .map((item, idx) => (
                                <TouchableOpacity 
                                  key={`${item.id}_${idx}`}
                                  activeOpacity={0.7}
                                  style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    paddingVertical: 10,
                                    paddingHorizontal: 12, 
                                    borderRadius: 10,
                                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                                    borderWidth: 1, 
                                    borderColor: isDark ? '#334155' : '#e2e8f0',
                                    marginBottom: 8
                                  }}
                                  onPress={() => {
                                    setSelectedContact({ name: item.name, phone: item.phone });
                                    setContactsError(null);
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <View style={{ 
                                      width: 38, height: 38, borderRadius: 19, 
                                      backgroundColor: isDark ? '#1e3a8a' : '#dbeafe', 
                                      justifyContent: 'center', alignItems: 'center'
                                    }}>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#93c5fd' : '#1e40af' }}>
                                        {item.name.substring(0, 2).toUpperCase()}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>{item.name}</Text>
                                      <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>📱 {item.displayPhone}</Text>
                                    </View>
                                  </View>
                                  <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Send size={11} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Invite</Text>
                                  </View>
                                </TouchableOpacity>
                              ))
                            }
                          </ScrollView>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(date) => {
          const formatted = date.toISOString().split('T')[0];
          setNewMember(prev => ({ ...prev, dob: formatted }));
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
        maximumDate={new Date()}
      />

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPreviewImage(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <Image 
              source={{ uri: previewImage || '' }} 
              style={{ width: width * 0.9, height: width * 0.9, borderRadius: 20 }} 
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}


const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  errorTxt: { fontSize: 14, color: isDark ? '#fca5a5' : '#c0392b', textAlign: 'center', marginBottom: 15, fontWeight: '600' },
  retryBtn: { backgroundColor: '#1a2d5a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll: { padding: 16 },
  headerOuter: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    paddingBottom: 4,
  },
  headerInner: {
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  statsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18, marginTop: 15 },
  statsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 28, borderWidth: 1, borderColor: isDark ? colors.border : '#000' },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLbl: { fontSize: 12, color: isDark ? '#94a3b8' : '#475569', marginLeft: 6 },
  statDivider: { marginHorizontal: 16, color: '#94a3b8' },

  searchBarContainer: { 
    backgroundColor: colors.card, 
    borderRadius: 25, 
    paddingHorizontal: 16, 
    height: 48, 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: isDark ? colors.border : '#000', 
    marginBottom: 12 
  },
  searchInput: { fontSize: 14, color: colors.text },

  filterAndDropdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingRight: 10 },
  filterChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#E5E7EB', 
    borderWidth: 0.5, 
    borderColor: '#D1D5DB' 
  },
  filterChipActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  filterChipTxt: { fontSize: 11, fontWeight: '600', color: '#374151' },
  filterChipTxtActive: { color: '#fff' },

  dropdownContainer: { flex: 1, minWidth: 110 },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dropdownButtonTxt: { fontSize: 11, color: colors.text, fontWeight: '600', marginRight: 4, flex: 1 },
  dropdownList: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#d1d5db',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? '#334155' : '#e5e7eb',
  },
  dropdownItemActive: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
  },
  dropdownItemTxt: { fontSize: 13, color: colors.text },
  dropdownItemTxtActive: { color: '#3b82f6', fontWeight: '700' },

  membersList: { gap: 10 },
  memberCard: { 
    backgroundColor: colors.card, 
    borderRadius: 10, 
    padding: 15, 
    borderWidth: 0.5, 
    borderColor: isDark ? '#334155' : '#e5e7eb' 
  },
  memberCardExpanded: { borderColor: '#1a2d5a', borderWidth: 1 },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1a2d5a', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  nameSection: { flexDirection: 'column', gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  roleBadge: { 
    backgroundColor: isDark ? 'rgba(239, 246, 255, 0.1)' : '#EFF6FF', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  roleTxt: { fontSize: 9, color: isDark ? '#93c5fd' : '#1a2d5a', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusActive: { backgroundColor: '#F0FDF4' },
  statusInactive: { backgroundColor: isDark ? 'rgba(254, 242, 242, 0.1)' : '#FEF2F2' },
  statusTxt: { fontSize: 9, fontWeight: '700', color: isDark ? '#93c5fd' : '#1a2d5a' },
  chevronWrap: { padding: 4 },

  contactDetails: { 
    marginTop: 10, 
    borderTopWidth: 0.5, 
    borderTopColor: '#f3f4f6', 
    paddingTop: 10, 
    gap: 6 
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactTxt: { fontSize: 12, color: '#4B5563' },

  expandedContent: { 
    marginTop: 12, 
    borderTopWidth: 0.5, 
    borderTopColor: '#e5e7eb', 
    paddingTop: 12 
  },
  statsSubGrid: { gap: 10, marginBottom: 12 },
  subStatBox: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 8, 
    padding: 10, 
    borderWidth: 0.5, 
    borderColor: isDark ? '#334155' : '#e5e7eb' 
  },
  subStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  subStatLabel: { fontSize: 9, textTransform: 'uppercase', color: isDark ? '#9ca3af' : '#6B7280', fontWeight: '700' },
  subStatValue: { fontSize: 12, fontWeight: '700', color: '#1e293b' },

  householdHeader: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: isDark ? '#93c5fd' : '#1a2d5a', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 8, 
    marginTop: 4 
  },
  householdList: { gap: 6 },
  householdItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: isDark ? '#1e293b' : '#f9fafb', 
    borderWidth: 0.5, 
    borderColor: isDark ? '#334155' : '#e5e7eb', 
    borderRadius: 6, 
    padding: 8 
  },
  hiLeft: { flex: 1, gap: 2 },
  hiName: { fontSize: 13, fontWeight: '700', color: colors.text },
  hiDetail: { fontSize: 11, color: isDark ? '#9ca3af' : '#4b5563', marginLeft: 2 },
  hiEmail: { fontSize: 10, color: isDark ? '#9ca3af' : '#6B7280' },
  hiRight: { 
    backgroundColor: isDark ? '#475569' : '#E5E7EB', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  hiRelation: { fontSize: 9, color: isDark ? '#fff' : '#374151', fontWeight: '600' },
  emptyHouseholdTxt: { fontSize: 11, color: isDark ? '#6b7280' : '#9CA3AF', fontStyle: 'italic' },

  footerBranding: { fontSize: 10, color: isDark ? '#6b7280' : '#9CA3AF', textAlign: 'center', marginTop: 20 },

  // Add Member Modal Styles (Centered Popup Card)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 20 },
  modalCard: { 
    backgroundColor: isDark ? '#1e293b' : '#ffffff', 
    borderRadius: 24, 
    padding: 20, 
    width: '100%', 
    maxWidth: 460,
    maxHeight: '92%', 
    flexShrink: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9', paddingBottom: 12 },
  modalHeaderBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245, 158, 11, 0.15)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' },
  modalSubTitle: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' },
  modalCloseBtn: { padding: 6, borderRadius: 16, backgroundColor: isDark ? '#334155' : '#f1f5f9' },
  modalErrorBox: { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 10, marginBottom: 12 },
  modalErrorTxt: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  formLabel: { fontSize: 12, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569', marginBottom: 4 },
  formInput: { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: isDark ? '#334155' : '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: isDark ? '#fff' : '#0f172a' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#0f172a' : '#f1f5f9' },
  typeChipActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  typeChipTxt: { fontSize: 12, fontWeight: '600', color: isDark ? '#94a3b8' : '#475569' },
  typeChipTxtActive: { color: '#ffffff' },
  genderChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#0f172a' : '#f1f5f9' },
  genderChipActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  genderChipTxt: { fontSize: 12, fontWeight: '600', color: isDark ? '#94a3b8' : '#475569' },
  genderChipTxtActive: { color: '#ffffff' },
  submitBtn: { backgroundColor: '#1a2d5a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 5 },
  submitBtnTxt: { color: '#ffffff', fontSize: 15, fontWeight: '700' }
});
