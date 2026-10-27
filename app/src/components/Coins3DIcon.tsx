import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Path,
  Circle,
  Ellipse,
  G
} from 'react-native-svg';

interface Coins3DIconProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Modern 3D Gold Coins Icon with metallic gradients, perspective extrusion,
 * milled rim ridges, embossed coin face relief, and dazzling specular glints.
 */
export default function Coins3DIcon({ size = 56, style }: Coins3DIconProps) {
  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Defs>
          {/* Main front coin outer rim gradient */}
          <SvgLinearGradient id="frontRimGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFBEB" />
            <Stop offset="25%" stopColor="#FBBF24" />
            <Stop offset="65%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#92400E" />
          </SvgLinearGradient>

          {/* Front coin inner face radial gradient */}
          <SvgRadialGradient id="frontFaceGrad" cx="36%" cy="30%" rx="65%" ry="60%">
            <Stop offset="0%" stopColor="#FEF08A" />
            <Stop offset="40%" stopColor="#F59E0B" />
            <Stop offset="85%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#B45309" />
          </SvgRadialGradient>

          {/* Front coin cylinder side extrusion */}
          <SvgLinearGradient id="frontEdgeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#78350F" />
            <Stop offset="20%" stopColor="#B45309" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="80%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#78350F" />
          </SvgLinearGradient>

          {/* Back left coin rim gradient */}
          <SvgLinearGradient id="backRimGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FEF3C7" />
            <Stop offset="40%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#92400E" />
          </SvgLinearGradient>

          {/* Back left coin face gradient */}
          <SvgLinearGradient id="backFaceGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FDE68A" />
            <Stop offset="50%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#78350F" />
          </SvgLinearGradient>

          {/* Back left cylinder edge */}
          <SvgLinearGradient id="backEdgeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#78350F" />
            <Stop offset="40%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#451A03" />
          </SvgLinearGradient>

          {/* Small foreground coin rim & face */}
          <SvgLinearGradient id="smallRimGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFBEB" />
            <Stop offset="35%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#92400E" />
          </SvgLinearGradient>

          <SvgRadialGradient id="smallFaceGrad" cx="35%" cy="30%" rx="65%" ry="60%">
            <Stop offset="0%" stopColor="#FEF08A" />
            <Stop offset="60%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#B45309" />
          </SvgRadialGradient>

          <SvgLinearGradient id="smallEdgeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#78350F" />
            <Stop offset="45%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#78350F" />
          </SvgLinearGradient>
        </Defs>

        {/* 1. Ground Drop Shadow under coin cluster */}
        <Ellipse cx="33" cy="57" rx="25" ry="5.5" fill="#000000" opacity={0.22} />
        <Ellipse cx="38" cy="56" rx="18" ry="4" fill="#78350F" opacity={0.3} />

        {/* 2. COIN 1: Back-Left Stacked Coin (Elevated perspective) */}
        <G>
          {/* Cylinder Depth / Edge */}
          <Path
            d="M 11 25 C 11 33.5, 37 33.5, 37 25 L 37 30 C 37 38.5, 11 38.5, 11 30 Z"
            fill="url(#backEdgeGrad)"
          />
          {/* Top Face Outer Rim */}
          <Ellipse cx="24" cy="25" rx="13" ry="7.2" fill="url(#backRimGrad)" />
          {/* Top Face Inner Relief */}
          <Ellipse cx="24" cy="25" rx="10" ry="5.4" fill="url(#backFaceGrad)" stroke="#B45309" strokeWidth={0.6} />
          {/* Embossed inner star/cross */}
          <Path
            d="M 24 22 L 24.8 24.2 L 27 25 L 24.8 25.8 L 24 28 L 23.2 25.8 L 21 25 L 23.2 24.2 Z"
            fill="#FEF08A"
            opacity={0.8}
          />
          {/* Rim Specular Highlight */}
          <Path
            d="M 14 24 C 16 20, 30 20, 33 24"
            stroke="#FFFBEB"
            strokeWidth={0.8}
            strokeLinecap="round"
            opacity={0.7}
          />
        </G>

        {/* 3. COIN 2: Small Front-Left Coin (resting on ground) */}
        <G>
          {/* Cylinder Depth */}
          <Path
            d="M 7 42 C 7 48.5, 25 48.5, 25 42 L 25 47 C 25 53.5, 7 53.5, 7 47 Z"
            fill="url(#smallEdgeGrad)"
          />
          {/* Outer Rim */}
          <Ellipse cx="16" cy="42" rx="9" ry="5.2" fill="url(#smallRimGrad)" />
          {/* Inner Face */}
          <Ellipse cx="16" cy="42" rx="7" ry="4" fill="url(#smallFaceGrad)" stroke="#B45309" strokeWidth={0.5} />
          {/* Mini Emboss */}
          <Circle cx="16" cy="42" r="2.2" fill="#FEF08A" opacity={0.85} />
          <Circle cx="16" cy="42" r="1.2" fill="#D97706" opacity={0.6} />
          {/* Top Edge Specular */}
          <Path
            d="M 10 41 C 11.5 38.5, 20.5 38.5, 22 41"
            stroke="#FFFBEB"
            strokeWidth={0.7}
            strokeLinecap="round"
            opacity={0.75}
          />
        </G>

        {/* 4. COIN 3: Main Prominent Front Coin (Large, 3D embossed, highest detail) */}
        <G>
          {/* Cylinder Edge (Extruded bottom) */}
          <Path
            d="M 19 36 C 19 46.5, 57 46.5, 57 36 L 57 43.5 C 57 54, 19 54, 19 43.5 Z"
            fill="url(#frontEdgeGrad)"
          />
          {/* Milled Edge Ridges (Vertical 3D grooves) */}
          <Path d="M 25 41 L 25 48.5" stroke="#78350F" strokeWidth={0.9} opacity={0.55} />
          <Path d="M 31 43.5 L 31 51" stroke="#78350F" strokeWidth={0.9} opacity={0.55} />
          <Path d="M 38 44.5 L 38 52" stroke="#78350F" strokeWidth={0.9} opacity={0.55} />
          <Path d="M 45 43.5 L 45 51" stroke="#78350F" strokeWidth={0.9} opacity={0.55} />
          <Path d="M 51 41 L 51 48.5" stroke="#78350F" strokeWidth={0.9} opacity={0.55} />

          {/* Outer Coin Rim Ellipse */}
          <Ellipse cx="38" cy="36" rx="19" ry="9.8" fill="url(#frontRimGrad)" stroke="#B45309" strokeWidth={0.8} />

          {/* Specular White Rim Curve (Top light reflection) */}
          <Path
            d="M 23 34 C 26 29, 50 29, 53 34"
            stroke="#FFFFFF"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.85}
          />

          {/* Inner Sunken Face Ellipse */}
          <Ellipse
            cx="38"
            cy="36"
            rx="15"
            ry="7.8"
            fill="url(#frontFaceGrad)"
            stroke="#B45309"
            strokeWidth={0.6}
          />

          {/* Inner Bottom Shadow Arc */}
          <Path
            d="M 26 38 C 29 42.5, 47 42.5, 50 38"
            stroke="#78350F"
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.45}
          />

          {/* Embossed Center Star Symbol in 3D Perspective */}
          {/* Shadow facet */}
          <Path
            d="M 38 31 L 39.5 34.5 L 43 36 L 39.5 37.5 L 38 41 L 36.5 37.5 L 33 36 L 36.5 34.5 Z"
            fill="#B45309"
          />
          {/* Highlight facet (offset slightly for 3D raised emboss) */}
          <Path
            d="M 38 30.5 L 39.3 34.2 L 42.8 35.7 L 39.3 37.2 L 38 40.5 L 36.7 37.2 L 33.2 35.7 L 36.7 34.2 Z"
            fill="#FEF08A"
          />
          {/* Center Raised Gem/Pearl */}
          <Circle cx="38" cy="35.7" r="1.6" fill="#FFFFFF" />
          <Circle cx="38" cy="35.7" r="0.8" fill="#F59E0B" />
        </G>

        {/* 5. Dazzling 3D Diamond Glints / Specular Sparkles */}
        {/* Main Coin Glint (Top Right) */}
        <Path
          d="M 48 24 Q 48 28 52 28 Q 48 28 48 32 Q 48 28 44 28 Q 48 28 48 24 Z"
          fill="#FFFFFF"
        />
        <Circle cx="48" cy="28" r="1" fill="#FEF08A" />

        {/* Back Coin Glint (Top Left) */}
        <Path
          d="M 18 18 Q 18 21 21 21 Q 18 21 18 24 Q 18 21 15 21 Q 18 21 18 18 Z"
          fill="#FFFFFF"
          opacity={0.85}
        />

        {/* Micro sparkle dot */}
        <Circle cx="32" cy="46" r="0.9" fill="#FFFFFF" opacity={0.8} />
      </Svg>
    </View>
  );
}

