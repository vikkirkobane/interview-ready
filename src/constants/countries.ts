// Country list with ISO codes and flags for payment selection
export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  isKenya: boolean;
}

export const COUNTRIES: Country[] = [
  // Africa
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', isKenya: true },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'USD', isKenya: false },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'USD', isKenya: false },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'USD', isKenya: false },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'USD', isKenya: false },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'USD', isKenya: false },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'USD', isKenya: false },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'USD', isKenya: false },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'USD', isKenya: false },
  
  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', isKenya: false },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'USD', isKenya: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'USD', isKenya: false },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'USD', isKenya: false },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'USD', isKenya: false },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'USD', isKenya: false },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'USD', isKenya: false },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'USD', isKenya: false },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'USD', isKenya: false },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'USD', isKenya: false },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'USD', isKenya: false },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'USD', isKenya: false },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'USD', isKenya: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'USD', isKenya: false },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'USD', isKenya: false },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'USD', isKenya: false },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'USD', isKenya: false },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'USD', isKenya: false },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'USD', isKenya: false },
  
  // Asia
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'USD', isKenya: false },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'USD', isKenya: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'USD', isKenya: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'USD', isKenya: false },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'USD', isKenya: false },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'USD', isKenya: false },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'USD', isKenya: false },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'USD', isKenya: false },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'USD', isKenya: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'USD', isKenya: false },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'USD', isKenya: false },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'USD', isKenya: false },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'USD', isKenya: false },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'USD', isKenya: false },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'USD', isKenya: false },
  
  // Oceania
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'USD', isKenya: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'USD', isKenya: false },
  
  // South America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'USD', isKenya: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'USD', isKenya: false },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'USD', isKenya: false },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'USD', isKenya: false },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'USD', isKenya: false },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(c => c.code === code);
};

export const getPaymentMethods = (country: Country): string[] => {
  if (country.isKenya) {
    return ['M-Pesa', 'Card'];
  }
  return ['Card'];
};
