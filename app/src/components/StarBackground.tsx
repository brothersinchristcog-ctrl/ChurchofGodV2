import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const STAR_AREA_HEIGHT = 2000; // Matches the CSS top: 2000px clone

// Helper to generate stars
const generateStars = (count: number) => {
  return Array.from({ length: count }).map(() => ({
    top: Math.random() * STAR_AREA_HEIGHT,
    left: Math.random() * width,
  }));
};

const StarLayer = ({ count, size, duration }: { count: number, size: number, duration: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const stars = useMemo(() => generateStars(count), [count]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateY, {
        toValue: -STAR_AREA_HEIGHT,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [translateY, duration]);

  const renderStars = (offsetY = 0) => (
    <View style={[StyleSheet.absoluteFill, { top: offsetY }]}>
      {stars.map((star, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: star.top,
            left: star.left,
            width: size,
            height: size,
            backgroundColor: '#fff',
            borderRadius: size / 2,
            // Add slight opacity variation for realism
            opacity: Math.random() * 0.5 + 0.5,
          }}
        />
      ))}
    </View>
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }] }]}>
      {renderStars(0)}
      {renderStars(STAR_AREA_HEIGHT)}
    </Animated.View>
  );
};

export const StarBackground = () => {
  return (
    <View style={styles.container}>
      {/* Mimic radial-gradient using the app's primary navy colors */}
      <LinearGradient
        colors={['#0a162d', '#0d1e3e']} // App Navy colors
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }} // top
        end={{ x: 0.5, y: 1 }} // bottom
      />
      {/* Reduced counts slightly from raw CSS to ensure 60fps in React Native, but still dense enough */}
      <StarLayer count={300} size={1.5} duration={50000} />
      <StarLayer count={150} size={2.5} duration={100000} />
      <StarLayer count={75} size={3.5} duration={150000} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a162d',
    overflow: 'hidden',
  },
});
