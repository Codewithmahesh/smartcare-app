export const COLORS = {
  primary: '#0A8F5C',
  primaryDark: '#076E47',
  primaryLight: '#E6F7F1',
  primaryMid: '#B7E8D4',
  secondary: '#FF6B35',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F7FAFC',
  border: '#E2ECF0',
  borderLight: '#EEF4F7',
  text: '#12233A',
  textSecondary: '#5A7184',
  textMuted: '#9CB0BE',
  error: '#E03E3E',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  urgent: '#E03E3E',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(10,30,50,0.55)',
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  semibold: { fontFamily: 'System', fontWeight: '600' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
  black: { fontFamily: 'System', fontWeight: '900' as const },
};

export const RADIUS = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, full: 999 };
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 };

export const SHADOW = {
  xs: {
    shadowColor: '#0A3020', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  sm: {
    shadowColor: '#0A3020', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  md: {
    shadowColor: '#0A3020', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  lg: {
    shadowColor: '#0A3020', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 8,
  },
};
