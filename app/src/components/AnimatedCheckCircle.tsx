import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedCheckCircleProps {
  size?: number;
  color?: string;
  style?: any;
  animate?: boolean;
}

export default function AnimatedCheckCircle({ size = 24, color = '#fff', style, animate = true }: AnimatedCheckCircleProps) {
  // Use a one-time animation sequence to draw the circle, then tick.
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.sequence([
        // Delay before starting
        Animated.delay(200),
        // Draw circle
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Draw checkmark
        Animated.timing(progressAnim, {
          toValue: 2,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animate, progressAnim]);

  // Circle path length approximation (2 * pi * r) where r = 10 -> ~62.83
  const CIRCLE_LENGTH = 63;
  // Tick path length approx -> ~26
  const TICK_LENGTH = 26;

  const circleStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [CIRCLE_LENGTH, 0, 0],
    extrapolate: 'clamp',
  });

  const tickStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [TICK_LENGTH, TICK_LENGTH, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 26 26" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ translateX: -1 }, { translateY: -1 }] }}>
        <AnimatedCircle 
          cx="13" 
          cy="13" 
          r="10" 
          strokeDasharray={CIRCLE_LENGTH}
          strokeDashoffset={circleStrokeDashoffset}
        />
        <AnimatedPath 
          d="M7 14l4 4 14-14" 
          strokeDasharray={TICK_LENGTH}
          strokeDashoffset={tickStrokeDashoffset}
          strokeWidth="3"
        />
      </Svg>
    </Animated.View>
  );
}
