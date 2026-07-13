import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Animated, 
  Dimensions, 
  Image, 
  Text,
  StatusBar
} from 'react-native';
import Theme from '../../theme/Theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />
      
      {/* 🔮 Background Decor */}
      <View style={[styles.decorCircle, { top: -100, right: -100, opacity: 0.05 }]} />
      <View style={[styles.decorCircle, { bottom: -150, left: -150, opacity: 0.03 }]} />

      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.logoRing}>
          <Image 
            source={require('../../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.titleMain}>Church of God</Text>
        <Text style={styles.titleSub}>A Gateway to Heaven</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.titleTelugu}>క్రీస్తు నందు సహోదరుల సహవాసము</Text>
        <Text style={styles.titleTeluguEn}>KRISTHU NANDU SAHODARULU SAHAVASAMU</Text>
        

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2d5a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#fbbf24' },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoRing: { 
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 25,
    overflow: 'hidden'
  },
  logo: {
    width: 120,
    height: 120,
  },
  titleMain: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  titleSub: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fbbf24',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  divider: {
    width: 50,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 25,
    borderRadius: 2,
  },
  titleTelugu: {
    fontSize: 16,
    color: '#aac4e8',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  titleTeluguEn: {
    fontSize: 10,
    color: '#aac4e8',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    opacity: 0.6,
  },
  footer: {
    position: 'absolute',
    bottom: -height * 0.15,
    alignItems: 'center',
  },
  footerTxt: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '800',
    letterSpacing: 1.5,
  }
});

