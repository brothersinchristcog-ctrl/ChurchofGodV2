import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { 
  ChevronLeft, 
  ChevronDown,
  Flame, 
  BookOpen, 
  Trophy, 
} from 'lucide-react-native';
import Svg, { 
  Defs, 
  LinearGradient as SvgLinearGradient, 
  RadialGradient as SvgRadialGradient, 
  Stop, 
  Circle, 
  Path, 
  Rect, 
  G, 
  Line, 
  Text as SvgText 
} from 'react-native-svg';

import BibleQuizHomeScreen from './BibleQuizHomeScreen';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_FULL_HEIGHT = Math.max(SCREEN_HEIGHT, Dimensions.get('screen').height);

// 10-second countdown configuration for butter-smooth continuous ring reduction
const COUNTDOWN_TOTAL_SECONDS = 10;
const COUNTDOWN_RADIUS = 10.5;
const COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RADIUS;

// Proportional page dimensions for crisp, perfectly centered Genesis scripture display
const PAGE_WIDTH = 120;
const PAGE_HEIGHT = 168;

// Original Classic Magnifying Glass with authentic brass bezel, optical glass lens, and polished wood handle
const OriginalMagnifyingGlassSvg = ({ size = 76 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Defs>
      {/* Polished Brass/Gold Bezel */}
      <SvgLinearGradient id="brassBezel" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="30%" stopColor="#f59e0b" />
        <Stop offset="70%" stopColor="#d97706" />
        <Stop offset="100%" stopColor="#78350f" />
      </SvgLinearGradient>

      {/* Inner Metallic Bevel */}
      <SvgLinearGradient id="innerBevel" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
        <Stop offset="50%" stopColor="#cbd5e1" stopOpacity={0.5} />
        <Stop offset="100%" stopColor="#475569" stopOpacity={0.8} />
      </SvgLinearGradient>

      {/* Classic Rosewood / Walnut Handle */}
      <SvgLinearGradient id="woodHandle" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="#2e1005" />
        <Stop offset="35%" stopColor="#5c260c" />
        <Stop offset="65%" stopColor="#78350f" />
        <Stop offset="100%" stopColor="#270e04" />
      </SvgLinearGradient>

      {/* Handle Highlight Strip */}
      <SvgLinearGradient id="handleShine" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
        <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.4} />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
      </SvgLinearGradient>

      {/* Optical Crystal Lens Gradient */}
      <SvgLinearGradient id="opticalGlass" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
        <Stop offset="35%" stopColor="#bae6fd" stopOpacity={0.18} />
        <Stop offset="75%" stopColor="#38bdf8" stopOpacity={0.08} />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.25} />
      </SvgLinearGradient>
    </Defs>

    {/* Drop Shadow underneath the entire magnifying glass */}
    <G opacity={0.32}>
      <Circle cx="39" cy="41" r="23" fill="#000000" />
      <Rect x="52" y="52" width="10" height="34" rx="4" transform="rotate(-45, 52, 52)" fill="#000000" />
    </G>

    {/* Group rotated -45 deg around (50, 50) so lens is top-left and handle points down-right */}
    <G transform="rotate(-45, 50, 50)">
      {/* Brass Pommel Cap at Bottom of Handle */}
      <Circle cx="50" cy="89" r="4.5" fill="url(#brassBezel)" stroke="#78350f" strokeWidth="0.8" />

      {/* Classic Polished Wooden Handle */}
      <Rect x="45.5" y="61" width="9" height="27" rx="4" fill="url(#woodHandle)" stroke="#1c0a03" strokeWidth="0.8" />
      <Rect x="48.5" y="62" width="2" height="24" rx="1" fill="url(#handleShine)" />

      {/* Solid Brass Ferrule (Connecting Collar) */}
      <Rect x="46.5" y="55" width="7" height="6.5" rx="1.5" fill="url(#brassBezel)" stroke="#78350f" strokeWidth="0.8" />
      <Line x1="47" y1="58" x2="53" y2="58" stroke="#fef08a" strokeWidth="0.75" />

      {/* Outer Metallic Brass Rim */}
      <Circle cx="50" cy="33" r="23.5" stroke="url(#brassBezel)" strokeWidth="4.5" fill="none" />
      <Circle cx="50" cy="33" r="21.5" stroke="url(#innerBevel)" strokeWidth="1" fill="none" />

      {/* Clear Optical Glass Lens */}
      <Circle cx="50" cy="33" r="21" fill="url(#opticalGlass)" />

      {/* Lens Reflection Glare (Original Classic Curved Glint) */}
      <Path 
        d="M 37 27 C 39 19 46 15 55 15" 
        stroke="#ffffff" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        opacity={0.8} 
      />
      <Circle cx="60" cy="18" r="1.5" fill="#ffffff" opacity={0.85} />
    </G>
  </Svg>
);

