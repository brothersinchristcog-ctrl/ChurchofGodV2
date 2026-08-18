import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Animated, ScrollView, Platform, ImageBackground
} from 'react-native';
import { X, Gift, Heart, Droplets } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SalesforceMember } from '../services/SalesforceService';

const { width, height } = Dimensions.get('window');

interface Celebration {
  id: string;
  type: 'birthday' | 'wedding' | 'baptism';
  title: string;
  name: string;
  message: string;
  bibleReference?: string;
  icon: any;
  colors: string[];
  bgImage: any;
}

interface CelebrationPopupProps {
  member: SalesforceMember | null;
}

const PremiumCelebrationAnimation = () => {
  const left1 = useRef<any>(null);
  const right1 = useRef<any>(null);
  const rain1 = useRef<any>(null);

  useEffect(() => {
    // We use a single set of cannons and fire them every 4.2 seconds.
    // The fall speed is 4.0 seconds, giving a tiny 0.2s buffer for the 
    // library to clean up particles from memory before restarting.
    // This completely prevents the stuttering caused by rendering too many overlapping particles!
    const interval = setInterval(() => {
      left1.current?.start();
      right1.current?.start();
      rain1.current?.start();
    }, 4200);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="none">
        
        {/* Bottom Left Popper */}
        <ConfettiCannon 
          ref={left1}
          count={20} // Reduced count for smooth 60fps performance
          origin={{ x: -20, y: height + 20 }} 
          explosionSpeed={800} 
          fallSpeed={4000} 
          fadeOut={true} 
          autoStart={true}
        />
        
        {/* Bottom Right Popper */}
        <ConfettiCannon 
          ref={right1}
          count={20} 
          origin={{ x: width + 20, y: height + 20 }} 
          explosionSpeed={800} 
          fallSpeed={4000} 
          fadeOut={true} 
          autoStart={true}
        />
        
        {/* Top Confetti Rain */}
        <ConfettiCannon 
          ref={rain1}
          count={40} 
          origin={{ x: width / 2, y: -20 }} 
          explosionSpeed={400} 
          fallSpeed={4000} 
          fadeOut={true} 
          autoStart={true}
        />

      </View>
    </>
  );
};

export default function CelebrationPopup({ member }: CelebrationPopupProps) {
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current; // For smooth pagination dots

  useEffect(() => {
    if (!member || dismissed) return;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const matchesToday = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return (d.getMonth() + 1) === currentMonth && d.getDate() === currentDay;
    };

    const newCelebrations: Celebration[] = [];

    // 1. Birthday
    if (matchesToday(member.birthdate)) {
      newCelebrations.push({
        id: 'birthday',
        type: 'birthday',
        title: 'Happy Birthday!',
        name: member.name,
        message: 'May God bless you with abundant joy, peace, and love on your special day. Wishing you a beautiful year ahead!',
        bibleReference: 'Numbers 6:24-26',
        icon: Gift,
        colors: ['#DAA520', '#b45309', '#78350f'],
        bgImage: require('../../assets/images/celebrations/birthday_bg.png')
      });
    }

    // 2. Wedding Anniversary
    if (matchesToday(member.anniversaryDate)) {
      newCelebrations.push({
        id: 'wedding',
        type: 'wedding',
        title: 'Happy Anniversary!',
        name: member.name,
        message: 'May the Lord continue to strengthen your marriage and bless your family forever.',
        bibleReference: '1 Corinthians 13:4-8',
        icon: Heart,
        colors: ['#ec4899', '#be185d', '#831843'],
        bgImage: require('../../assets/images/celebrations/birthday_bg.png')
      });
    }

    // 3. Baptism Anniversary
    if (matchesToday(member.baptismDate)) {
      newCelebrations.push({
        id: 'baptism',
        type: 'baptism',
        title: 'Happy Baptism!',
        name: member.name,
        message: 'Continue to walk faithfully with Christ. May His grace be with you always.',
        bibleReference: 'Galatians 3:27',
        icon: Droplets,
        colors: ['#3b82f6', '#1d4ed8', '#1e3a8a'],
        bgImage: require('../../assets/images/celebrations/birthday_bg.png')
      });
    }

    if (newCelebrations.length > 0) {
      setCelebrations(newCelebrations);
      
      // Play entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [member, dismissed]);



  const handleClose = () => {
    // Only fade out and set dismissed for the current Javascript session
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
    });
  };

  if (celebrations.length === 0 || dismissed) {
    return null;
  }

  return (
    <Modal visible={true} transparent={true} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>


        <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>

          {/* Render Premium Animation */}
          <PremiumCelebrationAnimation />

          <Animated.ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            {celebrations.map((celeb) => {
              const IconComponent = celeb.icon;
              return (
                <View key={celeb.id} style={styles.cardWrapper}>
                  <ImageBackground
                    source={celeb.bgImage}
                    style={styles.imageBackground}
                    imageStyle={styles.imageBackgroundImage}
                  >
                    <View style={styles.contentOverlay}>
                      <Text style={[styles.title, { color: celeb.colors[1] }]}>
                        {celeb.title}
                      </Text>
                      
                      <Text style={[styles.nameText, { color: celeb.colors[2] }]}>
                        {celeb.name}
                      </Text>
                      
                      <Text style={styles.messageText}>
                        {celeb.message}
                      </Text>

                      {celeb.bibleReference && (
                        <Text style={[styles.bibleRefText, { color: celeb.colors[1] }]}>
                          {celeb.bibleReference}
                        </Text>
                      )}
                    </View>
                  </ImageBackground>
                </View>
              );
            })}
          </Animated.ScrollView>

          {/* Pagination Indicators with Smooth Animation */}
          {celebrations.length > 1 && (
            <View style={styles.paginationContainer}>
              {celebrations.map((_, index) => {
                const inputRange = [
                  (index - 1) * width,
                  index * width,
                  (index + 1) * width,
                ];
                
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 24, 8],
                  extrapolate: 'clamp',
                });
                
                const dotColor = scrollX.interpolate({
                  inputRange,
                  outputRange: ['rgba(255, 255, 255, 0.3)', '#fcd34d', 'rgba(255, 255, 255, 0.3)'],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View 
                    key={index} 
                    style={[
                      styles.dot, 
                      { width: dotWidth, backgroundColor: dotColor }
                    ]} 
                  />
                );
              })}
            </View>
          )}

          {/* Close Button - Now structurally below the image */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <View style={styles.closeCircle}>
              <X size={20} color="#fff" />
            </View>
          </TouchableOpacity>

        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // fully dark theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    width: width,
    flexGrow: 0,
    height: height * 0.75, // Image takes exactly 75% of screen height
  },
  cardWrapper: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16, 
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBackgroundImage: {
    resizeMode: 'contain', // zoomed out to show full image
  },
  contentOverlay: {
    width: '72%', // restrain text to center white box
    height: '65%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 38,
    fontFamily: 'GreatVibes_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '900', // extra bold
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 18,
    fontFamily: 'EBGaramond_500Medium',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  bibleRefText: {
    fontSize: 15,
    fontFamily: 'EBGaramond_600SemiBold',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 20, // Sit directly beneath the image
    zIndex: 10,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

});
