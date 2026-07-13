import React, { useRef, useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, LayoutChangeEvent, Platform, Animated, Dimensions } from 'react-native';
import { Home, BookOpen, Mic, Heart, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'Home',    label: 'Home',    Icon: Home,     bg: '#1a2d5a', fg: '#1a2d5a' },
  { key: 'Promise', label: 'Promise', Icon: BookOpen, bg: '#0F766E', fg: '#0F766E' },
  { key: 'Sermons', label: 'Sermons', Icon: Mic,      bg: '#D8632E', fg: '#D8632E' },
  { key: 'Prayer',  label: 'Prayer',  Icon: Heart,    bg: '#0284C7', fg: '#0284C7' },
  { key: 'Profile', label: 'Profile', Icon: User,     bg: '#27272A', fg: '#27272A' },
] as const;

const INACTIVE_COLOR = 'rgba(255,255,255,0.7)';
type Layout = { x: number; width: number };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const getFallbackLayout = (index: number) => {
  const trackWidth = SCREEN_WIDTH - 40; // wrapper padding 20 * 2
  const availableWidth = trackWidth - 16; // track padding 8 * 2
  const tabWidth = availableWidth / TABS.length;
  return { x: 8 + index * tabWidth, width: tabWidth };
};

export default function PillNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  
  // React Native standard Animated values
  const pillX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  const colorProgress = useRef(new Animated.Value(0)).current;

  // Track if initial layout is done
  const [isInitialized, setIsInitialized] = useState(false);

  const handleTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  useEffect(() => {
    const layout = layouts[state.index] || getFallbackLayout(state.index);
    if (layout) {
      if (!isInitialized) {
        // First render, jump immediately without animation
        pillX.setValue(layout.x);
        pillWidth.setValue(layout.width);
        colorProgress.setValue(state.index);
        setIsInitialized(true);
      } else {
        // Animate to new tab
        Animated.parallel([
          Animated.spring(pillX, {
            toValue: layout.x,
            useNativeDriver: false,
            friction: 8,
            tension: 50,
          }),
          Animated.spring(pillWidth, {
            toValue: layout.width,
            useNativeDriver: false,
            friction: 8,
            tension: 50,
          }),
          Animated.timing(colorProgress, {
            toValue: state.index,
            duration: 300,
            useNativeDriver: false,
          })
        ]).start();
      }
    }
  }, [state.index, layouts]);

  const selectTab = (index: number, routeName: string) => {
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      requestAnimationFrame(() => {
        navigation.navigate(routeName);
      });
    }
  };

  // Interpolate background colors
  const bgColor = colorProgress.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map(t => t.bg),
  });

  return (
    <View style={[styles.navWrapper, { paddingBottom: Math.max(insets.bottom, 5) + 5 }]}>
      <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
        {isInitialized && (
          <Animated.View 
            style={[
              styles.pill, 
              { left: pillX, width: pillWidth }
            ]} 
          />
        )}

        {TABS.map((tab, index) => {
          const isActive = index === state.index;
          const { Icon } = tab;

          return (
            <Pressable
              key={tab.key}
              onLayout={handleTabLayout(index)}
              onPress={() => selectTab(index, tab.key)}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                size={20}
                color={isActive ? tab.fg : INACTIVE_COLOR}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[styles.label, { color: isActive ? tab.fg : INACTIVE_COLOR }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 8,
    position: 'relative',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 999,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
