import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { db } from '../../../services/firebaseConfig';
import AdminDonationsDashboard from './AdminDonationsDashboard';
import AdminDonationsList from './AdminDonationsList';
import AdminDonationsDetails from './AdminDonationsDetails';
import AdminDonationsForm from './AdminDonationsForm';
import AdminDonationsGive from './AdminDonationsGive';
import { COLORS } from './AdminDonationsUtils';

export default function AdminDonationsMain() {
  // Trigger rebuild
  const [activeTab, setActiveTab] = useState('dashboard');
  const [donations, setDonations] = useState<any[]>([]);
  const [onlineDonations, setOnlineDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for passing data between screens
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [editDonation, setEditDonation] = useState<any>(null);

  useEffect(() => {
    // Listen to real-time updates from Firestore
    const unsubscribe = db.collection('ledger_donations')
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        const fetched = snapshot.docs.map(doc => {
          // Auto-delete the corrupt test records we made earlier
          if (doc.id.includes('${')) {
            db.collection('ledger_donations').doc(doc.id).delete();
            return null;
          }
          return {
            id: doc.id,
            ...doc.data()
          };
        }).filter(Boolean);
        setDonations(fetched);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching donations:", error);
        setLoading(false);
      });

    const unsubscribeOnline = db.collection('church_donations')
      .onSnapshot((snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOnlineDonations(fetched);
      });

    return () => {
      unsubscribe();
      unsubscribeOnline();
    };
  }, []);

  const allDonations = [...donations, ...onlineDonations.filter(d => d.status === 'completed')];

  const navigateTo = (tab: string, data?: any) => {
    if (tab === 'details') {
      setSelectedDonation(data);
    }
    if (tab === 'create') {
      setEditDonation(data || null);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeTab === 'dashboard' && (
        <AdminDonationsDashboard 
          donations={allDonations} 
          onNavigate={navigateTo} 
        />
      )}
      {activeTab === 'list' && (
        <AdminDonationsList 
          donations={donations} 
          onNavigate={navigateTo} 
        />
      )}
      {activeTab === 'details' && selectedDonation && (
        <AdminDonationsDetails 
          donation={selectedDonation} 
          onNavigate={navigateTo} 
        />
      )}
      {activeTab === 'create' && (
        <AdminDonationsForm 
          editData={editDonation}
          onNavigate={navigateTo} 
        />
      )}
      {activeTab === 'give' && (
        <AdminDonationsGive 
          onNavigate={navigateTo} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  }
});
