/**
 * Database User Creation Process Test
 *
 * This test simulates the PostgreSQL trigger that automatically creates
 * user records when new auth users are registered.
 */

// This test focuses on the SQL logic that happens at the database level
const databaseUserCreationTest = `
-- TEST: Verify handle_new_user() function creates records correctly
BEGIN;

-- Insert a mock auth user to simulate signup
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
VALUES (
  'test-user-123',
  'test@example.com',
  '{"first_name": "Test", "last_name": "User", "avatar_url": "https://example.com/avatar.jpg"}'::jsonb,
  NOW(),
  NOW()
);

-- Verify that the trigger created corresponding records
DO $$
BEGIN
  -- Check if user was created in public.users
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = 'test-user-123'
    AND email = 'test@example.com'
    AND first_name = 'Test'
    AND last_name = 'User'
    AND ai_credits = 10  -- Default free tier credits
  ) THEN
    RAISE EXCEPTION 'User record not created in public.users';
  END IF;

  -- Check if profile was created in public.user_profiles
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = 'test-user-123'
    AND profile_completeness = 0  -- Starts at 0%
  ) THEN
    RAISE EXCEPTION 'User profile not created in public.user_profiles';
  END IF;

  -- Verify RLS policies allow user to access own data
  SET ROLE test_user;
  SET request.jwt.claims.text = '{"sub":"test-user-123"}';

  -- User should be able to see own record
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = 'test-user-123'
  ) THEN
    RAISE EXCEPTION 'RLS policy does not allow user to access own record';
  END IF;

  -- User should not be able to see other users' records
  IF EXISTS (
    SELECT 1 FROM public.users WHERE id != 'test-user-123'
  ) THEN
    RAISE EXCEPTION 'RLS policy allows user to access other records';
  END IF;

  RAISE NOTICE '✓ All database creation tests passed';
END $$;

ROLLBACK;
`;

// Let me also create a unit test for the auth sync edge function
const authSyncEdgeFunctionTest = `
/**
 * Edge Function Tests for auth-sync
 *
 * These tests verify the webhook that handles auth events
 */

const { Hono } = require('npm:hono@4.0.0');
const { createServiceClient } = require('../_shared/supabase-client.ts');
const { sendEmail } = require('../_shared/email-service.ts');

// Mock the required modules
jest.mock('../_shared/supabase-client.ts', () => ({
  createServiceClient: jest.fn()
}));

jest.mock('../_shared/email-service.ts', () => ({
  sendEmail: jest.fn()
}));

describe('Auth Sync Edge Function Tests', () => {
  let app;
  let mockServiceClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service client
    mockServiceClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    require('../_shared/supabase-client.ts').createServiceClient.mockReturnValue(mockServiceClient);

    // Import the app after mocking
    app = require('./index.ts').app;
  });

  describe('Handle User Sign Up', () => {
    it('should send welcome email when new user signs up', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        user_metadata: { first_name: 'New', last_name: 'User' }
      };

      // Mock the DB query for user data
      mockServiceClient.single.mockResolvedValueOnce({
        data: { first_name: 'New', ai_credits: 10 }
      });

      // Mock the email sending
      const mockSendEmail = require('../_shared/email-service.ts').sendEmail;
      mockSendEmail.mockResolvedValue({ success: true });

      const response = await app.request('/auth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.signed_up',
          data: { user: mockUser }
        })
      });

      expect(response.status).toBe(200);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          templateKey: 'welcome',
          templateVariables: {
            user_name: 'New',
            credits: '10'
          }
        })
      );
    });

    it('should use email prefix if no first name provided', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'hello@example.com',
        user_metadata: {}
      };

      // Mock the DB query for user data
      mockServiceClient.single.mockResolvedValueOnce({
        data: { first_name: null, ai_credits: 10 }
      });

      const mockSendEmail = require('../_shared/email-service.ts').sendEmail;
      mockSendEmail.mockResolvedValue({ success: true });

      const response = await app.request('/auth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.signed_up',
          data: { user: mockUser }
        })
      });

      expect(response.status).toBe(200);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateVariables: {
            user_name: 'hello', // Prefix from email
            credits: '10'
          }
        })
      );
    });

    it('should handle email sending failures gracefully', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'graceful@example.com',
        user_metadata: { first_name: 'Graceful', last_name: 'Failure' }
      };

      // Mock the DB query for user data
      mockServiceClient.single.mockResolvedValueOnce({
        data: { first_name: 'Graceful', ai_credits: 10 }
      });

      // Mock email failure
      const mockSendEmail = require('../_shared/email-service.ts').sendEmail;
      mockSendEmail.mockRejectedValue(new Error('Email service down'));

      const response = await app.request('/auth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.signed_up',
          data: { user: mockUser }
        })
      });

      // Should still succeed despite email failure
      expect(response.status).toBe(200);
    });
  });

  describe('Handle User Update', () => {
    it('should update user profile when auth metadata changes', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'updated@example.com',
        user_metadata: { first_name: 'Updated', last_name: 'Name', avatar_url: 'https://example.com/new-avatar.jpg' }
      };

      mockServiceClient.eq.mockResolvedValue({ error: null });

      const response = await app.request('/auth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.updated',
          data: { user: mockUser }
        })
      });

      expect(response.status).toBe(200);
      expect(mockServiceClient.from).toHaveBeenCalledWith('users');
      expect(mockServiceClient.update).toHaveBeenCalledWith({
        email: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
        updated_at: expect.any(String),
      });
      expect(mockServiceClient.eq).toHaveBeenCalledWith('id', 'user-123');
    });
  });

  describe('Handle User Deletion', () => {
    it('should delete user records when account is deleted', async () => {
      const mockUser = {
        id: 'user-to-delete',
        email: 'delete@example.com'
      };

      mockServiceClient.eq.mockResolvedValue({ error: null });

      // Mock admin delete
      const mockAdminClient = {
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: null })
          }
        }
      };
      require('../_shared/supabase-client.ts').createServiceClient.mockReturnValueOnce(mockAdminClient);

      const response = await app.request('/auth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.deleted',
          data: { user: mockUser }
        })
      });

      expect(response.status).toBe(200);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-to-delete');
    });
  });
});
`;

// Write the database test
const fs = require('fs');

fs.writeFileSync('test-database-user-creation.sql', databaseUserCreationTest);

// Write the edge function test
fs.writeFileSync('test-auth-sync-function.js', authSyncEdgeFunctionTest);

console.log('Database and Edge Function Tests Created:');
console.log('- test-database-user-creation.sql: Tests the PostgreSQL trigger logic');
console.log('- test-auth-sync-function.js: Tests the auth-sync edge function');
console.log('- test-auth-process.js: Tests the frontend authentication flow');