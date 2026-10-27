import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, Mail, X, ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOJIS = ['😞', '😕', '😐', '😊', '🤩'];
const LABELS = ['Poor', 'Fair', 'Okay', 'Good', 'Excellent'];

// Starfield Component
const StarLayer = React.memo(({ count, size, duration }: { count: number; size: number; duration: number }) => {
  const translateY = useSharedValue(0);
  
  // Spread dots across the full screen width
  const [stars] = useState(() => Array.from({ length: count }).map(() => ({
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * 100,
    opacity: 0.5 + Math.random() * 0.5, // increased opacity for better visibility on black
  })));

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-100, { duration, easing: Easing.linear }),
      -1, // infinite
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        {stars.map((star, i) => (
          <View
            key={`s1-${i}`}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: size,
              height: size,
              backgroundColor: '#fff',
              opacity: star.opacity,
              borderRadius: size / 2,
            }}
          />
        ))}
        {stars.map((star, i) => (
          <View
            key={`s2-${i}`}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y + 100,
              width: size,
              height: size,
              backgroundColor: '#fff',
              opacity: star.opacity,
              borderRadius: size / 2,
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
});

export default function FeedbackCard({ memberName }: { memberName?: string }) {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(4);
  const [activeEmoji, setActiveEmoji] = useState(EMOJIS[4]);
  const [feedbackText, setFeedbackText] = useState('');
  
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [contactModalType, setContactModalType] = useState<'phone' | 'email'>('phone');

  const CONTACTS = [
    { name: 'Yeddula Prabhakar', phone: '9392723536', email: 'yprabha2324@gmail.com' },
    { name: 'Sunil Babu', phone: '83743 31432', email: 'sakibandasunilbabu@gmail.com' }
  ];

  // Animation values
  const knobPosition = useSharedValue(4); // index 0-4
  const knobRotation = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);
  const checkmarkProgress = useSharedValue(28); // stroke-dashoffset: 28 to 0
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(6);
  const successOpacity = useSharedValue(0);
  const successTranslateY = useSharedValue(6);

  useEffect(() => {
    // Start shimmer
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );

    // Simulate load time to show skeleton
    const timer = setTimeout(() => {
      setIsInitializing(false);
      formOpacity.value = withTiming(1, { duration: 400 });
      formTranslateY.value = withTiming(0, { duration: 400 });
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleSelectZone = (index: number) => {
    if (index === currentIndex) return;

    setCurrentIndex(index);
    knobPosition.value = withSpring(index, {
      damping: 15,
      stiffness: 120,
    });

    // Roll animation
    knobRotation.value = withSequence(
      withTiming(0, { duration: 0 }), // reset
      withTiming(180, { duration: 225, easing: Easing.inOut(Easing.ease) }, () => {
        runOnJS(setActiveEmoji)(EMOJIS[index]);
      }),
      withTiming(360, { duration: 225, easing: Easing.inOut(Easing.ease) })
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await firestore().collection('feedback').add({
        userId: user?.uid || 'anonymous',
        userName: memberName || user?.displayName || 'Unknown',
        userPhone: user?.phoneNumber || '',
        ratingIndex: currentIndex,
        ratingLabel: LABELS[currentIndex],
        emoji: EMOJIS[currentIndex],
        message: feedbackText,
        createdAt: firestore.FieldValue.serverTimestamp(),
        platform: Platform.OS,
        appVersion: '1.0.0'
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Hide form
      formOpacity.value = withTiming(0, { duration: 300 });
      
      // Show success
      successOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) });
      successTranslateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.ease) });
      
      // Draw checkmark
      checkmarkProgress.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) });

      // Reset back to form after 10 seconds
      setTimeout(() => {
        successOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(setIsSuccess)(false);
          runOnJS(setFeedbackText)('');
          runOnJS(setCurrentIndex)(2);
          runOnJS(setActiveEmoji)(EMOJIS[2]);
          
          knobPosition.value = 2;
          knobRotation.value = 0;
          checkmarkProgress.value = 28;
          
          formOpacity.value = withTiming(1, { duration: 380 });
          formTranslateY.value = withTiming(0, { duration: 380 });
        });
      }, 10000);
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      console.error('Feedback error:', error);
    }
  };

  const handlePhonePress = () => {
    setContactModalType('phone');
    setIsContactModalVisible(true);
  };

  const handleEmailPress = () => {
    setContactModalType('email');
    setIsContactModalVisible(true);
  };

  const animatedKnobStyle = useAnimatedStyle(() => {
    // track is full width minus padding. We have 5 zones.
    // We can use percentage-like positioning by interpolating the index.
    return {
      left: `${(knobPosition.value * 20) + 10}%`,
      transform: [
        { translateX: -23 }, // center the 46px knob
      ],
    };
  });

  const animatedEmojiStyle = useAnimatedStyle(() => {
    // Handle the 3D roll flip
    const scale = interpolate(
      knobRotation.value,
      [0, 180, 360],
      [1, 1.2, 1],
      Extrapolation.CLAMP
    );
    
    return {
      transform: [
        { rotateY: `${knobRotation.value}deg` },
        { scale },
      ],
    };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shimmerPosition.value * (SCREEN_WIDTH * 0.8) }
      ],
    };
  });

  const animatedFormStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }],
      display: isSuccess ? 'none' : 'flex',
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      opacity: successOpacity.value,
      transform: [{ translateY: successTranslateY.value }],
      display: isSuccess ? 'flex' : 'none',
    };
  });

  const animatedCheckmarkProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: checkmarkProgress.value,
    };
  });

  const SkeletonElement = ({ style }: { style: any }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedShimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Main Background Gradient */}
      <LinearGradient
        colors={['#E8DDC6', '#E8DDC6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Gold Border Gradient */}
      <View style={styles.topBorderWrap}>
        <LinearGradient
          colors={['transparent', '#D4AF37', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBorder}
        />
      </View>



      {isInitializing ? (
        <View style={styles.skeletonContainer}>
          <SkeletonElement style={styles.skelHeading} />
          <SkeletonElement style={styles.skelTrack} />
          <View style={styles.skelLabelRow}>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonElement key={i} style={styles.skelLabel} />)}
          </View>
          <SkeletonElement style={styles.skelTextarea} />
          <SkeletonElement style={styles.skelBtn} />
        </View>
      ) : (
        <>
          <Animated.View style={[styles.formContainer, animatedFormStyle]}>
            <Text style={styles.heading}>💬 How are you enjoying the app?</Text>

            <View style={styles.iconTrack}>
              <View style={styles.starsClip}>
                <StarLayer count={25} size={1} duration={20000} />
                <StarLayer count={15} size={2} duration={35000} />
                <StarLayer count={8} size={3} duration={50000} />
              </View>
              
              <View style={styles.zoneRow}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.zone}
                    onPress={() => handleSelectZone(index)}
                    activeOpacity={1}
                  >
                    <View style={[styles.zoneSkel, currentIndex === index && styles.zoneSkelHidden]} />
                    <Text style={[
                      styles.labelText, 
                      currentIndex === index && styles.labelTextActive,
                      index === 0 && { paddingLeft: 12 },
                      index === 4 && { paddingRight: 14 }
                    ]}>
                      {LABELS[index]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Animated.View style={[styles.iconKnob, animatedKnobStyle]}>
                <Animated.Text style={[styles.emo, animatedEmojiStyle]}>{activeEmoji}</Animated.Text>
              </Animated.View>
            </View>

            <View style={styles.textareaWrap}>
              <TextInput
                style={styles.textarea}
                placeholder="Tell us what you think..."
                placeholderTextColor="rgba(74,55,40,0.4)"
                multiline
                maxLength={250}
                value={feedbackText}
                onChangeText={setFeedbackText}
                textAlignVertical="top"
              />
              <Text style={[styles.counter, feedbackText.length > 220 && styles.counterNear]}>
                {feedbackText.length} / 250
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnWrap, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#D4AF37', '#B8912B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#1A1204" />
                  ) : (
                    <Text style={styles.btnText}>Send Feedback</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={styles.orText}>or</Text>
              
              <View style={styles.contactIcons}>
                <TouchableOpacity 
                  style={styles.iconBtn}
                  onPress={handlePhonePress}
                >
                  <Phone size={20} color="#4A3728" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconBtn}
                  onPress={handleEmailPress}
                >
                  <Mail size={20} color="#4A3728" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.successContainer, animatedSuccessStyle]}>
            <View style={styles.checkWrap}>
              <Svg width="22" height="22" viewBox="0 0 24 24">
                <AnimatedPath
                  d="M5 12.5l4.5 4.5L19 7"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="28"
                  animatedProps={animatedCheckmarkProps}
                />
              </Svg>
            </View>
            <Text style={styles.thanksTitle}>✓ Thank You!</Text>
            <Text style={styles.thanksSub}>Your feedback helps us improve the Church of GOD app.</Text>
          </Animated.View>
        </>
      )}

      <Modal
        visible={isContactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsContactModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsContactModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalHeaderIcon}>
                  {contactModalType === 'phone' ? (
                    <Phone size={22} color="#D4AF37" />
                  ) : (
                    <Mail size={22} color="#D4AF37" />
                  )}
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {contactModalType === 'phone' ? 'Contact Support' : 'Send an Email'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Select a contact to reach out
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsContactModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contactList}>
              {CONTACTS.map((contact, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.contactItem}
                  activeOpacity={0.6}
                  onPress={() => {
                    if (contactModalType === 'phone') {
                      Linking.openURL(`tel:${contact.phone.replace(/\s/g, '')}`);
                    } else {
                      Linking.openURL(`mailto:${contact.email}`);
                    }
                    setIsContactModalVisible(false);
                  }}
                >
                  <View style={styles.contactIconBg}>
                    {contactModalType === 'phone' ? (
                      <Phone size={20} color="#8B4513" />
                    ) : (
                      <Mail size={20} color="#8B4513" />
                    )}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                    <Text 
                      style={styles.contactDetail}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                    >
                      {contactModalType === 'phone' ? contact.phone : contact.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.15)',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
    marginHorizontal: 20,
    marginBottom: 30,
    position: 'relative',
  },
  topBorderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.7,
  },
  topBorder: {
    flex: 1,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A3728',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  iconTrack: {
    height: 72,
    borderRadius: 36,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
    marginHorizontal: -8,
  },
  starsClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    overflow: 'hidden',
  },
  zoneRow: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 2,
  },
  zone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  zoneSkel: {
    position: 'absolute',
    top: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
  zoneSkelHidden: {
    opacity: 0,
  },
  iconKnob: {
    position: 'absolute',
    top: 4,
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  emo: {
    fontSize: 32,
    lineHeight: 38,
  },
  labelText: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.1,
    lineHeight: 12,
  },
  labelTextActive: {
    color: '#E8CA6C',
    fontWeight: '700',
  },
  textareaWrap: {
    marginTop: 16,
    marginBottom: 10,
    position: 'relative',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 28,
    color: '#4A3728',
    fontSize: 14,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'ios' ? { lineHeight: 20 } : {}),
  },
  counter: {
    position: 'absolute',
    right: 10,
    bottom: 7,
    fontSize: 10.5,
    color: 'rgba(74,55,40,0.4)',
  },
  counterNear: {
    color: '#8B4513',
  },
  btnWrap: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
    borderRadius: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  orText: {
    color: '#4A3728',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 16,
    opacity: 0.7,
  },
  contactIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.6)',
  },
  btn: {
    height: 36,
    paddingHorizontal: 24,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#1A1204',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  formContainer: {
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  thanksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A3728',
    marginBottom: 4,
  },
  thanksSub: {
    fontSize: 12,
    color: 'rgba(74,55,40,0.65)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  
  // Skeleton styles
  skeletonContainer: {
    width: '100%',
  },
  skelHeading: {
    width: '72%',
    height: 14,
    borderRadius: 7,
    alignSelf: 'center',
    marginBottom: 20,
  },
  skelTrack: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    marginBottom: 8,
    marginHorizontal: -8,
  },
  skelLabelRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skelLabel: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  skelTextarea: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    marginBottom: 10,
  },
  skelBtn: {
    width: '100%',
    height: 42,
    borderRadius: 12,
  },
  
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FAF9F6', // Off-white warm background
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(212,175,55,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1204',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(74,55,40,0.6)',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'rgba(139,69,19,0.05)',
    borderRadius: 12,
  },
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  contactIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1204',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
  },
});
