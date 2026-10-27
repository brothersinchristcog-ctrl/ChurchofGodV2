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
  Rect,
  G
} from 'react-native-svg';
import { 
  BookOpen, 
  Scroll, 
  BookMarked, 
  Users, 
  Shield, 
  Flame, 
  Compass, 
  Heart, 
  Sparkles, 
  Feather, 
  CheckSquare, 
  Sun, 
  Church, 
  Globe, 
  Smile,
  Crown,
  Trophy,
  GraduationCap,
  Zap,
  ShieldCheck
} from 'lucide-react-native';

interface Category3DIconProps {
  iconName: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * Modern 3D Vector Icons for Bible Quiz Categories and Tracks.
 * Hand-crafted with rich gradients, dimensional extrusion, metallic highlights,
 * and drop shadows to give a true 3D aesthetic matching the Coins3DIcon.
 */
export default function Category3DIcon({
  iconName,
  size = 46,
  color = '#6366f1',
  style
}: Category3DIconProps) {
  const render3DSvg = () => {
    switch (iconName) {
      // 1. BookOpen: 3D Open Holy Bible with golden page edges & ribbon
      case 'BookOpen':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="bibleCoverGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#4338ca" />
                <Stop offset="100%" stopColor="#1e1b4b" />
              </SvgLinearGradient>
              <SvgLinearGradient id="biblePageGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="80%" stopColor="#fef3c7" />
                <Stop offset="100%" stopColor="#fde68a" />
              </SvgLinearGradient>
              <SvgLinearGradient id="goldRibbonGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="50%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgLinearGradient>
            </Defs>
            {/* Ground Shadow */}
            <Ellipse cx="32" cy="55" rx="24" ry="4.5" fill="#000000" opacity={0.25} />
            {/* Leather Cover Base */}
            <Path d="M 6 42 Q 32 48 58 42 L 56 46 Q 32 52 8 46 Z" fill="#1e1b4b" />
            <Path d="M 6 42 C 6 22 8 20 32 24 C 56 20 58 22 58 42 C 44 38 36 38 32 44 C 28 38 20 38 6 42 Z" fill="url(#bibleCoverGrad)" />
            {/* Left Page Block 3D */}
            <Path d="M 8 38 C 8 20 12 18 31 22 L 31 41 C 12 37 8 38 8 38 Z" fill="url(#biblePageGrad)" stroke="#fde68a" strokeWidth={0.8} />
            {/* Right Page Block 3D */}
            <Path d="M 56 38 C 56 20 52 18 33 22 L 33 41 C 52 37 56 38 56 38 Z" fill="url(#biblePageGrad)" stroke="#fde68a" strokeWidth={0.8} />
            {/* Page Lines Left */}
            <Path d="M 12 25 Q 22 24 28 27 M 12 29 Q 22 28 28 31 M 12 33 Q 22 32 28 35" stroke="#d97706" strokeWidth={0.7} opacity={0.5} />
            {/* Page Lines Right */}
            <Path d="M 52 25 Q 42 24 36 27 M 52 29 Q 42 28 36 31 M 52 33 Q 42 32 36 35" stroke="#d97706" strokeWidth={0.7} opacity={0.5} />
            {/* Golden Bookmark Ribbon */}
            <Path d="M 31 22 Q 33 32 30 46 L 33 44 L 36 47 Q 34 32 33 22 Z" fill="url(#goldRibbonGrad)" />
            {/* Center Spine Glow */}
            <Path d="M 32 22 L 32 43" stroke="#fef08a" strokeWidth={1.2} />
          </Svg>
        );

      // 2. Scroll: 3D Ancient Papyrus Scroll with wooden rollers & gold seal
      case 'Scroll':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="scrollParchment" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fffbeb" />
                <Stop offset="40%" stopColor="#fef3c7" />
                <Stop offset="100%" stopColor="#fde68a" />
              </SvgLinearGradient>
              <SvgLinearGradient id="scrollWood" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#92400e" />
                <Stop offset="50%" stopColor="#d97706" />
                <Stop offset="100%" stopColor="#78350f" />
              </SvgLinearGradient>
              <SvgRadialGradient id="sealGrad" cx="35%" cy="35%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#ef4444" />
                <Stop offset="70%" stopColor="#b91c1c" />
                <Stop offset="100%" stopColor="#7f1d1d" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="22" ry="4" fill="#000000" opacity={0.25} />
            {/* Left Roller */}
            <Rect x="8" y="10" width="6" height="42" rx="3" fill="url(#scrollWood)" />
            <Circle cx="11" cy="9" r="4" fill="#f59e0b" />
            <Circle cx="11" cy="53" r="4" fill="#f59e0b" />
            {/* Right Roller */}
            <Rect x="50" y="10" width="6" height="42" rx="3" fill="url(#scrollWood)" />
            <Circle cx="53" cy="9" r="4" fill="#f59e0b" />
            <Circle cx="53" cy="53" r="4" fill="#f59e0b" />
            {/* Curled Parchment Body */}
            <Path d="M 12 15 C 24 12 40 12 52 15 L 52 47 C 40 44 24 44 12 47 Z" fill="url(#scrollParchment)" stroke="#b45309" strokeWidth={0.8} />
            {/* Ancient Text Lines */}
            <Path d="M 18 21 L 46 21 M 18 26 L 46 26 M 18 31 L 46 31 M 18 36 L 40 36" stroke="#92400e" strokeWidth={1} strokeLinecap="round" opacity={0.45} />
            {/* Red Wax Seal */}
            <Circle cx="32" cy="44" r="7" fill="url(#sealGrad)" />
            <Path d="M 32 39 L 32 49 M 27 44 L 37 44" stroke="#fef08a" strokeWidth={1.2} strokeLinecap="round" />
          </Svg>
        );

      // 3. BookMarked: 3D Bound Scripture with embossed gold cross
      case 'BookMarked':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="bmCover" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#2563eb" />
                <Stop offset="100%" stopColor="#1e3a8a" />
              </SvgLinearGradient>
              <SvgLinearGradient id="bmGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="60%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Book Spine Extrusion */}
            <Path d="M 12 14 L 16 12 L 48 12 L 44 14 L 12 14 Z" fill="#1e3a8a" />
            <Path d="M 44 14 L 48 12 L 48 50 L 44 52 Z" fill="#d97706" />
            {/* Front Cover */}
            <Rect x="12" y="14" width="34" height="38" rx="3" fill="url(#bmCover)" stroke="#3b82f6" strokeWidth={1} />
            {/* Embossed Cross */}
            <Path d="M 29 22 L 29 38 M 23 27 L 35 27" stroke="url(#bmGold)" strokeWidth={3} strokeLinecap="round" />
            {/* Hanging Satin Ribbon */}
            <Path d="M 36 12 L 36 28 L 40 25 L 44 28 L 44 12 Z" fill="url(#bmGold)" />
          </Svg>
        );

      // 4. Users: 3D Twin Biblical Patriarchs Medallions
      case 'Users':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="userHalo1" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="50%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgRadialGradient>
              <SvgLinearGradient id="userGrad2" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#38bdf8" />
                <Stop offset="100%" stopColor="#0369a1" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="22" ry="4" fill="#000000" opacity={0.25} />
            {/* Background Figure */}
            <Circle cx="41" cy="22" r="10" fill="url(#userGrad2)" />
            <Path d="M 29 50 C 29 38 53 38 53 50 Z" fill="url(#userGrad2)" />
            {/* Foreground Main Figure */}
            <Circle cx="24" cy="22" r="12" fill="url(#userHalo1)" stroke="#b45309" strokeWidth={1} />
            <Circle cx="24" cy="20" r="4.5" fill="#fffbeb" opacity={0.5} />
            <Path d="M 9 52 C 9 37 39 37 39 52 Z" fill="url(#userHalo1)" stroke="#b45309" strokeWidth={1} />
            {/* Halo ring */}
            <Circle cx="24" cy="22" r="14" stroke="#fef08a" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.8} />
          </Svg>
        );

      // 5. Shield: 3D Knight's Shield of Faith with gold cross
      case 'Shield':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="shieldMetallic" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#60a5fa" />
                <Stop offset="50%" stopColor="#2563eb" />
                <Stop offset="100%" stopColor="#1e3a8a" />
              </SvgLinearGradient>
              <SvgLinearGradient id="shieldGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="60%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Outer Beveled Shield */}
            <Path d="M 32 8 L 52 16 C 52 38 32 52 32 52 C 32 52 12 38 12 16 Z" fill="url(#shieldMetallic)" stroke="url(#shieldGold)" strokeWidth={2} />
            {/* Left Facet Highlight */}
            <Path d="M 32 9 L 14 17 C 14 36 32 49 32 49 Z" fill="#ffffff" opacity={0.15} />
            {/* Embossed Center Cross */}
            <Path d="M 32 18 L 32 42 M 22 26 L 42 26" stroke="url(#shieldGold)" strokeWidth={3.5} strokeLinecap="round" />
            <Circle cx="32" cy="26" r="3" fill="#fef08a" />
          </Svg>
        );

      // 6. Flame: 3D Multi-tier Pentecost Holy Spirit Fire
      case 'Flame':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor="#dc2626" />
                <Stop offset="60%" stopColor="#ea580c" />
                <Stop offset="100%" stopColor="#f59e0b" />
              </SvgLinearGradient>
              <SvgLinearGradient id="flameCore" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor="#f59e0b" />
                <Stop offset="70%" stopColor="#fef08a" />
                <Stop offset="100%" stopColor="#ffffff" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="18" ry="4" fill="#ea580c" opacity={0.3} />
            {/* Outer Flame */}
            <Path d="M 32 6 C 36 18 52 24 52 38 C 52 48 42 54 32 54 C 22 54 12 48 12 38 C 12 24 28 18 32 6 Z" fill="url(#flameOuter)" />
            {/* Mid Flame */}
            <Path d="M 32 16 C 35 24 44 28 44 39 C 44 46 38 50 32 50 C 26 50 20 46 20 39 C 20 28 29 24 32 16 Z" fill="#f97316" />
            {/* Inner White Hot Core */}
            <Path d="M 32 26 C 34 32 38 35 38 42 C 38 46 35 48 32 48 C 29 48 26 46 26 42 C 26 35 30 32 32 26 Z" fill="url(#flameCore)" />
            {/* Sparks */}
            <Circle cx="20" cy="18" r="1.8" fill="#fef08a" />
            <Circle cx="44" cy="14" r="2.2" fill="#fef08a" />
          </Svg>
        );

      // 7. Compass: 3D Brass Nautical Compass with rose star
      case 'Compass':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="compassDial" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="70%" stopColor="#fef3c7" />
                <Stop offset="100%" stopColor="#fde68a" />
              </SvgRadialGradient>
              <SvgLinearGradient id="compassBrass" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="50%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Top Loop */}
            <Circle cx="32" cy="10" r="5" stroke="url(#compassBrass)" strokeWidth={2.5} />
            {/* Outer Brass Ring */}
            <Circle cx="32" cy="34" r="20" fill="url(#compassBrass)" />
            {/* Inner Face */}
            <Circle cx="32" cy="34" r="16" fill="url(#compassDial)" stroke="#b45309" strokeWidth={1} />
            {/* North Red Pointer */}
            <Path d="M 32 21 L 35 34 L 32 32 L 29 34 Z" fill="#ef4444" />
            {/* South Blue Pointer */}
            <Path d="M 32 47 L 35 34 L 32 36 L 29 34 Z" fill="#2563eb" />
            {/* Center Pivot Gem */}
            <Circle cx="32" cy="34" r="3" fill="#b45309" />
            <Circle cx="32" cy="34" r="1.2" fill="#fef08a" />
          </Svg>
        );

      // 8. Heart: 3D Glossy Ruby Heart
      case 'Heart':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="heartRuby" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#fca5a5" />
                <Stop offset="40%" stopColor="#ef4444" />
                <Stop offset="80%" stopColor="#b91c1c" />
                <Stop offset="100%" stopColor="#7f1d1d" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="18" ry="4" fill="#000000" opacity={0.25} />
            {/* 3D Extruded Depth */}
            <Path d="M 32 18 C 32 18 20 6 10 16 C 0 26 12 40 32 53 C 52 40 64 26 54 16 C 44 6 32 18 32 18 Z" fill="#7f1d1d" transform="translate(0, 3)" />
            {/* Main Heart Face */}
            <Path d="M 32 18 C 32 18 20 6 10 16 C 0 26 12 40 32 53 C 52 40 64 26 54 16 C 44 6 32 18 32 18 Z" fill="url(#heartRuby)" />
            {/* Specular Glint */}
            <Path d="M 16 18 C 18 14 24 13 26 16" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          </Svg>
        );

      // 9. Sparkles: 3D Starburst Diamond Miracles Cluster
      case 'Sparkles':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="diamondGrad" cx="35%" cy="35%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="50%" stopColor="#fef08a" />
                <Stop offset="80%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#d97706" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="16" ry="3.5" fill="#000000" opacity={0.25} />
            {/* Central Radiant 3D Diamond Star */}
            <Path d="M 32 8 L 36 28 L 56 32 L 36 36 L 32 56 L 28 36 L 8 32 L 28 28 Z" fill="url(#diamondGrad)" />
            {/* Facet Highlights */}
            <Path d="M 32 8 L 36 28 L 32 32 Z" fill="#ffffff" opacity={0.8} />
            <Path d="M 32 56 L 28 36 L 32 32 Z" fill="#b45309" opacity={0.6} />
            {/* Satellite Stars */}
            <Circle cx="16" cy="16" r="3.5" fill="#fef08a" />
            <Circle cx="48" cy="18" r="4.5" fill="#fef08a" />
            <Circle cx="46" cy="46" r="3" fill="#fef08a" />
          </Svg>
        );

      // 10. Feather: 3D Golden Quill Pen of Prophecy
      case 'Feather':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="featherGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="40%" stopColor="#fed7aa" />
                <Stop offset="80%" stopColor="#f97316" />
                <Stop offset="100%" stopColor="#c2410c" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="16" ry="3.5" fill="#000000" opacity={0.25} />
            {/* 3D Quill Vanes */}
            <Path d="M 48 8 C 30 14 16 32 16 48 L 22 48 C 24 38 34 26 52 14 Z" fill="url(#featherGrad)" stroke="#c2410c" strokeWidth={0.8} />
            {/* Golden Shaft / Spine */}
            <Path d="M 50 6 L 16 52" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
            {/* Ink Nib */}
            <Path d="M 16 52 L 12 56 L 18 53 Z" fill="#1e1b4b" />
          </Svg>
        );

      // 11. CheckSquare: 3D Arched Stone Tablets of the Covenant
      case 'CheckSquare':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="stoneTablet" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#e2e8f0" />
                <Stop offset="60%" stopColor="#94a3b8" />
                <Stop offset="100%" stopColor="#475569" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Left Tablet */}
            <Path d="M 12 24 C 12 14 20 12 26 14 C 28 14 28 48 28 48 L 12 48 Z" fill="url(#stoneTablet)" stroke="#334155" strokeWidth={1} />
            {/* Right Tablet */}
            <Path d="M 36 14 C 42 12 50 14 50 24 L 50 48 L 34 48 C 34 48 34 14 36 14 Z" fill="url(#stoneTablet)" stroke="#334155" strokeWidth={1} />
            {/* Inscribed Commandment Lines Left */}
            <Path d="M 16 22 L 24 22 M 16 28 L 24 28 M 16 34 L 24 34 M 16 40 L 24 40" stroke="#fef08a" strokeWidth={1.5} strokeLinecap="round" />
            {/* Inscribed Commandment Lines Right */}
            <Path d="M 38 22 L 46 22 M 38 28 L 46 28 M 38 34 L 46 34 M 38 40 L 46 40" stroke="#fef08a" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );

      // 12. Sun: 3D Golden Sunburst of Praise & Worship
      case 'Sun':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="sunCore" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="40%" stopColor="#fef08a" />
                <Stop offset="80%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#d97706" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="18" ry="4" fill="#000000" opacity={0.25} />
            {/* 3D Rays */}
            <Path d="M 32 8 L 32 16 M 32 48 L 32 56 M 8 32 L 16 32 M 48 32 L 56 32 M 15 15 L 21 21 M 43 43 L 49 49 M 15 49 L 21 43 M 43 21 L 49 15" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
            {/* Center Glossy Sphere */}
            <Circle cx="32" cy="32" r="14" fill="url(#sunCore)" stroke="#b45309" strokeWidth={1.2} />
            {/* Specular Highlight */}
            <Circle cx="28" cy="27" r="3.5" fill="#ffffff" opacity={0.75} />
          </Svg>
        );

      // 13. Church: 3D Sanctuary Cathedral with Steeple & Cross
      case 'Church':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="churchStone" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#a78bfa" />
                <Stop offset="60%" stopColor="#7c3aed" />
                <Stop offset="100%" stopColor="#4c1d95" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="56" rx="22" ry="4" fill="#000000" opacity={0.25} />
            {/* Sanctuary Body */}
            <Path d="M 12 36 L 52 36 L 52 52 L 12 52 Z" fill="url(#churchStone)" stroke="#312e81" strokeWidth={1} />
            {/* Pitched Roof */}
            <Path d="M 10 36 L 32 20 L 54 36 Z" fill="#6d28d9" />
            {/* Center Steeple */}
            <Path d="M 26 24 L 32 8 L 38 24 Z" fill="#f59e0b" />
            {/* Golden Cross on Steeple */}
            <Path d="M 32 4 L 32 10 M 29 6 L 35 6" stroke="#fef08a" strokeWidth={2} strokeLinecap="round" />
            {/* Arched Door */}
            <Path d="M 28 52 L 28 42 C 28 40 36 40 36 42 L 36 52 Z" fill="#fef08a" />
          </Svg>
        );

      // 14. Globe: 3D Rotating Earth Sphere with gold longitude bands
      case 'Globe':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="globeGrad" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#67e8f9" />
                <Stop offset="50%" stopColor="#0891b2" />
                <Stop offset="100%" stopColor="#164e63" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* 3D Sphere */}
            <Circle cx="32" cy="32" r="18" fill="url(#globeGrad)" stroke="#0e7490" strokeWidth={1} />
            {/* Longitude and Latitude Bands */}
            <Ellipse cx="32" cy="32" rx="9" ry="18" stroke="#fef08a" strokeWidth={0.9} fill="none" opacity={0.65} />
            <Path d="M 14 32 L 50 32" stroke="#fef08a" strokeWidth={0.9} opacity={0.65} />
            <Path d="M 17 24 C 24 28 40 28 47 24" stroke="#fef08a" strokeWidth={0.9} fill="none" opacity={0.65} />
            <Path d="M 17 40 C 24 36 40 36 47 40" stroke="#fef08a" strokeWidth={0.9} fill="none" opacity={0.65} />
            {/* Specular Highlight */}
            <Circle cx="26" cy="24" r="4" fill="#ffffff" opacity={0.6} />
          </Svg>
        );

      // 15. Smile: 3D Cheerful Golden Emoji
      case 'Smile':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="smileGrad" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="50%" stopColor="#f59e0b" />
                <Stop offset="90%" stopColor="#d97706" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="18" ry="4" fill="#000000" opacity={0.25} />
            {/* 3D Round Face */}
            <Circle cx="32" cy="32" r="18" fill="url(#smileGrad)" stroke="#b45309" strokeWidth={1.2} />
            {/* Happy Eyes */}
            <Path d="M 23 28 C 23 25 27 25 27 28" stroke="#78350f" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 37 28 C 37 25 41 25 41 28" stroke="#78350f" strokeWidth={2.2} strokeLinecap="round" />
            {/* Sparkling Star in Right Eye */}
            <Circle cx="40" cy="24" r="1.5" fill="#ffffff" />
            {/* Big Grin */}
            <Path d="M 22 35 C 22 43 42 43 42 35 Z" fill="#78350f" />
            {/* Rosy Cheeks */}
            <Circle cx="20" cy="33" r="3" fill="#f87171" opacity={0.45} />
            <Circle cx="44" cy="33" r="3" fill="#f87171" opacity={0.45} />
          </Svg>
        );

      // 16. Crown: 3D Royal Imperial Crown
      case 'Crown':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#fef08a" />
                <Stop offset="40%" stopColor="#f59e0b" />
                <Stop offset="80%" stopColor="#d97706" />
                <Stop offset="100%" stopColor="#92400e" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Crown Base Rim */}
            <Path d="M 12 44 L 52 44 L 48 49 L 16 49 Z" fill="#92400e" />
            {/* Crown Peaks */}
            <Path d="M 12 44 L 16 22 L 25 34 L 32 16 L 39 34 L 48 22 L 52 44 Z" fill="url(#crownGrad)" stroke="#b45309" strokeWidth={1} />
            {/* Jewels on Peaks */}
            <Circle cx="16" cy="22" r="3" fill="#ef4444" />
            <Circle cx="32" cy="16" r="3.5" fill="#38bdf8" />
            <Circle cx="48" cy="22" r="3" fill="#10b981" />
            {/* Lower Rim Gemstones */}
            <Circle cx="24" cy="46" r="2" fill="#ef4444" />
            <Circle cx="32" cy="46" r="2" fill="#38bdf8" />
            <Circle cx="40" cy="46" r="2" fill="#10b981" />
          </Svg>
        );

      // 17. Trophy: 3D Golden Championship Cup
      case 'Trophy':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgRadialGradient id="trophyGold" cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#fffbeb" />
                <Stop offset="30%" stopColor="#fef08a" />
                <Stop offset="70%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </SvgRadialGradient>
            </Defs>
            <Ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" opacity={0.25} />
            {/* Base Pedestal */}
            <Path d="M 22 52 L 42 52 L 40 46 L 24 46 Z" fill="#78350f" />
            <Path d="M 30 46 L 34 46 L 34 40 L 30 40 Z" fill="#b45309" />
            {/* Flared Handles */}
            <Path d="M 18 20 C 10 20 10 34 20 34" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" fill="none" />
            <Path d="M 46 20 C 54 20 54 34 44 34" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" fill="none" />
            {/* Main Cup */}
            <Path d="M 18 16 L 46 16 C 46 32 38 40 32 40 C 26 40 18 32 18 16 Z" fill="url(#trophyGold)" stroke="#b45309" strokeWidth={1} />
            {/* Embossed #1 Star */}
            <Circle cx="32" cy="26" r="4.5" fill="#fffbeb" opacity={0.8} />
          </Svg>
        );

      // 18. GraduationCap: 3D Scholar Mortarboard
      case 'GraduationCap':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#312e81" />
                <Stop offset="60%" stopColor="#1e1b4b" />
                <Stop offset="100%" stopColor="#0f172a" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="20" ry="4" fill="#000000" opacity={0.25} />
            {/* Skull Cap Base */}
            <Path d="M 22 32 C 22 42 42 42 42 32 Z" fill="#1e1b4b" />
            {/* Top Diamond Plate */}
            <Path d="M 32 12 L 56 24 L 32 36 L 8 24 Z" fill="url(#capGrad)" stroke="#4338ca" strokeWidth={1} />
            {/* Center Button */}
            <Circle cx="32" cy="24" r="2.5" fill="#f59e0b" />
            {/* Dangling Golden Tassel */}
            <Path d="M 32 24 C 36 26 48 30 48 38 L 48 44" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" fill="none" />
          </Svg>
        );

      // 19. Zap: 3D Lightning Bolt
      case 'Zap':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="zapGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="30%" stopColor="#fef08a" />
                <Stop offset="70%" stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#ea580c" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="16" ry="3.5" fill="#f59e0b" opacity={0.3} />
            {/* 3D Extruded Depth */}
            <Path d="M 36 6 L 16 34 L 30 34 L 24 56 L 48 26 L 34 26 Z" fill="#9a3412" transform="translate(2, 2)" />
            {/* Front Bolt */}
            <Path d="M 36 6 L 16 34 L 30 34 L 24 56 L 48 26 L 34 26 Z" fill="url(#zapGrad)" stroke="#fef08a" strokeWidth={1} />
          </Svg>
        );

      // 20. ShieldCheck: 3D Shield of Truth with Checkmark
      case 'ShieldCheck':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <SvgLinearGradient id="scShield" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#34d399" />
                <Stop offset="60%" stopColor="#059669" />
                <Stop offset="100%" stopColor="#064e3b" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="32" cy="55" rx="18" ry="4" fill="#000000" opacity={0.25} />
            <Path d="M 32 8 L 52 16 C 52 38 32 52 32 52 C 32 52 12 38 12 16 Z" fill="url(#scShield)" stroke="#a7f3d0" strokeWidth={1.8} />
            {/* Golden Checkmark */}
            <Path d="M 23 28 L 29 35 L 42 20" stroke="#fef08a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );

      // Default fallback
      default:
        return null;
    }
  };

  const svg3d = render3DSvg();
  if (svg3d) {
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
        {svg3d}
      </View>
    );
  }

  // Graceful fallback to Lucide with soft dimensional glow
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <BookOpen size={size * 0.65} color={color} strokeWidth={2.2} />
    </View>
  );
}
