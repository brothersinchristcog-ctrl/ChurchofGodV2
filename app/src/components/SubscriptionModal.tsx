import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  DeviceEventEmitter 
} from 'react-native';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionModal() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();
  const { hasAccess } = useAuth();

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener('SHOW_SUB_MODAL', () => {
      setVisible(true);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    if (hasAccess && visible) {
      setVisible(false);
      DeviceEventEmitter.emit('RESTRICTED_MODAL_DISMISSED');
    }
  }, [hasAccess, visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setVisible(false);
        DeviceEventEmitter.emit('RESTRICTED_MODAL_DISMISSED');
      }}
    >
      <View style={styles.subModalOverlay}>
        <View style={styles.subModalCard}>
          <TouchableOpacity 
            style={styles.subModalClose}
            onPress={() => {
              setVisible(false);
              DeviceEventEmitter.emit('RESTRICTED_MODAL_DISMISSED');
            }}
          >
            <X color="#fff" size={28} />
          </TouchableOpacity>

          <View style={styles.subModalIconWrapper}>
            <LinearGradient
              colors={['#f43f5e', '#a855f7']}
              style={styles.subModalIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.subModalExclamation}>!</Text>
            </LinearGradient>
          </View>

          <Text style={styles.subModalTitle}>Subscribe to{'\n'}continue.</Text>
          
          <Text style={styles.subModalBody}>
            Your free access has expired. Please subscribe to your Church of GOD membership to continue enjoying all our features and content.
          </Text>

          <TouchableOpacity 
            style={styles.subModalButton}
            onPress={() => {
              setVisible(false);
              navigation.navigate('SubscriptionScreen');
            }}
          >
            <Text style={styles.subModalButtonText}>Upgrade now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subModalCard: {
    backgroundColor: '#18181b', // very dark gray/black
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
    padding: 32,
    paddingTop: 48,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  subModalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
    zIndex: 10
  },
  subModalIconWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  subModalIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '15deg' }],
  },
  subModalExclamation: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    transform: [{ rotate: '-15deg' }],
  },
  subModalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 38,
  },
  subModalBody: {
    fontSize: 16,
    color: '#d4d4d8',
    lineHeight: 24,
    marginBottom: 32,
  },
  subModalButton: {
    backgroundColor: '#ffffff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  subModalButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  }
});
