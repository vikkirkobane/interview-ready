// Futuristic SaaS Design Tokens
// "Million Dollar" Aesthetic - Icon-Free, Animation-Rich, Clean Geometry

export const lightColors = {
  // Futuristic Light Theme
  primary: '#0055FF', // Electric Blue
  primaryContainer: '#E5EEFF',
  onPrimary: '#FFFFFF',
  
  tertiary: '#0033AA',
  
  surface: '#FFFFFF',
  onSurface: '#111111',
  
  bgPrimary: '#FAFAFA', // Ultra-clean almost white
  bgSecondary: '#F0F0F0', // Subtle glass-like background
  bgCard: '#FFFFFF',
  bgMuted: '#EAEAEA',
  
  // Semantic
  success: '#00D15E', // Neon green tint
  successLight: '#E5FBF0',
  warning: '#FF9900', // Warning amber
  warningLight: '#FFF5E5',
  error: '#FF2A2A', // Vivid red
  errorLight: '#FFEAEA',

  // Text
  textPrimary: '#0A0A0A',
  textBody: '#2A2A2A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textDisabled: '#CCCCCC',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E5E5',
  borderFocus: '#0055FF', // Electric blue glow
  borderGlass: 'rgba(0, 0, 0, 0.05)',

  // Legacy mappings
  violet: '#0055FF', 
  violetLight: '#E5EEFF', 
  violetDark: '#0033AA', 
  primaryLight: '#E5EEFF',
  primaryDark: '#0033AA',

  // Score tiers
  scoreHigh: '#00D15E',
  scoreMid: '#FF9900',
  scoreLow: '#FF2A2A',
};

export const darkColors = {
  // Futuristic Dark Theme (Deep blacks + Neon accents)
  primary: '#3377FF', // Brighter blue for dark mode
  primaryContainer: '#002266',
  onPrimary: '#FFFFFF',
  
  tertiary: '#6699FF',
  
  surface: '#111111',
  onSurface: '#FFFFFF',
  
  bgPrimary: '#050505', // True deep space black
  bgSecondary: '#111111',
  bgCard: '#161616',
  bgMuted: '#222222',
  
  // Semantic
  success: '#00E676', // Bright neon green
  successLight: '#00331A',
  warning: '#FFAB00',
  warningLight: '#332200',
  error: '#FF5555',
  errorLight: '#331111',

  // Text
  textPrimary: '#FFFFFF',
  textBody: '#EAEAEA',
  textSecondary: '#AAAAAA',
  textMuted: '#777777',
  textDisabled: '#444444',
  textInverse: '#0A0A0A',

  // Borders
  border: '#2A2A2A',
  borderFocus: '#3377FF', // Neon blue glow
  borderGlass: 'rgba(255, 255, 255, 0.05)',

  // Legacy mappings
  violet: '#3377FF', 
  violetLight: '#002266', 
  violetDark: '#6699FF', 
  primaryLight: '#002266',
  primaryDark: '#6699FF',

  // Score tiers
  scoreHigh: '#00E676',
  scoreMid: '#FFAB00',
  scoreLow: '#FF5555',
};

// Export lightColors as default Colors for legacy code that doesn't use the provider
// But ideally, components should read from a ThemeContext.
export const Colors = lightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  gutter: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenEdge: 24,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0055FF', // Neon glow effect for larger shadows
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 10,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const Typography = {
  displayLg: { fontSize: 36, fontWeight: '800' as const, lineHeight: 44, letterSpacing: -1 },
  displayMd: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.5 },
  headingLg: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30, letterSpacing: -0.3 },
  headingMd: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
  subtitle1: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0 },
  subtitle2: { fontSize: 14, fontWeight: '600' as const, lineHeight: 22, letterSpacing: 0 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0.1 },
  bodyMd: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0.1 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0.2 },
  label: { fontSize: 11, fontWeight: '700' as const, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  mono: { fontFamily: 'Courier', fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
} as const;

export const Animations = {
  spring: {
    stiff: { damping: 15, stiffness: 200, mass: 1 },
    bouncy: { damping: 10, stiffness: 150, mass: 1 },
    soft: { damping: 20, stiffness: 100, mass: 1 },
  },
  timing: {
    fast: 150,
    base: 300,
    slow: 500,
  }
} as const;

export function getScoreColor(score: number): string {
  if (score >= 80) return lightColors.scoreHigh;
  if (score >= 60) return lightColors.scoreMid;
  return lightColors.scoreLow;
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Needs Work';
}