// Center Fold Satin Bookmark Ribbon SVG with authentic V-notch tail
const CenterFoldRibbonSvg = ({ height = PAGE_HEIGHT + 18 }: { height?: number }) => (
  <Svg width={8} height={height} viewBox={`0 0 8 ${height}`} fill="none">
    <Defs>
      <SvgLinearGradient id="centerRibbonGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="#991b1b" />
        <Stop offset="30%" stopColor="#dc2626" />
        <Stop offset="70%" stopColor="#ef4444" />
        <Stop offset="100%" stopColor="#7f1d1d" />
      </SvgLinearGradient>
    </Defs>
    {/* Satin ribbon body with classic chevron / V-notch cut at the bottom */}
    <Path
      d={`M 0 0 L 8 0 L 8 ${height} L 4 ${height - 7} L 0 ${height} Z`}
      fill="url(#centerRibbonGrad)"
    />
    {/* Delicate center highlight sheen */}
    <Line x1="4" y1="0" x2="4" y2={height - 7} stroke="#fca5a5" strokeWidth="0.6" opacity={0.65} />
  </Svg>
);

// Small Card with Down Arrow (Displayed in center as the splash screen rolls down)
const DownArrowSmallCard = ({ arrowBounce }: { arrowBounce: Animated.Value }) => (
  <View style={styles.downArrowCard}>
    <Animated.View style={{ transform: [{ translateY: arrowBounce }] }}>
      <ChevronDown size={22} color="#f59e0b" strokeWidth={2.8} />
    </Animated.View>
  </View>
);

