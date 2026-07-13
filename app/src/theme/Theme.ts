/**
 * Church of God (COG) Mobile App
 * Design System & Theme Configuration
 * High-Fidelity Navy, Gold, and Red Palette
 */

export const Colors = {
  // ── BRAND IDENTITY ──
  primary: '#1a2d5a',      // Deep Navy (Headers, Branding)
  primaryLight: '#2c3e6b', // Lighter Navy for Gradients
  primarySub: '#aac4e8',   // Light Navy for Subtitles
  
  accent: '#c0392b',       // Signature Crimson Red (Actions, Buttons)
  accentLight: '#e74c3c',  // Lighter Red for Hover/Highlights
  
  gold: '#fbbf24',         // Premium Amber Gold (Highlights, Badges)
  goldLight: '#fef3c7',    // Soft Gold for Surface Tints
  
  // ── SURFACE & UI ──
  background: '#f0f2f7',   // Main Screen Background
  surface: '#ffffff',      // Card & Container Background
  border: '#e5e7eb',       // Light UI Borders
  
  // ── TYPOGRAPHY ──
  text: '#111827',         // Main Body Text
  textSecondary: '#6b7280',// Descriptions & Meta Data
  textMuted: '#9ca3af',    // Hint & Placeholder Text
  
  // ── STATUS ──
  success: '#15803d',
  error: '#dc2626',
  warning: '#b45309',
  info: '#1e40af',
  
  // ── TRANSPARENCIES ──
  overlay: 'rgba(26, 45, 90, 0.85)',
  whiteAlpha: 'rgba(255, 255, 255, 0.1)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  premium: {
    shadowColor: '#1a2d5a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  }
};

export const Theme = {
  Colors,
  Spacing,
  Shadows,
};

export default Theme;

export const colors = { ...Colors, bgPrimary: Colors.surface, bgSecondary: Colors.background, bgTertiary: '#F1F5F9', textPrimary: Colors.text, textTertiary: Colors.textMuted, borderStrong: '#CBD5E1', warningLight: Colors.goldLight, successLight: '#E1F5EE', primaryDark: '#0C447C', primaryMid: '#B5D4F4' };
export const spacing = Spacing;
export const shadow = { ...Shadows, card: Shadows.soft };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const typography = { h1: { fontSize: 22, fontWeight: '600' as const }, h2: { fontSize: 18, fontWeight: '600' as const }, h3: { fontSize: 16, fontWeight: '600' as const }, body: { fontSize: 14, fontWeight: '400' as const }, caption: { fontSize: 12, fontWeight: '400' as const }, label: { fontSize: 11, fontWeight: '500' as const } };
