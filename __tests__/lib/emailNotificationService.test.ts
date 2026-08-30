import { triggerWelcomeEmail, generateEmailHtmlTemplate, sendEmailNotification } from '../../src/lib/emailNotificationService';

global.fetch = jest.fn() as any;

describe('Email Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmailHtmlTemplate', () => {
    it('generates HTML with provided props and branding', () => {
      const html = generateEmailHtmlTemplate({
        preheader: 'Welcome preheader',
        title: 'Welcome Aboard!',
        subtitle: 'Start your prep today',
        userName: 'Alex',
        bodyContent: '<p>Body content test</p>',
        ctaText: 'Open Platform',
        ctaUrl: 'https://appinterviewready.top',
        proTip: 'Add to home screen',
      });

      expect(html).toContain('Welcome preheader');
      expect(html).toContain('Welcome Aboard!');
      expect(html).toContain('Hello Alex,');
      expect(html).toContain('Body content test');
      expect(html).toContain('Open Platform');
      expect(html).toContain('https://appinterviewready.top');
      expect(html).toContain('Add to home screen');
      expect(html).toContain('Interview Ready');
    });

    it('defaults to "there" when userName is omitted', () => {
      const html = generateEmailHtmlTemplate({
        preheader: 'Preheader',
        title: 'Title',
        subtitle: 'Subtitle',
        bodyContent: '<p>Content</p>',
      });

      expect(html).toContain('Hello there,');
    });
  });

  describe('sendEmailNotification', () => {
    it('sends email through edge function endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await sendEmailNotification({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
        emailType: 'welcome',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/email-send'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('handles HTTP errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const result = await sendEmailNotification({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        emailType: 'welcome',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('triggerWelcomeEmail', () => {
    it('returns false if email is missing', async () => {
      const result = await triggerWelcomeEmail('');
      expect(result).toBe(false);
    });

    it('dispatches welcome email for valid user email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await triggerWelcomeEmail('candidate@example.com', 'Sarah');
      expect(result).toBe(true);
    });
  });
});
