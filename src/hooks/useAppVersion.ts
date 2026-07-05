import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

interface VersionCheckResult {
  is_valid: boolean;
  needs_update: boolean;
  force_update: boolean;
  current_version: string;
  minimum_version: string;
  latest_version: string;
  message: string;
  store_url: string | null;
  platform: string;
}

interface UseAppVersionReturn {
  isChecking: boolean;
  isValid: boolean;
  needsUpdate: boolean;
  forceUpdate: boolean;
  versionInfo: VersionCheckResult | null;
  error: string | null;
  checkVersion: () => Promise<void>;
}

/**
 * Hook to check if the current app version meets minimum requirements
 * Automatically checks on mount and provides version status
 */
export function useAppVersion(): UseAppVersionReturn {
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkVersion = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Get current app version from app.json via expo-constants
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      
      // Get platform
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      // Call edge function to check version
      const { data, error: functionError } = await supabase.functions.invoke(
        'app-version-check',
        {
          body: {
            platform,
            currentVersion,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to check app version');
      }

      const result: VersionCheckResult = data.data;

      // Update state
      setVersionInfo(result);
      setIsValid(result.is_valid);
      setNeedsUpdate(result.needs_update);
      setForceUpdate(result.force_update);

      // Log version check result
      console.log('App version check:', {
        current: result.current_version,
        minimum: result.minimum_version,
        latest: result.latest_version,
        needs_update: result.needs_update,
        force_update: result.force_update,
      });
    } catch (err) {
      console.error('Error checking app version:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // On error, allow access (fail open)
      setIsValid(true);
      setNeedsUpdate(false);
      setForceUpdate(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Check version on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkVersion();
  }, []);

  return {
    isChecking,
    isValid,
    needsUpdate,
    forceUpdate,
    versionInfo,
    error,
    checkVersion,
  };
}
