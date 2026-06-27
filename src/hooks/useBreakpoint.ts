import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints roughly map to Tailwind defaults:
 * md: 768px (Tablet)
 * lg: 1024px (Desktop/Laptop)
 */
export const BREAKPOINTS = {
  md: 768,
  lg: 1024,
};

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    width,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
  };
}
