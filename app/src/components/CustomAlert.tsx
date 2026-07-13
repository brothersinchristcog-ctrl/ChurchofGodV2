import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, typography, shadow } from '../theme/Theme';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: AlertButton[];
  onClose?: () => void;
}

export const CustomAlert = ({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onClose
}: CustomAlertProps) => {

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <Ionicons name="checkmark-circle" size={56} color={colors.primary} />;
      case 'error': return <Ionicons name="close-circle" size={56} color={colors.error} />;
      case 'warning': return <Ionicons name="warning" size={56} color={colors.warning} />;
      default: return <Ionicons name="information-circle" size={56} color={colors.primary} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'success': return colors.primary;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.primary;
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
          
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>

          <Text style={[styles.title, { color: getHeaderColor() }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons && buttons.length > 0 ? (
              buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    btn.style === 'cancel' && styles.buttonCancel,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    buttons.length === 2 && styles.buttonHalf
                  ]}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    if (onClose && !btn.onPress) onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.buttonText,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                    btn.style === 'destructive' && styles.buttonTextDestructive
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  },
  alertBox: {
    width: width - spacing.xl * 2,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: spacing.md,
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 100,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800'
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    fontSize: 15
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: spacing.md
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 100, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonHalf: {
    flex: 1
  },
  buttonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0
  },
  buttonDestructive: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  buttonTextCancel: {
    color: colors.textPrimary
  },
  buttonTextDestructive: {
    color: '#FFFFFF'
  }
});
