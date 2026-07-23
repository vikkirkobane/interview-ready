
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