export default function BibleQuizSplashScreen() {
  const navigation = useNavigation<any>();
  const hasNavigated = useRef<boolean>(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 10-second countdown state (10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0)
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_TOTAL_SECONDS);

  // Continuous smooth ring draining animation (0 = full ring, 1 = completely empty)
  const countdownProgress = useRef(new Animated.Value(0)).current;

  // 3-second natural roll up animation (0 = covering screen, 1 = rolled off top)
  const rollAnim = useRef(new Animated.Value(0)).current;
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isRollingDone, setIsRollingDone] = useState<boolean>(false);

  // Entrance & Ambient Animations
  const screenFade = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(20)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  // Micro bounce animation for down arrow inside small card when rolling down
  const arrowBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowBounce, {
          toValue: 3.5,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(arrowBounce, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [arrowBounce]);

  // Continuous Smooth Book Opening Animation (0 = closed, 1 = fully open)
  const bookOpenAnim = useRef(new Animated.Value(0)).current;
  const magnifyEntrance = useRef(new Animated.Value(0)).current;
  const magnifySearch = useRef(new Animated.Value(0)).current;

  const [isOpenFinished, setIsOpenFinished] = useState<boolean>(false);

  // Trigger the natural 3-second roll to reveal the Quiz Home Screen
  const proceedToQuiz = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    countdownProgress.stopAnimation();

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    setIsRolling(true);

    // Natural 3-second roll up complete (3000ms) with smooth physical momentum
    Animated.timing(rollAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      setIsRollingDone(true);
      navigation.replace('BibleQuizHome');
    });
  }, [countdownProgress, navigation, rollAnim]);

  // Handle hardware back press cleanly
  useEffect(() => {
    const onBackPress = () => {
      countdownProgress.stopAnimation();
      rollAnim.stopAnimation();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      hasNavigated.current = true;
      navigation.goBack();
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [countdownProgress, rollAnim, navigation]);

  // Continuous smooth magnifying glass search loop over the open Genesis pages
  const startMagnifySearchLoop = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(magnifySearch, {
          toValue: -1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(magnifySearch, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(magnifySearch, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [magnifySearch]);

  // Open the FIRST displayed Holy Bible smoothly after strictly 2 seconds
  const triggerBookOpen = useCallback(() => {
    bookOpenAnim.setValue(0);
    magnifyEntrance.setValue(0);
    magnifySearch.setValue(0);
    setIsOpenFinished(false);

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }

    // Strictly 2 seconds (2000ms) after splash screen opens
    openTimerRef.current = setTimeout(() => {
      // Butter-smooth, continuous opening over 1800ms
      Animated.timing(bookOpenAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsOpenFinished(true);

        // After book opens smoothly, bring in the original magnifying glass
        Animated.spring(magnifyEntrance, {
          toValue: 1,
          friction: 6,
          tension: 35,
          useNativeDriver: true,
        }).start(() => {
          startMagnifySearchLoop();
        });
      });
    }, 2000);
  }, [bookOpenAnim, magnifyEntrance, magnifySearch, startMagnifySearchLoop]);

  useEffect(() => {
    // 1. Screen entrance
    Animated.parallel([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(badgeSlide, {
        toValue: 0,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Trigger the 2-second book open sequence
    triggerBookOpen();

    // 3. Continuously and smoothly drain the circular progress ring over 10 seconds (zero jumping)
    countdownProgress.setValue(0);
    Animated.timing(countdownProgress, {
      toValue: 1,
      duration: COUNTDOWN_TOTAL_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // 4. 1-second interval to count down the displayed seconds: 10, 9, 8, 7, ... 0
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          proceedToQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      countdownProgress.stopAnimation();
      rollAnim.stopAnimation();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, [screenFade, textFade, badgeSlide, triggerBookOpen, proceedToQuiz, countdownProgress, rollAnim]);

  // Stage alignment: glides from closed book center (-PAGE_WIDTH * 0.5) to open book center (0)
  const stageTranslateX = bookOpenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-PAGE_WIDTH * 0.5, 0],
  });

  // PHASE 1: Front Cover swings open smoothly towards the center spine (0.0 -> 0.48)
  const coverScaleX = bookOpenAnim.interpolate({
    inputRange: [0, 0.48, 1],
    outputRange: [1, 0, 0],
  });

  const coverTranslateX = bookOpenAnim.interpolate({
    inputRange: [0, 0.48, 1],
    outputRange: [0, -PAGE_WIDTH * 0.5, -PAGE_WIDTH * 0.5],
  });

  const coverTranslateY = bookOpenAnim.interpolate({
    inputRange: [0, 0.24, 0.48, 1],
    outputRange: [0, -6, 0, 0],
  });

  const coverOpacity = bookOpenAnim.interpolate({
    inputRange: [0, 0.44, 0.49, 1],
    outputRange: [1, 1, 0, 0],
  });

  // PHASE 2: Left Page smoothly unfolds from the center spine outward to the left (0.48 -> 1.0)
  const leftPageScaleX = bookOpenAnim.interpolate({
    inputRange: [0, 0.48, 1],
    outputRange: [0, 0, 1],
  });

  const leftPageTranslateX = bookOpenAnim.interpolate({
    inputRange: [0, 0.48, 1],
    outputRange: [PAGE_WIDTH * 0.5, PAGE_WIDTH * 0.5, 0],
  });

  const leftPageTranslateY = bookOpenAnim.interpolate({
    inputRange: [0, 0.48, 0.74, 1],
    outputRange: [0, 0, -6, 0],
  });

  const leftPageOpacity = bookOpenAnim.interpolate({
    inputRange: [0, 0.47, 0.52, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Divine glow opacity as book opens
  const divineGlowOpacity = bookOpenAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.35, 1],
  });

  // Original Magnifying Glass Trajectory over Open Genesis Pages
  const magnifyTranslateX = magnifySearch.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-PAGE_WIDTH * 0.45, 0, PAGE_WIDTH * 0.45],
  });

  const magnifyTranslateY = magnifySearch.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 4, -6],
  });

  const magnifyRotate = magnifySearch.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  // Brown thick line below the Bible - Always centered at x=0, expands symmetrically from center
  const shadowScaleX = bookOpenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1.35],
  });

  // Leather binding foundation expands symmetrically from center as book opens
  const leatherScaleX = bookOpenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  // Natural 3-Second Roll Down Translation (Rolls down from top to bottom)
  const rollTranslateY = rollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, SCREEN_FULL_HEIGHT + 55],
  });

  // Counter-translation for inner splash content so it remains stationary while being rolled up
  const counterTranslateY = rollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -(SCREEN_FULL_HEIGHT + 55)],
  });

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#040714" translucent />

      {/* UNDERNEATH LAYER: The Real Quiz Home Screen (Naturally Revealed as Splash Rolls Down from Upside) */}
      <View 
        style={StyleSheet.absoluteFill} 
        pointerEvents={isRollingDone ? 'auto' : 'none'}
      >
        <BibleQuizHomeScreen />
      </View>

      {/* SPLASH SCREEN CLIPPING CONTAINER: Rolls from up to down over 3 seconds */}
      {!isRollingDone && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.splashClippingContainer,
            {
              transform: [{ translateY: rollTranslateY }],
            },
          ]}
          pointerEvents={isRolling ? 'none' : 'auto'}
        >
          {/* Inner splash content counter-translates so it stays stationary on screen while being revealed */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.splashInnerContent,
              {
                transform: [{ translateY: counterTranslateY }],
              },
            ]}
          >
            {/* Atmospheric Spiritual Background Gradient */}
            <LinearGradient
            colors={['#040714', '#09102b', '#130c2e', '#040714']}
            locations={[0, 0.35, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Ambient Divine Halo behind Book */}
          <View style={styles.ambientLightContainer} pointerEvents="none">
            <Svg height={SCREEN_WIDTH * 1.3} width={SCREEN_WIDTH * 1.3} viewBox="0 0 400 400">
              <Defs>
                <SvgRadialGradient id="divineGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                  <Stop offset="35%" stopColor="#d97706" stopOpacity="0.16" />
                  <Stop offset="70%" stopColor="#7c3aed" stopOpacity="0.05" />
                  <Stop offset="100%" stopColor="#040714" stopOpacity="0" />
                </SvgRadialGradient>
              </Defs>
              <Circle cx="200" cy="200" r="190" fill="url(#divineGlow)" />
            </Svg>
          </View>

          <SafeAreaView style={styles.safeArea}>
            {/* Top Header Bar */}
            <Animated.View style={[styles.topBar, { opacity: textFade }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  countdownProgress.stopAnimation();
                  rollAnim.stopAnimation();
                  if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                  }
                  if (openTimerRef.current) {
                    clearTimeout(openTimerRef.current);
                    openTimerRef.current = null;
                  }
                  hasNavigated.current = true;
                  navigation.goBack();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ChevronLeft size={22} color="#f8fafc" />
              </TouchableOpacity>

              {/* Ministry Badge */}
              <View style={styles.ministryBadge}>
                <View style={styles.crossGlowDot} />
                <Text style={styles.ministryBadgeText}>CHURCH OF GOD</Text>
              </View>

              {/* Top Right: Countdown Circle with Skip Button */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={proceedToQuiz}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.skipText}>Skip</Text>
                <View style={styles.countdownCircleContainer}>
                  <Svg width={26} height={26} viewBox="0 0 26 26">
                    <Circle
                      cx="13"
                      cy="13"
                      r={COUNTDOWN_RADIUS}
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="2"
                      fill="rgba(15, 23, 42, 0.6)"
                    />
                    <AnimatedCircle
                      cx="13"
                      cy="13"
                      r={COUNTDOWN_RADIUS}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray={COUNTDOWN_CIRCUMFERENCE}
                      strokeDashoffset={countdownProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, COUNTDOWN_CIRCUMFERENCE],
                      })}
                      strokeLinecap="round"
                      fill="transparent"
                      transform="rotate(-90, 13, 13)"
                    />
                  </Svg>
                  <View style={styles.countdownNumberWrapper}>
                    <Text style={styles.countdownNumberText}>{countdown}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Central Book Showcase - Completely Steady & Normal, Zero Floating or Tilting */}
            <View style={styles.centerStage}>
              {/* Main Container with Stage Horizontal Alignment */}
              <Animated.View
                style={[
                  styles.steadyStage,
                  {
                    transform: [
                      { translateX: stageTranslateX },
                    ],
                  },
                ]}
              >
                {/* Interactive Bible Container - tap to replay smooth open */}
                <TouchableOpacity 
                  activeOpacity={0.92}
                  onPress={triggerBookOpen}
                  style={styles.bookWrapper}
                >
                  {/* Back Leather Binding (underneath open pages) - Expands from center */}
                  <Animated.View
                    style={[
                      styles.leatherBacking,
                      {
                        opacity: divineGlowOpacity,
                        width: PAGE_WIDTH * 2 + 14,
                        left: -PAGE_WIDTH - 7,
                        transform: [{ scaleX: leatherScaleX }],
                      },
                    ]}
                  />

                  {/* Divine Warm Light Halo when Open */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.openGlowHalo,
                      {
                        opacity: divineGlowOpacity,
                        width: PAGE_WIDTH * 2,
                        left: -PAGE_WIDTH,
                      },
                    ]}
                  />

                  {/* RIGHT PAGE: Sits from the spine to the right (Genesis 1:3-5 & Telugu) */}
                  <View style={[styles.pageBlock, { left: 0 }]}>
                    {/* Thick Page Stack Edge on bottom & right */}
                    <View style={styles.pageRightEdge} />
                    <View style={styles.pageBottomEdge} />

                    {/* Right Page Surface */}
                    <View style={styles.pageSurface}>
                      {/* Top of Page: First Book Name "GENESIS" */}
                      <View style={styles.genesisHeader}>
                        <Text style={styles.bookTitle}>GENESIS</Text>
                        <Text style={styles.chapterSubtitle}>ఆదికాండము 1:3-5</Text>
                        <View style={styles.headerGoldDivider} />
                      </View>

                      {/* Page Lines with Genesis Chapter 1 words & letters (Solid & Stationary) */}
                      <View style={styles.scriptureBody}>
                        {/* Verse 3 line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            <Text style={styles.verseNumber}>3 </Text>
                            And God said, Let there be light: and there was light.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Verse 4 line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            <Text style={styles.verseNumber}>4 </Text>
                            And God saw the light, that it was good: and God divided the light.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Verse 5 line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            <Text style={styles.verseNumber}>5 </Text>
                            And God called the light Day, and the darkness Night.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Telugu Translation Line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureTelugu}>
                            దేవుడు వెలుగు కలుగును గాక అనెను; అప్పుడు వెలుగు కలిగెను.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* LEFT PAGE: Smoothly unfolds from the center spine outward to the left (Genesis 1:1-2) */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.pageBlock,
                      {
                        left: -PAGE_WIDTH,
                        opacity: leftPageOpacity,
                        transform: [
                          { translateX: leftPageTranslateX },
                          { translateY: leftPageTranslateY },
                          { scaleX: leftPageScaleX },
                        ],
                      },
                    ]}
                  >
                    {/* Thick Page Stack Edge on bottom & left */}
                    <View style={styles.pageLeftEdge} />
                    <View style={styles.pageBottomEdge} />

                    {/* Left Page Surface */}
                    <View style={[styles.pageSurface, styles.leftPageSurface]}>
                      {/* Top of Page: First Book Name "GENESIS" */}
                      <View style={styles.genesisHeader}>
                        <Text style={styles.bookTitle}>GENESIS</Text>
                        <Text style={styles.chapterSubtitle}>CHAPTER 1:1-2</Text>
                        <View style={styles.headerGoldDivider} />
                      </View>

                      {/* Page Lines with Genesis Chapter 1 words & letters (Solid & Stationary) */}
                      <View style={styles.scriptureBody}>
                        {/* Verse 1 line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            <Text style={styles.verseNumber}>1 </Text>
                            In the beginning God created the heaven and the earth.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Verse 2 line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            <Text style={styles.verseNumber}>2 </Text>
                            And the earth was without form, and void; and darkness was upon deep.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Verse 2 part b line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureVerse}>
                            And the Spirit of God moved upon the face of waters.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>

                        {/* Telugu Translation Line */}
                        <View style={styles.verseLineContainer}>
                          <Text style={styles.scriptureTelugu}>
                            ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను.
                          </Text>
                          <View style={styles.ruledUnderline} />
                        </View>
                      </View>
                    </View>
                  </Animated.View>

                  {/* CENTER FOLDING PART: Satin Red Strap positioned exactly where the Bible folds */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.centerFoldContainer,
                      {
                        opacity: divineGlowOpacity,
                      },
                    ]}
                  >
                    {/* Center Crease Shadow */}
                    <View style={styles.creaseLine} />

                    {/* Red Bookmark Strap hanging down the center folding part */}
                    <CenterFoldRibbonSvg height={PAGE_HEIGHT + 18} />
                  </Animated.View>

                  {/* THE FIRST DISPLAYED HOLY BIBLE FRONT COVER (Smoothly swings open to left spine) */}
                  <Animated.View
                    pointerEvents={isOpenFinished ? 'none' : 'auto'}
                    style={[
                      styles.frontCoverContainer,
                      {
                        left: 0,
                        opacity: coverOpacity,
                        transform: [
                          { translateX: coverTranslateX },
                          { translateY: coverTranslateY },
                          { scaleX: coverScaleX },
                        ],
                      },
                    ]}
                  >
                    {/* Front Leather Cover Vector SVG */}
                    <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox="0 0 140 190" fill="none">
                      <Defs>
                        <SvgLinearGradient id="coverLeatherGrad" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0%" stopColor="#4a2c20" />
                          <Stop offset="45%" stopColor="#2e1a12" />
                          <Stop offset="100%" stopColor="#1a0f0a" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="coverGoldGrad" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0%" stopColor="#fef08a" />
                          <Stop offset="50%" stopColor="#f59e0b" />
                          <Stop offset="100%" stopColor="#b45309" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="spineLeatherGrad" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor="#150a06" />
                          <Stop offset="100%" stopColor="#3d2116" />
                        </SvgLinearGradient>
                      </Defs>

                      {/* Main Leather Cover */}
                      <Rect x="4" y="2" width="132" height="184" rx="14" fill="url(#coverLeatherGrad)" stroke="#6b3a2a" strokeWidth="2.5" />

                      {/* Inner Gold Inset Frame */}
                      <Rect x="14" y="12" width="112" height="164" rx="10" stroke="url(#coverGoldGrad)" strokeWidth="1.2" fill="none" opacity={0.65} />

                      {/* Spine Ribbing on Left Edge */}
                      <Rect x="4" y="2" width="14" height="184" fill="url(#spineLeatherGrad)" opacity={0.7} />
                      <Line x1="4" y1="40" x2="18" y2="40" stroke="#d97706" strokeWidth="1.5" />
                      <Line x1="4" y1="80" x2="18" y2="80" stroke="#d97706" strokeWidth="1.5" />
                      <Line x1="4" y1="120" x2="18" y2="120" stroke="#d97706" strokeWidth="1.5" />
                      <Line x1="4" y1="160" x2="18" y2="160" stroke="#d97706" strokeWidth="1.5" />

                      {/* Embossed Gold "HOLY BIBLE" text */}
                      <G transform="translate(74, 52)">
                        <SvgText x="0" y="0" textAnchor="middle" fill="url(#coverGoldGrad)" fontSize="12" fontWeight="900" letterSpacing="2">HOLY</SvgText>
                        <SvgText x="0" y="15" textAnchor="middle" fill="url(#coverGoldGrad)" fontSize="12" fontWeight="900" letterSpacing="2">BIBLE</SvgText>
                      </G>

                      {/* 3D Gold Latin Cross */}
                      <G transform="translate(74, 108)">
                        <Rect x="-6" y="-24" width="12" height="48" rx="3" fill="url(#coverGoldGrad)" />
                        <Rect x="-18" y="-12" width="36" height="12" rx="3" fill="url(#coverGoldGrad)" />
                        <Circle cx="0" cy="-6" r="3.2" fill="#fef08a" />
                      </G>

                      {/* Red Bookmark Ribbon at Bottom of Closed Bible */}
                      <Path d="M 44 184 L 44 204 L 50 196 L 56 204 L 56 184 Z" fill="#dc2626" />
                    </Svg>
                  </Animated.View>

                  {/* ORIGINAL MAGNIFYING GLASS: Appears and scans smoothly across the Genesis scriptures */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.magnifyingGlassWrapper,
                      {
                        opacity: magnifyEntrance,
                        transform: [
                          { scale: magnifyEntrance },
                          { translateX: magnifyTranslateX },
                          { translateY: magnifyTranslateY },
                          { rotate: magnifyRotate },
                        ],
                      },
                    ]}
                  >
                    <OriginalMagnifyingGlassSvg size={76} />
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>

              {/* Brown thick line below the Bible - Always Centered, Expands from Center */}
              <Animated.View
                style={[
                  styles.groundShadow,
                  {
                    transform: [
                      { scaleX: shadowScaleX },
                    ],
                  },
                ]}
              />

              {/* Branding & Titles */}
              <Animated.View style={[styles.brandingContainer, { opacity: textFade, transform: [{ translateY: badgeSlide }] }]}>
                <Text style={styles.mainTitle}>HOLY BIBLE QUIZ</Text>
                <Text style={styles.teluguTitle}>పరిశుద్ధ గ్రంథము</Text>

                {/* Inspirational Verse */}
                <View style={styles.verseBox}>
                  <Text style={styles.verseQuote}>
                    “Your Word is a lamp to my feet and a light to my path.”
                  </Text>
                  <Text style={styles.verseRef}>— Psalm 119:105</Text>
                </View>

                {/* Feature Pills */}
                <View style={styles.featuresRow}>
                  <View style={styles.featureChip}>
                    <Flame size={12} color="#f97316" style={{ marginRight: 4 }} />
                    <Text style={styles.featureChipText}>Daily Challenge</Text>
                  </View>
                  <View style={styles.featureChip}>
                    <Trophy size={12} color="#eab308" style={{ marginRight: 4 }} />
                    <Text style={styles.featureChipText}>Leaderboard</Text>
                  </View>
                  <View style={styles.featureChip}>
                    <BookOpen size={12} color="#a855f7" style={{ marginRight: 4 }} />
                    <Text style={styles.featureChipText}>15 Categories</Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Bottom Section - Auto Start Indicator */}
            <Animated.View style={[styles.bottomSection, { opacity: textFade }]}>
              <View style={styles.autoStatusPill}>
                <View style={styles.autoStatusDot} />
                <Text style={styles.autoStatusText}>
                  {isRolling ? 'Opening Holy Bible Quiz...' : `Starting quiz automatically in ${countdown}s`}
                </Text>
              </View>
            </Animated.View>
          </SafeAreaView>
          </Animated.View>
        </Animated.View>
      )}

      {/* DOWN ARROW IN SMALL CARD: Centered on the splash screen when rolling down */}
      {!isRollingDone && isRolling && (
        <Animated.View
          style={[
            styles.downArrowCardPositioner,
            {
              transform: [{ translateY: rollTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <DownArrowSmallCard arrowBounce={arrowBounce} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#040714',
  },
  splashClippingContainer: {
    flex: 1,
    overflow: 'hidden',
    zIndex: 10,
  },
  splashInnerContent: {
    flex: 1,
  },
  downArrowCardPositioner: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    elevation: 12,
  },
  downArrowCard: {
    width: 48,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#09102b',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ambientLightContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    left: (SCREEN_WIDTH - SCREEN_WIDTH * 1.3) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ministryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  crossGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginRight: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  ministryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 1.2,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  // Normal, stationary stage - completely steady without floating or tilting
  steadyStage: {
    width: 0,
    height: PAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookWrapper: {
    width: 0,
    height: PAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Underneath Leather Base
  leatherBacking: {
    position: 'absolute',
    height: PAGE_HEIGHT + 6,
    top: -3,
    backgroundColor: '#26130c',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4a2c20',
  },
  openGlowHalo: {
    position: 'absolute',
    height: PAGE_HEIGHT * 0.85,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 22,
  },
  // Interior Page Block
  pageBlock: {
    position: 'absolute',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    top: 0,
  },
  pageRightEdge: {
    position: 'absolute',
    right: -6,
    top: 4,
    width: 7,
    height: PAGE_HEIGHT - 6,
    backgroundColor: '#ebdcc0',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#d4af37',
  },
  pageLeftEdge: {
    position: 'absolute',
    left: -6,
    top: 4,
    width: 7,
    height: PAGE_HEIGHT - 6,
    backgroundColor: '#ebdcc0',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#d4af37',
  },
  pageBottomEdge: {
    position: 'absolute',
    bottom: -5,
    left: 4,
    width: PAGE_WIDTH - 2,
    height: 6,
    backgroundColor: '#e5d3b3',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#c99a2c',
  },
  pageSurface: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: '#fbf9f4',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e8dcbe',
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  leftPageSurface: {
    backgroundColor: '#f7f2e4',
    borderRightWidth: 1.5,
    borderRightColor: '#d6c4a1',
  },
  // Genesis Page Typography
  genesisHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  bookTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#92400e',
    letterSpacing: 1.4,
  },
  chapterSubtitle: {
    fontSize: 6.5,
    fontWeight: '700',
    color: '#b45309',
    letterSpacing: 0.8,
    marginTop: 0.5,
  },
  headerGoldDivider: {
    width: '84%',
    height: 1,
    backgroundColor: 'rgba(217, 119, 6, 0.45)',
    marginVertical: 2.5,
  },
  scriptureBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  verseLineContainer: {
    marginBottom: 1.5,
  },
  scriptureVerse: {
    fontSize: 7,
    lineHeight: 9.5,
    color: '#3e2723',
    letterSpacing: 0.1,
  },
  verseNumber: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#b45309',
  },
  ruledUnderline: {
    height: 0.5,
    backgroundColor: 'rgba(180, 83, 9, 0.12)',
    marginTop: 1.5,
  },
  scriptureTelugu: {
    fontSize: 6.5,
    lineHeight: 9,
    color: '#78350f',
    fontStyle: 'italic',
  },
  // Center Folding Part where Left and Right Pages meet
  centerFoldContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 8,
    height: PAGE_HEIGHT + 18,
    alignItems: 'center',
    zIndex: 15,
  },
  creaseLine: {
    position: 'absolute',
    top: 2,
    left: 3.5,
    width: 1,
    height: PAGE_HEIGHT,
    backgroundColor: 'rgba(69, 26, 3, 0.35)',
  },
  // Front Cover
  frontCoverContainer: {
    position: 'absolute',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    top: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  magnifyingGlassWrapper: {
    position: 'absolute',
    left: -8,
    top: 20,
    zIndex: 20,
  },
  groundShadow: {
    width: PAGE_WIDTH * 1.6,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b1d11',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 4,
    width: '100%',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(245, 158, 11, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  teluguTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#c4b5fd',
    letterSpacing: 1.2,
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  verseBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    maxWidth: '92%',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 18,
  },
  verseRef: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    marginTop: 3,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  // Top Right: Skip Button & Countdown Circle Styles
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 7,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  countdownCircleContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumberWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fbbf24',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    alignItems: 'center',
    width: '100%',
  },
  autoStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  autoStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  autoStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.4,
  },
});
