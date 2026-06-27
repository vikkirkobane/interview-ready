import { useUIStore } from '../stores/ui-store';
import { lightColors, darkColors } from './tokens';

export function useTheme() {
  const isDark = useUIStore((s) => s.isDark);

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
}