/**
 * Single 3D Gold Coin Icon for mini tags, scores, or inline badges
 */
export function SingleCoin3D({ size = 20, style }: Coins3DIconProps) {
  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <Defs>
          <SvgLinearGradient id="singleRimGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFBEB" />
            <Stop offset="30%" stopColor="#FBBF24" />
            <Stop offset="80%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#92400E" />
          </SvgLinearGradient>

          <SvgRadialGradient id="singleFaceGrad" cx="35%" cy="30%" rx="65%" ry="60%">
            <Stop offset="0%" stopColor="#FEF08A" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#B45309" />
          </SvgRadialGradient>

          <SvgLinearGradient id="singleEdgeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#78350F" />
            <Stop offset="40%" stopColor="#F59E0B" />
            <Stop offset="70%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#78350F" />
          </SvgLinearGradient>
        </Defs>

        {/* Shadow */}
        <Ellipse cx="16" cy="27" rx="10" ry="2.5" fill="#000000" opacity={0.2} />

        {/* Cylinder Depth Edge */}
        <Path
          d="M 6 15 C 6 22, 26 22, 26 15 L 26 19 C 26 26, 6 26, 6 19 Z"
          fill="url(#singleEdgeGrad)"
        />

        {/* Milled lines */}
        <Path d="M 11 18 L 11 22 M 16 19 L 16 23 M 21 18 L 21 22" stroke="#78350F" strokeWidth={0.7} opacity={0.5} />

        {/* Outer Rim */}
        <Ellipse cx="16" cy="15" rx="10" ry="5.5" fill="url(#singleRimGrad)" stroke="#B45309" strokeWidth={0.6} />

        {/* Specular curve */}
        <Path d="M 8 14 C 10 11, 22 11, 24 14" stroke="#FFFBEB" strokeWidth={0.8} strokeLinecap="round" opacity={0.8} />

        {/* Inner face */}
        <Ellipse cx="16" cy="15" rx="7.5" ry="4" fill="url(#singleFaceGrad)" stroke="#B45309" strokeWidth={0.5} />

        {/* Embossed Star */}
        <Path
          d="M 16 12.5 L 16.8 14.2 L 18.5 15 L 16.8 15.8 L 16 17.5 L 15.2 15.8 L 13.5 15 L 15.2 14.2 Z"
          fill="#FEF08A"
        />

        {/* Sparkle */}
        <Circle cx="21" cy="11" r="0.9" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});
