import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Image,
  Switch,
  InteractionManager
} from 'react-native';
import Svg, { Line, Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { 
  Star,
  MapPin,
  Calendar,
  ChevronRight, 
  LogOut, 
  User, 
  Bell, 
  Moon, 
  Heart, 
  CreditCard,
  Globe,
  Check,
  X,
  DollarSign,
  Info,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Crown
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SalesforceService, { SalesforceMember } from '../services/SalesforceService';
import SecurityService from '../services/SecurityService';
import * as ImagePicker from 'expo-image-picker';
import { Lock, Shield } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type CustomAlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'success' | 'error';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
};

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut, viewMode, setViewMode } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const [member, setMember] = useState<SalesforceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isNotifyModalVisible, setIsNotifyModalVisible] = useState(false);
  const [showGivePopup, setShowGivePopup] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Telugu');
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  
  // Notification States
  const [dailyPromiseNotify, setDailyPromiseNotify] = useState(true);
  const [newSermonNotify, setNewSermonNotify] = useState(true);
  const [eventReminderNotify, setEventReminderNotify] = useState(true);
  const [prayerNotify, setPrayerNotify] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mailingCity: '',
    mailingStreet: '',
    mailingState: ''
  });
  const [updating, setUpdating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showAlert = (config: Omit<CustomAlertConfig, 'visible'>) => setAlertConfig({ ...config, visible: true });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const userTypeStr = member?.userType?.toLowerCase() || '';
  const isActualAdmin = userTypeStr === 'admin' || 
                        userTypeStr === 'pastor' || 
                        userTypeStr === 'system administrator' || 
                        userTypeStr.includes('admin') || 
                        userTypeStr.includes('pastor');

  const fetchProfileData = async () => {
    try {
      if (user?.phoneNumber) {
        const contactCheck = await SalesforceService.checkContactExists(user.phoneNumber);
        if (contactCheck?.exists && contactCheck.member) {
          setMember(contactCheck.member);
          setEditForm({
            firstName: contactCheck.member.firstName || '',
            lastName: contactCheck.member.lastName || '',
            email: contactCheck.member.email || '',
            mailingCity: contactCheck.member.mailingCity || '',
            mailingStreet: contactCheck.member.mailingStreet || '',
            mailingState: contactCheck.member.mailingState || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!member) return;
    setUpdating(true);
    try {
      await SalesforceService.updateMemberProfile(member.id, editForm);
      showAlert({
        title: 'Profile Saved', 
        message: 'Your personal details (Name, Email, and Address) have been updated directly in your church record in Salesforce.',
        type: 'success'
      });
      setIsEditModalVisible(false);
      fetchProfileData();
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      
      showAlert({
        title: 'Confirm Photo',
        message: 'Do you want to set this cropped image as your profile photo?',
        type: 'confirm',
        confirmText: 'OK',
        cancelText: 'CANCEL',
        onConfirm: async () => {
          try {
            setUpdating(true);
            setLocalPhotoUrl(selectedUri);
            if (user) {
              await user.updateProfile({ photoURL: selectedUri });
              showAlert({ title: 'Success', message: 'Profile photo updated successfully!', type: 'success' });
            }
          } catch (error: any) {
            showAlert({ title: 'Error', message: 'Failed to update photo: ' + error.message, type: 'error' });
          } finally {
            setUpdating(false);
          }
        },
        onCancel: () => closeAlert()
      });
    }
  };

  const handleRemovePhoto = async () => {
    showAlert({
      title: 'Remove Photo',
      message: 'Are you sure you want to remove your profile photo?',
      type: 'confirm',
      confirmText: 'REMOVE',
      cancelText: 'CANCEL',
      onConfirm: async () => {
        try {
          setUpdating(true);
          setLocalPhotoUrl(null);
          if (user) {
            await user.updateProfile({ photoURL: '' });
            showAlert({ title: 'Success', message: 'Profile photo removed successfully.', type: 'success' });
          }
        } catch (error: any) {
          showAlert({ title: 'Error', message: 'Failed to remove photo: ' + error.message, type: 'error' });
        } finally {
          setUpdating(false);
        }
      },
      onCancel: () => closeAlert()
    });
  };

  useEffect(() => {
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      setLocalPhotoUrl(user?.photoURL || null);
      fetchProfileData();
      checkBiometrics();
    });
    return () => interactionPromise.cancel();
  }, [user]);

  const checkBiometrics = async () => {
    const available = await SecurityService.isBiometricAvailable();
    const enabled = await SecurityService.isBiometricEnabled();
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
  };

  const toggleBiometrics = async (val: boolean) => {
    if (val) {
      const success = await SecurityService.authenticate();
      if (success) {
        await SecurityService.setBiometricPreference(true);
        setBiometricEnabled(true);
      } else {
        setBiometricEnabled(false);
      }
    } else {
      await SecurityService.setBiometricPreference(false);
      setBiometricEnabled(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#1a2d5a' }]}>
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a192f" />
      
      <View style={styles.heroSectionWrapper}>
        <View style={styles.heroShadowWrapper}>
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

            <View style={styles.heroSection}>
              <Svg height="800" width="800" style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
              <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#1a2d5a" stopOpacity="1" />
                <Stop offset="1" stopColor="#0a192f" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bgGrad)" />
            <Path d="M -50 200 Q 150 100 450 250" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
            <Path d="M 0 50 Q 250 150 400 50" stroke="rgba(255,255,255,0.02)" strokeWidth="1" fill="none" />
          </Svg>

          <View style={[styles.headerTop, { zIndex: 10 }]}>
            <View style={{ width: 40 }} />
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
               <Text style={{fontSize: 12, marginRight: 4}}>{isDark ? '🌙' : '☀️'}</Text>
               <Text style={styles.themeToggleText}>{isDark ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileMainRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarInner}>
                {localPhotoUrl ? (
                  <Image source={{ uri: localPhotoUrl }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarCircle}>
                     <Text style={styles.avatarText}>{getInitials(member?.name || user?.displayName || 'User')}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeSubText}>Welcome back,</Text>
              <Text style={styles.welcomeTitleText}>{member?.name || user?.displayName || 'Beloved Member'}</Text>
              <View style={styles.sinceBadge}>
                <Text style={styles.sinceMemberText}>Member since {member?.joinDate ? new Date(member.joinDate).getFullYear().toString() : '2024'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBoxWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.infoBox}>
              <View style={styles.infoItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#3b82f6' }]}>
                  <MapPin size={16} color="#fff" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoItemTitle}>Village</Text>
                  <Text style={styles.infoItemValue}>{member?.mailingCity || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
                  <Globe size={16} color="#fff" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoItemTitle}>Language</Text>
                  <Text style={styles.infoItemValue}>Telugu</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#8b5cf6' }]}>
                  <Crown size={16} color="#fff" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoItemTitle}>Role</Text>
                  <Text style={styles.infoItemValue}>{member?.userType === 'Admin' ? 'ADMIN' : 'MEMBER'}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
        </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" />}
      >
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <MenuItem 
            icon={<User size={20} color="#1a2d5a" />} 
            iconBg="#eff6ff"
            title="My profile" 
            sub="Edit name, photo, address" 
            onPress={() => setIsEditModalVisible(true)}
          />
          <MenuItem 
            icon={<CreditCard size={20} color="#c0392b" />} 
            iconBg="#fff1f2"
            title="Giving history" 
            sub="Receipts & statements" 
            onPress={() => setShowGivePopup(true)}
          />
          <MenuItem 
            icon={<Heart size={20} color="#7c3aed" />} 
            iconBg="#f5f3ff"
            title="My prayer requests" 
            sub="View & manage your requests" 
            isLast 
            onPress={() => {
              navigation.navigate('PrayerWall');
            }}
          />
        </View>

        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={styles.menuGroup}>
          <MenuItem 
            icon={<Bell size={20} color="#1a2d5a" />} 
            iconBg="#eff6ff"
            title="Notifications" 
            sub="Manage your preferences" 
            onPress={() => {
              setIsLanguageModalVisible(false);
              setIsNotifyModalVisible(true);
            }}
          />
          <MenuItem 
            icon={<Globe size={20} color="#166534" />} 
            iconBg="#f0fdf4"
            title="Language" 
            sub={`${selectedLanguage} (selected)`} 
            onPress={() => {
              setIsNotifyModalVisible(false);
              setIsLanguageModalVisible(true);
            }}
          />
          <MenuItem 
            icon={<Moon size={20} color="#d97706" />} 
            iconBg="#fffbeb"
            title="Dark mode" 
            sub={`Currently: ${isDark ? 'Dark' : 'Light'}`} 
            isLast 
            onPress={toggleTheme}
          />
        </View>

        {biometricAvailable && (
          <>
            <Text style={styles.sectionLabel}>SECURITY</Text>
            <View style={styles.menuGroup}>
              <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                <View style={[styles.iconBox, { backgroundColor: '#fdf2f2' }]}>
                  <Lock size={20} color="#c0392b" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Biometric Lock</Text>
                  <Text style={styles.menuSub}>Fingerprint / Face ID</Text>
                </View>
                <Switch 
                  value={biometricEnabled} 
                  onValueChange={toggleBiometrics}
                  trackColor={{ false: '#e2e8f0', true: '#1a2d5a' }}
                />
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.menuGroup}>
          <MenuItem 
            icon={<LogOut size={20} color="#c0392b" />} 
            iconBg="#fff1f2"
            title="Sign out" 
            sub="Securely exit your account" 
            isLast={!isActualAdmin} 
            onPress={signOut}
          />
          {isActualAdmin && (
            <MenuItem 
              icon={<Shield size={20} color="#1a2d5a" />} 
              iconBg="#e2e8f0"
              title="Return to Admin Portal" 
              sub="Switch back to dashboard" 
              isLast 
              onPress={() => setViewMode('admin')}
            />
          )}
        </View>

        <Text style={styles.versionTxt}>Version 1.0.0</Text>
      </ScrollView>

      {isEditModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.photoEditSection}>
                <View style={styles.modalAvatarCircle}>
                   {localPhotoUrl ? (
                     <Image source={{ uri: localPhotoUrl }} style={styles.modalAvatarImg} />
                   ) : (
                     <Text style={styles.modalAvatarText}>{getInitials(member?.name || 'U')}</Text>
                   )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </TouchableOpacity>
                  {localPhotoUrl ? (
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
                      <Text style={styles.removePhotoText}>Remove Photo</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput 
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(t) => setEditForm({...editForm, firstName: t})}
                  placeholder="First Name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput 
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(t) => setEditForm({...editForm, lastName: t})}
                  placeholder="Last Name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput 
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(t) => setEditForm({...editForm, email: t})}
                  placeholder="Email"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number (Managed by Auth)</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                  value={user?.phoneNumber || ''}
                  editable={false}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput 
                    style={styles.input}
                    value={editForm.mailingCity}
                    onChangeText={(t) => setEditForm({...editForm, mailingCity: t})}
                    placeholder="City"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput 
                    style={styles.input}
                    value={editForm.mailingState}
                    onChangeText={(t) => setEditForm({...editForm, mailingState: t})}
                    placeholder="State"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput 
                  style={styles.input}
                  value={editForm.mailingStreet}
                  onChangeText={(t) => setEditForm({...editForm, mailingStreet: t})}
                  placeholder="Street"
                  multiline
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, updating && { opacity: 0.7 }]} 
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Update My Profile</Text>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </View>
      )}

      {isLanguageModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.langList}>
              {[
                { id: 'en', name: 'English', native: 'English' },
                { id: 'te', name: 'Telugu', native: 'తెలుగు' }
              ].map((lang) => (
                <TouchableOpacity 
                  key={lang.id}
                  style={[
                    styles.langItem, 
                    selectedLanguage === lang.name && styles.langItemActive
                  ]}
                  onPress={() => {
                    setSelectedLanguage(lang.name);
                    setTimeout(() => setIsLanguageModalVisible(false), 300);
                  }}
                >
                  <View>
                    <Text style={[
                      styles.langName,
                      selectedLanguage === lang.name && styles.langTextActive
                    ]}>{lang.name}</Text>
                    <Text style={styles.langNative}>{lang.native}</Text>
                  </View>
                  {selectedLanguage === lang.name && (
                    <Check size={20} color="#1a2d5a" />
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </View>
          </View>
        </View>
      )}

      {isNotifyModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setIsNotifyModalVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifyList}>
              <View style={styles.notifyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifyName}>Daily Promise</Text>
                  <Text style={styles.notifyDesc}>Receive a blessed verse every morning</Text>
                </View>
                <Switch 
                  value={dailyPromiseNotify} 
                  onValueChange={setDailyPromiseNotify}
                  trackColor={{ false: '#e2e8f0', true: '#1a2d5a' }}
                />
              </View>

              <View style={styles.notifyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifyName}>New Sermons</Text>
                  <Text style={styles.notifyDesc}>Alert when a new video is uploaded</Text>
                </View>
                <Switch 
                  value={newSermonNotify} 
                  onValueChange={setNewSermonNotify}
                  trackColor={{ false: '#e2e8f0', true: '#1a2d5a' }}
                />
              </View>

              <View style={styles.notifyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifyName}>Event Reminders</Text>
                  <Text style={styles.notifyDesc}>Notifications for upcoming events</Text>
                </View>
                <Switch 
                  value={eventReminderNotify} 
                  onValueChange={setEventReminderNotify}
                  trackColor={{ false: '#e2e8f0', true: '#1a2d5a' }}
                />
              </View>

              <View style={styles.notifyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifyName}>Prayer Updates</Text>
                  <Text style={styles.notifyDesc}>Alerts when your prayer is answered (Do Not Disturb)</Text>
                </View>
                <Switch 
                  value={prayerNotify} 
                  onValueChange={setPrayerNotify}
                  trackColor={{ false: '#e2e8f0', true: '#1a2d5a' }}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showGivePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGivePopup(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            width: '85%', 
            backgroundColor: isDark ? '#1e293b' : '#fff', 
            borderRadius: 24, 
            padding: 24, 
            alignItems: 'center', 
            elevation: 10, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 8 
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: 'rgba(240, 165, 0, 0.15)', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <DollarSign size={32} color="#f0a500" />
            </View>
            <Text style={{ 
              fontSize: 22, 
              fontWeight: '700', 
              color: isDark ? '#f8fafc' : '#0f172a', 
              marginBottom: 8, 
              textAlign: 'center' 
            }}>
              Giving History
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: isDark ? '#94a3b8' : '#475569', 
              textAlign: 'center', 
              marginBottom: 24, 
              lineHeight: 24 
            }}>
              This feature will be available soon!
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#1a2d5a',
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 100,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowGivePopup(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

function MenuItem({ icon, iconBg, title, sub, isLast, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heroSectionWrapper: {
    backgroundColor: 'transparent',
    paddingBottom: 20,
    width: '100%',
    position: 'relative'
  },
  heroShadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    backgroundColor: '#0a192f', 
  },
  gradientBorderContainer: {
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  heroSection: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 40,
    marginBottom: 4,
    backgroundColor: '#0a192f',
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: 'hidden'
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  themeToggle: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  themeToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 35
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 20
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ffffff30'
  },
  avatarCircle: { 
    width: '100%', height: '100%', backgroundColor: '#c0392b', 
    justifyContent: 'center', alignItems: 'center'
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 43 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },

  welcomeTextContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  welcomeSubText: {
    color: '#a78bfa',
    fontSize: 24,
    marginBottom: -2,
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
    fontStyle: 'italic',
    fontWeight: '700'
  },
  welcomeTitleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28
  },
  sinceBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sinceMemberText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600'
  },
  infoBoxWrapper: {
    marginHorizontal: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)', 
    borderWidth: 0,
    borderColor: '#94a3b8' // Light ash color
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    flex: 1
  },
  infoTextWrapper: {
    justifyContent: 'center',
    flexShrink: 1
  },
  infoItemTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2
  },
  infoItemValue: {
    color: '#94a3b8',
    fontSize: 11
  },
  infoDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#94a3b8',
    marginHorizontal: 4
  },

  scrollContent: { paddingBottom: 150 },

  // Menu List
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginHorizontal: 25, marginTop: 25, marginBottom: 12 },
  menuGroup: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  menuSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  // Modal
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
    zIndex: 1000 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    height: '85%',
    padding: 24, 
    zIndex: 1001,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10
  },
  bottomSheetContent: {
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 24, 
    paddingBottom: 120, // Keep this high to clear the tab bar
    zIndex: 1001,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a2d5a' },
  closeText: { color: '#ef4444', fontWeight: '700' },
  modalScroll: { flex: 1 },
  
  photoEditSection: { alignItems: 'center', marginBottom: 30, backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  modalAvatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  modalAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  changePhotoBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1a2d5a' },
  changePhotoText: { color: '#1a2d5a', fontSize: 12, fontWeight: '700' },
  removePhotoBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ef4444' },
  removePhotoText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  inputGroup: { marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    borderRadius: 15, 
    padding: 15, 
    fontSize: 15, 
    color: '#1e293b' 
  },
  saveBtn: { 
    backgroundColor: '#1a2d5a', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 10,
    marginBottom: 40,
    elevation: 4,
    shadowColor: '#1a2d5a',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  versionTxt: { textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 40 },

  // Language Modal
  langList: { gap: 12 },
  langItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 18, 
    borderRadius: 15, 
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0'
  },
  langItemActive: { 
    backgroundColor: '#eff6ff', 
    borderColor: '#1a2d5a' 
  },
  langName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  langTextActive: { color: '#1a2d5a' },
  langNative: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Notification Modal
  notifyList: { gap: 16 },
  notifyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 8 
  },
  notifyName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  notifyDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },

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
