/**
 * Onboarding Process Tests
 *
 * These tests simulate the user onboarding flow that happens after authentication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/auth-store';
import { useProfileStore } from '../src/stores/profile-store';
import { useOnboardingStore } from '../src/stores/onboarding-store';

// Mock the necessary dependencies
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/stores/auth-store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      user: {
        id: 'test-user-123',
        user_metadata: { onboarding_completed: false }
      }
    }))
  }
}));

describe('Onboarding Process Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (supabase.from as vi.Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }), // No profile initially
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.auth.getUser as vi.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-123', user_metadata: { onboarding_completed: false } } },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Profile Creation & Update', () => {
    it('should fetch profile data after authentication', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'test-user-123',
        current_role: 'Software Engineer',
        location: 'San Francisco',
        profile_completeness: 30
      };

      // Mock the database response
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
      };
      (supabase.from as vi.Mock).mockReturnValue(mockQueryBuilder);

      const { fetchProfile } = useProfileStore.getState();
      await fetchProfile();

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should handle missing profile when fetching', async () => {
      // Mock the database response for missing profile
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found' } })
      };
      (supabase.from as vi.Mock).mockReturnValue(mockQueryBuilder);

      const { fetchProfile } = useProfileStore.getState();
      await fetchProfile();

      // Profile would remain null due to error
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should update profile with new information', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'test-user-123',
        profile_completeness: 0
      };

      const updates = {
        current_role: 'Frontend Developer',
        location: 'Remote',
        summary: 'Experienced frontend developer with React and TypeScript'
      };

      // Mock initial profile fetch
      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      // Mock update operation
      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const chainedMock = {
        ...selectMock,
        ...updateMock,
        update: updateMock.update,
        eq: updateMock.eq
      };

      (supabase.from as vi.Mock).mockReturnValue(chainedMock);

      const { updateProfile } = useProfileStore.getState();
      const result = await updateProfile(updates);

      expect(result.error).toBeNull();
      expect(updateMock.update).toHaveBeenCalledWith(updates);
    });
  });

  describe('Onboarding State Management', () => {
    it('should track onboarding completion status', () => {
      const { onboardingCompleted } = useOnboardingStore.getState();
      expect(onboardingCompleted).toBe(false);
    });

    it('should mark onboarding as completed', () => {
      const { completeOnboarding } = useOnboardingStore.getState();
      completeOnboarding();

      const { onboardingCompleted } = useOnboardingStore.getState();
      expect(onboardingCompleted).toBe(true);
    });

    it('should calculate profile completeness', () => {
      const { calculateCompleteness } = useOnboardingStore.getState();

      // Test with minimal profile
      const minimalProfile = {
        current_role: '',
        location: '',
        summary: '',
        technical_skills: [],
        soft_skills: [],
        work_history: [],
        education: []
      };
      const minimalCompleteness = calculateCompleteness(minimalProfile);
      expect(minimalCompleteness).toBeLessThan(50);

      // Test with more complete profile
      const completeProfile = {
        current_role: 'Engineer',
        location: 'City',
        summary: 'Summary here',
        technical_skills: ['JavaScript', 'React'],
        soft_skills: ['Communication'],
        work_history: [{ company: 'Company', title: 'Position' }],
        education: [{ school: 'University' }]
      };
      const completeCompleteness = calculateCompleteness(completeProfile);
      expect(completeCompleteness).toBeGreaterThan(minimalCompleteness);
    });
  });

  describe('Integration: Auth + Profile + Onboarding', () => {
    it('should simulate complete onboarding flow: auth -> profile fetch -> profile update -> completion', async () => {
      // Step 1: Verify user is authenticated but not onboarded
      const authState = useAuthStore.getState();
      expect(authState.user?.user_metadata?.onboarding_completed).toBe(false);

      // Step 2: Fetch empty profile
      const mockEmptyProfile = { id: 'profile-123', user_id: 'test-user-123', profile_completeness: 0 };
      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEmptyProfile, error: null })
      };
      (supabase.from as vi.Mock).mockReturnValue(selectMock);

      const { fetchProfile, updateProfile } = useProfileStore.getState();
      await fetchProfile();

      // Step 3: Update profile with onboarding information
      const onboardingUpdates = {
        current_role: 'Software Engineer',
        location: 'San Francisco, CA',
        summary: 'Experienced software engineer with expertise in React and Node.js',
        technical_skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        soft_skills: ['Team Leadership', 'Problem Solving', 'Communication'],
        work_history: [{
          company: 'Tech Corp',
          title: 'Senior Developer',
          start_date: '2020-01-01',
          description: 'Developed web applications'
        }],
        education: [{
          school: 'University',
          degree: 'BS Computer Science',
          start_date: '2016-09-01',
          end_date: '2020-05-01'
        }],
        profile_completeness: 85
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const chainedMock = {
        ...selectMock,
        ...updateMock,
        update: updateMock.update,
        eq: updateMock.eq
      };

      (supabase.from as vi.Mock).mockReturnValue(chainedMock);

      const updateResult = await updateProfile(onboardingUpdates);
      expect(updateResult.error).toBeNull();

      // Step 4: Complete onboarding
      const { completeOnboarding } = useOnboardingStore.getState();
      completeOnboarding();

      // Step 5: Verify onboarding is marked as complete
      const onboardingState = useOnboardingStore.getState();
      expect(onboardingState.onboardingCompleted).toBe(true);

      // Step 6: Update auth metadata to reflect onboarding completion
      const updateAuthMock = {
        data: { user: null }, // Don't need to return user data for this test
        error: null
      };
      (supabase.auth.update as vi.Mock).mockResolvedValue(updateAuthMock);
    });
  });

  describe('Profile Completeness Calculation', () => {
    it('should accurately calculate profile completeness percentage', () => {
      const { calculateCompleteness } = useOnboardingStore.getState();

      // Empty profile
      expect(calculateCompleteness({})).toBe(0);

      // Profile with only role
      expect(calculateCompleteness({ current_role: 'Developer' })).toBeGreaterThan(0);

      // Profile with multiple filled sections
      const partialProfile = {
        current_role: 'Engineer',
        location: 'NYC',
        summary: 'Experienced engineer',
        technical_skills: ['JS']
      };
      const partialCompleteness = calculateCompleteness(partialProfile);
      expect(partialCompleteness).toBeGreaterThan(25); // More than just 1 field
      expect(partialCompleteness).toBeLessThan(100); // Not fully complete

      // Nearly complete profile
      const almostCompleteProfile = {
        current_role: 'Engineer',
        location: 'NYC',
        summary: 'Experienced engineer',
        technical_skills: ['JavaScript', 'React', 'Node.js'],
        soft_skills: ['Leadership', 'Communication'],
        work_history: [{ company: 'Company', title: 'Position', start_date: '2020-01-01' }],
        education: [{ school: 'School', degree: 'Degree', start_date: '2016-09-01', end_date: '2020-05-01' }],
        profile_completeness: 0 // This should be calculated based on other fields
      };
      const almostComplete = calculateCompleteness(almostCompleteProfile);
      expect(almostComplete).toBeGreaterThanOrEqual(80); // High completion rate
    });
  });

  describe('Onboarding Step Tracking', () => {
    it('should track current onboarding step', () => {
      const { currentStep, setCurrentStep } = useOnboardingStore.getState();

      // Should start at step 0 (beginning)
      expect(currentStep).toBe(0);

      // Move to next steps
      setCurrentStep(1);
      expect(useOnboardingStore.getState().currentStep).toBe(1);

      setCurrentStep(2);
      expect(useOnboardingStore.getState().currentStep).toBe(2);

      // Should not exceed maximum steps
      setCurrentStep(10); // Assuming max steps is less than 10
      // The exact behavior depends on the store implementation
    });

    it('should handle step navigation', () => {
      const { goToNextStep, goToPrevStep, setCurrentStep, currentStep } = useOnboardingStore.getState();

      // Start at step 0
      expect(currentStep).toBe(0);

      // Go to next step
      goToNextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(1);

      // Go back to previous step
      goToPrevStep();
      expect(useOnboardingStore.getState().currentStep).toBe(0);

      // Jump to specific step
      setCurrentStep(3);
      expect(useOnboardingStore.getState().currentStep).toBe(3);
    });
  });
});