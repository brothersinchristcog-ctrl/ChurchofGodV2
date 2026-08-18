import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Users, 
  ChevronLeft,
  ArrowLeft,
  ChevronDown,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  Plus,
  X,
  Pencil,
  Calendar as CalendarIcon
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import SalesforceService from '../services/SalesforceService';

const { width } = Dimensions.get('window');

const RELATION_OPTIONS = [
  'Husband', 'Wife', 'Father', 'Mother', 'Son', 'Daughter',
  'Son-in-Law', 'Daughter-in-Law', 'Brother', 'Sister',
  'Father-in-Law', 'Mother-in-Law', 'Brother-in-Law', 'Sister-in-Law',
  'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
  'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin', 'Guardian', 'Other'
];

const SPOUSE_RELATIONS = ['Husband', 'Wife'];

export default function MembersScreen({ navigation }: any) {
  const { member } = useAuth();
  const { isDark } = useTheme();
  const [relatedContacts, setRelatedContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    relation: 'Husband', // picklist
    gender: 'Male',
    birthdate: '',
    anniversaryDate: '',
    baptismDate: '',
    email: '',
    phone: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Family member added successfully.');
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'birthdate' | 'anniversary' | 'baptism' | null>(null);

  const fetchFamily = async () => {
    if (!member || !member.accountId) {
      setLoading(false);
      return;
    }
    
    const cacheKey = `cache_members_${member.accountId}`;
    try {
      // Load from cache first for instant UI
      try {
        const cachedContacts = await AsyncStorage.getItem(cacheKey);
        if (cachedContacts) {
          setRelatedContacts(JSON.parse(cachedContacts));
          setLoading(false);
        }
      } catch (e) {
        // ignore cache read errors
      }

      // Fetch fresh data in background
      const contacts = await SalesforceService.getRelatedContacts(member.accountId);
      setRelatedContacts(contacts);
      
      // Update cache
      AsyncStorage.setItem(cacheKey, JSON.stringify(contacts)).catch(()=>{});
    } catch (err) {
      console.error('Error fetching household members:', err);
      Alert.alert('Error', 'Failed to retrieve household members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, [member]);

  const formatDateToDDMMYYYY = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    // If date is YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const openAddModal = () => {
    setEditingContact(null);
    setMemberForm({
      firstName: '', lastName: '', relation: 'Husband', gender: 'Male', birthdate: '', anniversaryDate: '', baptismDate: '', email: '', phone: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingContact(c);
    setMemberForm({
      firstName: c.FirstName || '',
      lastName: c.LastName || '',
      relation: c.Title || 'Husband',
      gender: c.Gender__c || 'Male',
      birthdate: formatDateToDDMMYYYY(c.Birthdate),
      anniversaryDate: formatDateToDDMMYYYY(c.Anniversary_Date__c),
      baptismDate: formatDateToDDMMYYYY(c.Date_of_Baptism__c),
      email: c.Email || '',
      phone: c.Phone || c.MobilePhone || ''
    });
    setShowAddModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.firstName || !memberForm.lastName) {
      Alert.alert('Validation', 'First name and Last name are required.');
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingContact) {
        await SalesforceService.updateFamilyMember(editingContact.Id, memberForm);
        setSuccessMsg('Member details updated successfully.');
      } else {
        await SalesforceService.addFamilyMember(member!.accountId!, memberForm);
        setSuccessMsg('Family member added successfully.');
      }
      setShowSuccess(true);
      setShowAddModal(false);
      setEditingContact(null);
      setMemberForm({
        firstName: '', lastName: '', relation: 'Husband', gender: 'Male', birthdate: '', anniversaryDate: '', baptismDate: '', email: '', phone: ''
      });
      // Clear cache and fetch fresh
      await AsyncStorage.removeItem('cog_admin_celebs_cache_v2').catch(() => {});
      if (member?.accountId) {
        await AsyncStorage.removeItem(`cache_members_${member.accountId}`).catch(() => {});
      }
      fetchFamily();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save member details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  const handleSendEmail = (email: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Unable to open email client.');
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Premium Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerShadowWrapper}>
          <View style={styles.gradientBorderContainer}>
            <Svg height="100%" width="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <Defs>
                <LinearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#3b82f6" />
                  <Stop offset="0.5" stopColor="#0ea5e9" />
                  <Stop offset="1" stopColor="#8b5cf6" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#borderGrad)" />
            </Svg>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Household Directory</Text>
                <Text style={styles.headerSubTe}>కుటుంబ సభ్యుల వివరాలు</Text>
              </View>

              <View style={styles.headerRight}>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Main Body ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FCD34D" />
          <Text style={[styles.loadingText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Loading family directory...
          </Text>
        </View>
      ) : !member ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#1a2d5a' }]}>
            Sign In Required
          </Text>
          <Text style={styles.emptySubText}>
            Please sign in to view your household details.
          </Text>
        </View>
      ) : !member.accountId ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#1a2d5a' }]}>
            No Household Linked
          </Text>
          <Text style={styles.emptySubText}>
            Your profile is not linked to any household. Please contact the administrator.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {relatedContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptySubText}>
                No household contacts found linked to your account.
              </Text>
            </View>
          ) : (
            relatedContacts.map((c) => {
              const isCurrentUser = c.Id === member.id;
              const contactPhone = c.Phone || c.MobilePhone;
              return (
                <View 
                  key={c.Id} 
                  style={[
                    styles.memberCard, 
                    { 
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      borderColor: isCurrentUser ? '#FCD34D' : (isDark ? '#334155' : '#e2e8f0'),
                      borderWidth: isCurrentUser ? 2 : 1
                    }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatarCircle, isCurrentUser && styles.avatarCircleActive]}>
                      <Text style={styles.avatarText}>{getInitials(c.Name)}</Text>
                    </View>

                    <View style={styles.memberMeta}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.memberName, { color: isDark ? '#fff' : '#1a2d5a' }]}>
                          {c.Name || `${c.FirstName || ''} ${c.LastName || ''}`.trim()}
                        </Text>
                        {isCurrentUser && (
                          <View style={styles.selfBadge}>
                            <Text style={styles.selfBadgeTxt}>You</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.roleRow}>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeTxt}>{c.Title || c.User_Type__c || 'Member'}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.editCardBtn} 
                          onPress={() => openEditModal(c)}
                        >
                          <Pencil size={13} color="#3b82f6" />
                          <Text style={styles.editCardBtnTxt}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]} />

                  <View style={styles.cardDetails}>
                    {contactPhone && (
                      <TouchableOpacity 
                        style={styles.detailRow} 
                        onPress={() => handleMakeCall(contactPhone)}
                      >
                        <View style={styles.iconBgPhone}>
                          <Phone size={14} color="#15803D" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Phone Number</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {contactPhone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {c.Email && (
                      <TouchableOpacity 
                        style={styles.detailRow} 
                        onPress={() => handleSendEmail(c.Email)}
                      >
                        <View style={styles.iconBgMail}>
                          <Mail size={14} color="#0369a1" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Email Address</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {c.Email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {c.Birthdate && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconBgCal}>
                          <Calendar size={14} color="#b45309" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Birthdate</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {formatDateToDDMMYYYY(c.Birthdate)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {c.Anniversary_Date__c && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconBgCal}>
                          <Calendar size={14} color="#b45309" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Wedding Anniversary Date</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {formatDateToDDMMYYYY(c.Anniversary_Date__c)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {c.Date_of_Baptism__c && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconBgCal}>
                          <Calendar size={14} color="#b45309" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Baptism Date</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {formatDateToDDMMYYYY(c.Date_of_Baptism__c)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {c.CreatedDate && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconBgCal}>
                          <Calendar size={14} color="#b45309" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Registered Since</Text>
                          <Text style={[styles.detailValue, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            {new Date(c.CreatedDate).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Global FAB ── */}
      {member && member.accountId && !loading && (
        <TouchableOpacity 
          style={styles.addBtnFloating} 
          onPress={openAddModal}
        >
          <Plus size={28} color="#1a2d5a" />
        </TouchableOpacity>
      )}

      {/* ── Success Modal ── */}
      {showSuccess && (
        <View style={styles.modalOverlayCen}>
          <View style={[styles.successModal, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.successIconCircle}>
              <UserCheck size={36} color="#15803D" />
            </View>
            <Text style={[styles.successTitle, { color: isDark ? '#fff' : '#1a2d5a' }]}>Success!</Text>
            <Text style={styles.successSub}>{successMsg}</Text>
            <TouchableOpacity 
              style={styles.successBtn} 
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Add / Edit Family Member Modal ── */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#1a2d5a' }]}>
                {editingContact ? 'Edit Member Details' : 'Add Family Member'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setEditingContact(null); }}>
                <X size={24} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput 
                  style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  placeholder="e.g. John"
                  placeholderTextColor="#94a3b8"
                  value={memberForm.firstName}
                  onChangeText={(t) => setMemberForm({...memberForm, firstName: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput 
                  style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  placeholder="e.g. Doe"
                  placeholderTextColor="#94a3b8"
                  value={memberForm.lastName}
                  onChangeText={(t) => setMemberForm({...memberForm, lastName: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <TextInput 
                  style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  placeholder="e.g. 9988776655"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={memberForm.phone}
                  onChangeText={(t) => setMemberForm({...memberForm, phone: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput 
                  style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  placeholder="e.g. john@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={memberForm.email}
                  onChangeText={(t) => setMemberForm({...memberForm, email: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relation *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, { borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  onPress={() => setShowRelationPicker(true)}
                >
                  <Text style={{ color: isDark ? '#fff' : '#1a2d5a', fontSize: 16, fontWeight: '600' }}>
                    {memberForm.relation || 'Select Relation'}
                  </Text>
                  <ChevronDown size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.pillContainer}>
                  {['Male', 'Female'].map(gen => (
                    <TouchableOpacity 
                      key={gen}
                      style={[styles.pill, memberForm.gender === gen && styles.pillActive]}
                      onPress={() => setMemberForm({...memberForm, gender: gen})}
                    >
                      <Text style={[styles.pillText, memberForm.gender === gen && styles.pillTextActive]}>{gen}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Birthdate</Text>
                <TouchableOpacity 
                  style={[styles.input, styles.dateInput, { borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  onPress={() => setDatePickerType('birthdate')}
                >
                  <Text style={{ color: memberForm.birthdate ? (isDark ? '#fff' : '#000') : '#94a3b8' }}>
                    {memberForm.birthdate || 'Select Birthdate'}
                  </Text>
                  <CalendarIcon size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {SPOUSE_RELATIONS.includes(memberForm.relation) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Wedding Anniversary Date</Text>
                  <TouchableOpacity 
                    style={[styles.input, styles.dateInput, { borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                    onPress={() => setDatePickerType('anniversary')}
                  >
                    <Text style={{ color: memberForm.anniversaryDate ? (isDark ? '#fff' : '#000') : '#94a3b8' }}>
                      {memberForm.anniversaryDate || 'Select Wedding Anniversary Date'}
                    </Text>
                    <CalendarIcon size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Baptism Date</Text>
                <TouchableOpacity 
                  style={[styles.input, styles.dateInput, { borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
                  onPress={() => setDatePickerType('baptism')}
                >
                  <Text style={{ color: memberForm.baptismDate ? (isDark ? '#fff' : '#000') : '#94a3b8' }}>
                    {memberForm.baptismDate || 'Select Baptism Date'}
                  </Text>
                  <CalendarIcon size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSaveMember}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#1a2d5a" />
                ) : (
                  <Text style={styles.submitBtnTxt}>{editingContact ? 'Save Changes' : 'Add Member'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Relation Picker Modal ── */}
      <Modal
        visible={showRelationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelationPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRelationPicker(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: isDark ? '#fff' : '#1a2d5a' }]}>Select Relation</Text>
              <TouchableOpacity onPress={() => setShowRelationPicker(false)}>
                <X size={22} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {RELATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.pickerOption,
                    memberForm.relation === option && styles.pickerOptionActive,
                    { borderColor: isDark ? '#334155' : '#f1f5f9' }
                  ]}
                  onPress={() => {
                    setMemberForm({ ...memberForm, relation: option });
                    setShowRelationPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionTxt,
                    memberForm.relation === option && styles.pickerOptionTxtActive,
                    { color: isDark && memberForm.relation !== option ? '#cbd5e1' : undefined }
                  ]}>
                    {option}
                  </Text>
                  {memberForm.relation === option && (
                    <View style={styles.pickerCheck}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerModal
        isVisible={datePickerType !== null}
        mode="date"
        onConfirm={(date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formatted = `${day}-${month}-${year}`;
          if (datePickerType === 'birthdate') {
            setMemberForm({ ...memberForm, birthdate: formatted });
          } else if (datePickerType === 'anniversary') {
            setMemberForm({ ...memberForm, anniversaryDate: formatted });
          } else if (datePickerType === 'baptism') {
            setMemberForm({ ...memberForm, baptismDate: formatted });
          }
          setDatePickerType(null);
        }}
        onCancel={() => setDatePickerType(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    width: '100%',
    position: 'relative'
  },
  headerShadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#1a2d5a', 
  },
  gradientBorderContainer: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 25,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 33,
    borderBottomRightRadius: 33,
    overflow: 'hidden'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backBtn: { padding: 4, marginRight: 12 },
  headerCenter: { 
    position: 'absolute',
    left: 0, 
    right: 0,
    bottom: 15,
    alignItems: 'center',
    zIndex: -1 
  },
  headerRight: { width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerSubTe: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 14, fontWeight: '600', marginTop: 12 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  scroll: { padding: 16, paddingBottom: 40 },
  memberCard: { 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#64748b', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16
  },
  avatarCircleActive: {
    backgroundColor: '#1a2d5a',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  memberMeta: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '800' },
  selfBadge: { 
    backgroundColor: '#FCD34D', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6, 
    marginLeft: 8 
  },
  selfBadgeTxt: { color: '#1a2d5a', fontSize: 10, fontWeight: '800' },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6
  },
  roleBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
  },
  roleBadgeTxt: { color: '#1e40af', fontSize: 11, fontWeight: '700' },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  editCardBtnTxt: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  
  cardDivider: { height: 1, marginVertical: 14 },
  
  cardDetails: { gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  iconBgPhone: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconBgMail: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconBgCal: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  
  addBtnFloating: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  
  modalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalOverlayCen: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  successModal: { backgroundColor: '#fff', borderRadius: 24, padding: 30, width: '80%', alignItems: 'center' },
  successIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 25 },
  successBtn: { backgroundColor: '#FCD34D', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 24, width: '100%', alignItems: 'center' },
  successBtnTxt: { color: '#1a2d5a', fontSize: 16, fontWeight: '800' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pillContainer: { flexDirection: 'row', gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc'
  },
  pillActive: {
    backgroundColor: '#1a2d5a',
    borderColor: '#1a2d5a'
  },
  pillText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  pillTextActive: { color: '#FCD34D' },
  
  submitBtn: {
    backgroundColor: '#FCD34D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  submitBtnTxt: { color: '#1a2d5a', fontSize: 16, fontWeight: '800' },

  // Relation Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%'
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  pickerTitle: { fontSize: 18, fontWeight: '800' },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  pickerOptionActive: {
    backgroundColor: '#1a2d5a',
    borderColor: '#1a2d5a'
  },
  pickerOptionTxt: { fontSize: 15, fontWeight: '600', color: '#334155' },
  pickerOptionTxtActive: { color: '#FCD34D', fontWeight: '700' },
  pickerCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
