import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme/Theme';
import { getFriendlyErrorMessage } from '../utils/errorParser';

interface ErrorBadgeProps {
  error: any;
  style?: any;
}

export const ErrorBadge = ({ error, style }: ErrorBadgeProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-10);
    }
  }, [error]);

  if (!error) return null;

  const friendly = getFriendlyErrorMessage(error);

  return (
    <Animated.View style={[
      styles.badgeContainer, 
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      style
    ]}>
      <View style={styles.iconWrapper}>
        <ShieldAlert size={18} color={colors.error} />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.title}>{friendly.title}</Text>
        <Text style={styles.message}>{friendly.message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2', // Soft red background
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#FCA5A5', // Light red border
    padding: spacing.md,
    marginVertical: spacing.sm,
    width: '100%',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B', // Dark red text
    marginBottom: 2,
  },
  message: {
    fontSize: 12.5,
    color: '#B91C1C', // Soft dark red for details
    lineHeight: 18,
    fontWeight: '500',
  },
});
