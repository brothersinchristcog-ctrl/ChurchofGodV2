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
  TouchableWithoutFeedback
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Users, Phone, Mail, ChevronDown, ChevronUp, Clock, UserCheck, Menu, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';
import SalesforceService from '../../services/SalesforceService';

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

  const styles = getStyles(colors, isDark);

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

  // Stats calculation
  const statsMembers = React.useMemo(() => {
    if (selectedVillage === 'All') return members;
    return members.filter(m => {
      const villageStr = m.MailingCity || '';
      return villageStr.trim().toLowerCase() === selectedVillage.toLowerCase();
    });
  }, [members, selectedVillage]);

  const totalMembers = statsMembers.length;
  const activeMembers = statsMembers.filter(m => m.Account?.Active__c === true).length;
  const inactiveMembers = statsMembers.filter(m => m.Account?.Active__c !== true).length;

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

  const filteredMembers = members.filter(m => {
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
          </View>
        </LinearGradient>
      </LinearGradient>

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
          {filteredMembers.map((member) => {
            const isExpanded = expandedId === member.Id;
            const associated = member.AccountId
              ? members.filter(m => m.AccountId === member.AccountId && m.Id !== member.Id)
              : [];
            const isActive = member.Account?.Active__c === true;

            return (
              <View 
                key={member.Id} 
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
                      <View style={badgeRowStyles(isActive).badgeRow}>
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
                        associated.map((assoc) => {
                          const isAssocExpanded = expandedHouseholdIds.has(assoc.Id);
                          return (
                            <TouchableOpacity 
                              key={assoc.Id} 
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

const badgeRowStyles = (isActive: boolean) => StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' }
});

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

  footerBranding: { fontSize: 10, color: isDark ? '#6b7280' : '#9CA3AF', textAlign: 'center', marginTop: 20 }
});
