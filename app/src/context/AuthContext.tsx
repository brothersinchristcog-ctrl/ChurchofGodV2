import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SalesforceMember } from '../services/SalesforceService';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  member: SalesforceMember | null;
  loading: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  setMember: (member: SalesforceMember | null) => void;
  viewMode: 'admin' | 'member';
  setViewMode: (mode: 'admin' | 'member') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import SalesforceService from '../services/SalesforceService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [member, setMember] = useState<SalesforceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('member');

  const updateMember = (newMember: SalesforceMember | null) => {
    setMember(newMember);
  };

  useEffect(() => {
    // Attempt to load cached member instantly on boot
    const loadCachedMember = async () => {
      try {
        const cachedStr = await AsyncStorage.getItem('@cached_member');
        if (cachedStr) {
          const cachedMember = JSON.parse(cachedStr);
          console.log('👤 [Auth] Loaded cached member:', cachedMember.name);
          setMember(cachedMember);
        }
      } catch (e) {
        // Ignore cache errors
      }
    };
    loadCachedMember();

    // Handle user state changes
    const subscriber = auth().onAuthStateChanged(async (userState) => {
      setUser(userState);
      
      if (userState && !userState.isAnonymous) {
        try {
          const phone = userState.phoneNumber;
          console.log('🔐 [Auth] User Logged In:', phone);
          if (phone) {
            // ── Race Salesforce check against an 8-second timeout ──
            // This prevents the app from getting stuck if the network is slow
            const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
            const sfCheck = SalesforceService.checkContactExists(phone, userState.uid);
            
            const check = await Promise.race([sfCheck, timeout]);
            
            if (check?.exists && check.member) {
              console.log('👤 [Auth] Member Profile Loaded:', check.member.name);
              setMember(check.member);
              AsyncStorage.setItem('@cached_member', JSON.stringify(check.member));

              // Ensure Salesforce is synced with the Firebase UID (catches Android auto-verify cases)
              if (check.member.id) {
                SalesforceService.syncMember(check.member.id, userState.uid).catch(() => {});
                
                // Save profile details to Firestore for Push Notifications
                const firestore = require('@react-native-firebase/firestore').default;
                const ut = check.member.userType?.toLowerCase() || '';
                const isAdmin = ut === 'admin' || ut === 'pastor' || ut === 'system administrator' || ut.includes('admin') || ut.includes('pastor');
                
                firestore().collection('users').doc(userState.uid).set({
                  name: check.member.name || '',
                  phone: phone || '',
                  role: isAdmin ? 'Admin' : 'Member',
                  onboardingComplete: true
                }, { merge: true }).catch(() => {});
              }
            } else if (check === null) {
              console.warn('⚠️ [Auth] Salesforce check timed out — proceeding without profile.');
            }
          }
        } catch (err) {
          console.error('❌ [Auth] Salesforce Profile Fetch Failed:', err);
          // Silently continue — app still works without Salesforce profile
        }
      } else {
        setMember(null);
        AsyncStorage.removeItem('@cached_member');
      }
      
      // Always clear loading — never block the user
      setLoading(false);
    });
    return subscriber; 
  }, []);

  const signInAnonymously = async () => {
    try {
      await auth().signInAnonymously();
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear FCM Token before logging out
      if (user) {
        try {
          const firestore = require('@react-native-firebase/firestore').default;
          await firestore().collection('users').doc(user.uid).update({ fcmToken: null });
        } catch (e) {
          console.warn('Failed to clear FCM token on sign out', e);
        }
      }
      
      await AsyncStorage.removeItem('@cached_member');
      await auth().signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, member, loading, signInAnonymously, signOut, setMember, viewMode, setViewMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
