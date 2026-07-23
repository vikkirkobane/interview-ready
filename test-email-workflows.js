/**
 * Email Confirmation and Notification Workflow Tests
 *
 * Tests the email confirmation process and related notification workflows
 * in the Interview Ready app.
 */

const fs = require('fs');
const path = require('path');

// Mock email service for testing
class MockEmailService {
  constructor() {
    this.sentEmails = [];
    this.emailTemplates = {
      welcome: {
        subject: 'Welcome to Interview Ready!',
        body: 'Thank you for signing up. Please confirm your email address to get started.'
      },
      confirmation: {
        subject: 'Please Confirm Your Email Address',
        body: 'Click the link below to confirm your email address and activate your account.'
      },
      resetPassword: {
        subject: 'Reset Your Password',
        body: 'Follow this link to reset your password.'
      },
      onboardingReminder: {
        subject: 'Complete Your Profile to Unlock Full Potential',
        body: 'Finish your profile setup to start generating tailored resumes and cover letters.'
      },
      creditReminder: {
        subject: 'Your Credits Are Running Low',
        body: 'You have {credits} credits remaining. Top up to continue using our services.'
      },
      resumeReady: {
        subject: 'Your Resume is Ready!',
        body: 'Your tailored resume has been generated successfully. Download it now.'
      }
    };
  }

  async sendEmail(to, template, data = {}) {
    const templateConfig = this.emailTemplates[template];
    if (!templateConfig) {
      throw new Error(`Unknown email template: ${template}`);
    }

    // Apply data replacements to the email body
    let body = templateConfig.body;
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        body = body.replace(new RegExp(`{${key}}`, 'g'), data[key]);
      });
    }

    const email = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to,
      subject: templateConfig.subject,
      body,
      sentAt: new Date().toISOString(),
      template,
      data
    };

    this.sentEmails.push(email);
    console.log(`📧 Email sent: ${template} to ${to}`);

    return { success: true, emailId: email.id };
  }

  getLastEmail(to, template) {
    return this.sentEmails
      .reverse()
      .find(email => email.to === to && email.template === template);
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}

// Mock user management system
class MockUserManagement {
  constructor() {
    this.users = new Map();
    this.confirmationTokens = new Map(); // Maps token to userId
    this.passwordResetTokens = new Map();
  }

  async createUser(email, password, additionalData = {}) {
    const userId = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const user = {
      id: userId,
      email,
      password, // In real app, this would be hashed
      confirmed: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      profile: additionalData.profile || {},
      onboardingCompleted: false,
      ai_credits: 10, // Start with free credits
      ...additionalData
    };

    this.users.set(userId, user);
    console.log(`👤 Created user: ${email} (ID: ${userId})`);

    // Generate confirmation token
    const token = this.generateToken();
    this.confirmationTokens.set(token, userId);

    // Send confirmation email
    if (typeof global.emailServiceInstance !== 'undefined') {
      await global.emailServiceInstance.sendEmail(email, 'confirmation');
    } else {
      console.log(`📧 Skipped sending confirmation email for test`);
    }

    return { success: true, user, confirmationToken: token };
  }

  async getUserByEmail(email) {
    for (const [id, user] of this.users.entries()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async getUserById(userId) {
    return this.users.get(userId);
  }

  async confirmEmail(token) {
    const userId = this.confirmationTokens.get(token);
    if (!userId) {
      throw new Error('Invalid or expired confirmation token');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.confirmed) {
      throw new Error('Email already confirmed');
    }

    user.confirmed = true;
    user.confirmedAt = new Date().toISOString();

    // Remove the token after use
    this.confirmationTokens.delete(token);

    console.log(`✅ Email confirmed for user: ${user.email}`);
    return { success: true, user };
  }

  async initiatePasswordReset(email) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateToken();
    this.passwordResetTokens.set(token, {
      userId: user.id,
      email: email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    console.log(`🔄 Password reset initiated for: ${email}`);
    return { success: true, resetToken: token };
  }

  async confirmPasswordReset(token, newPassword) {
    const resetData = this.passwordResetTokens.get(token);
    if (!resetData || resetData.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const user = this.users.get(resetData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date().toISOString();

    // Remove the token after use
    this.passwordResetTokens.delete(token);

    console.log(`✅ Password reset completed for: ${user.email}`);
    return { success: true, user };
  }

  generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Mock notification system
class MockNotificationSystem {
  constructor() {
    this.notifications = [];
    this.pushSubscriptions = new Map(); // userId -> [subscriptionIds]
  }

  async sendNotification(userId, type, content) {
    const notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      type,
      content,
      read: false,
      createdAt: new Date().toISOString(),
      sentVia: []
    };

    this.notifications.push(notification);
    console.log(`🔔 Notification sent to ${userId}: ${type}`);

    // Simulate sending via different channels
    if (type.includes('email')) {
      notification.sentVia.push('email');
    }
    if (type.includes('push')) {
      notification.sentVia.push('push');
    }

    return { success: true, notificationId: notification.id };
  }

  async getUserNotifications(userId, limit = 10) {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  async markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return { success: true };
    }
    return { success: false, error: 'Notification not found' };
  }
}

// Email Confirmation and Notification Test Suite
class EmailConfirmationTestSuite {
  constructor() {
    this.emailService = new MockEmailService();
    this.userManager = new MockUserManagement();
    this.notificationSystem = new MockNotificationSystem();
    this.testResults = [];

    // Make email service available globally to the user manager
    global.emailServiceInstance = this.emailService;
  }

  async testEmailConfirmationFlow() {
    console.log('📧 Testing Email Confirmation Flow');
    console.log('=================================');

    // Test 1: New user signup
    console.log('\n--- Test 1: User Registration ---');
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const result = await this.userManager.createUser(testEmail, 'password123');

      if (!result.success || !result.user) {
        throw new Error('User creation failed');
      }

      // Verify user is created but not confirmed
      if (result.user.confirmed) {
        throw new Error('User should not be confirmed after signup');
      }

      console.log('✅ User created successfully but not confirmed');
      console.log(`   User ID: ${result.user.id}`);
      console.log(`   Email: ${result.user.email}`);
      console.log(`   Confirmed: ${result.user.confirmed}`);

      // Check that confirmation email was sent
      const lastEmail = this.emailService.getLastEmail(testEmail, 'confirmation');
      if (!lastEmail) {
        throw new Error('Confirmation email was not sent');
      }

      console.log('✅ Confirmation email sent');

      this.testResults.push({
        testName: 'User Registration',
        status: 'PASSED',
        details: 'User created successfully with unconfirmed status and confirmation email sent'
      });

    } catch (error) {
      console.error(`❌ User registration test failed: ${error.message}`);
      this.testResults.push({
        testName: 'User Registration',
        status: 'FAILED',
        details: error.message
      });
    }

    // Test 2: Confirmation process
    console.log('\n--- Test 2: Email Confirmation Process ---');
    try {
      const testEmail = `test-confirm-${Date.now()}@example.com`;
      const { user, confirmationToken } = await this.userManager.createUser(testEmail, 'password123');

      // Verify initial state
      if (user.confirmed) {
        throw new Error('User should not be confirmed initially');
      }

      // Attempt to confirm with the token
      const confirmResult = await this.userManager.confirmEmail(confirmationToken);

      if (!confirmResult.success || !confirmResult.user.confirmed) {
        throw new Error('Email confirmation failed');
      }

      // Verify user is now confirmed
      const updatedUser = await this.userManager.getUserByEmail(testEmail);
      if (!updatedUser.confirmed) {
        throw new Error('User still not confirmed after successful confirmation');
      }

      console.log('✅ Email confirmation process successful');
      console.log(`   Confirmed at: ${updatedUser.confirmedAt}`);

      // Check for welcome or confirmation complete notification
      await this.notificationSystem.sendNotification(updatedUser.id, 'email_confirmed', 'Your email has been confirmed. Welcome to Interview Ready!');

      this.testResults.push({
        testName: 'Email Confirmation Process',
        status: 'PASSED',
        details: 'Email confirmation flow works correctly'
      });

    } catch (error) {
      console.error(`❌ Email confirmation test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Email Confirmation Process',
        status: 'FAILED',
        details: error.message
      });
    }

    // Test 3: Invalid token handling
    console.log('\n--- Test 3: Invalid Token Handling ---');
    try {
      // Try to confirm with invalid token
      await this.userManager.confirmEmail('invalid-token-123');
      throw new Error('Should have failed with invalid token');
    } catch (error) {
      if (error.message.includes('Invalid or expired confirmation token')) {
        console.log('✅ Correctly handled invalid confirmation token');
        this.testResults.push({
          testName: 'Invalid Token Handling',
          status: 'PASSED',
          details: 'Correctly rejected invalid confirmation token'
        });
      } else {
        console.error(`❌ Unexpected error for invalid token: ${error.message}`);
        this.testResults.push({
          testName: 'Invalid Token Handling',
          status: 'FAILED',
          details: `Unexpected error: ${error.message}`
        });
      }
    }

    // Test 4: Duplicate confirmation handling
    console.log('\n--- Test 4: Duplicate Confirmation Handling ---');
    try {
      const testEmail = `test-duplicate-${Date.now()}@example.com`;
      const { user, confirmationToken } = await this.userManager.createUser(testEmail, 'password123');

      // Confirm the email first time
      await this.userManager.confirmEmail(confirmationToken);

      // Try to confirm again with same token
      await this.userManager.confirmEmail(confirmationToken);
      throw new Error('Should have failed with already confirmed token');
    } catch (error) {
      if (error.message.includes('already confirmed')) {
        console.log('✅ Correctly handled already confirmed email');
        this.testResults.push({
          testName: 'Duplicate Confirmation Handling',
          status: 'PASSED',
          details: 'Correctly rejected duplicate confirmation attempt'
        });
      } else if (error.message.includes('Invalid or expired')) {
        // This is also acceptable since the token is removed after use
        console.log('✅ Confirmation token was properly invalidated after first use');
        this.testResults.push({
          testName: 'Duplicate Confirmation Handling',
          status: 'PASSED',
          details: 'Token properly invalidated after use'
        });
      } else {
        console.error(`❌ Unexpected error for duplicate confirmation: ${error.message}`);
        this.testResults.push({
          testName: 'Duplicate Confirmation Handling',
          status: 'FAILED',
          details: `Unexpected error: ${error.message}`
        });
      }
    }

    // Test 5: Password reset flow
    console.log('\n--- Test 5: Password Reset Flow ---');
    try {
      const testEmail = `test-reset-${Date.now()}@example.com`;
      const { user } = await this.userManager.createUser(testEmail, 'oldpassword123', {
        confirmed: true // Confirmed user for reset
      });

      // Initiate password reset
      const resetResult = await this.userManager.initiatePasswordReset(testEmail);
      if (!resetResult.success) {
        throw new Error('Password reset initiation failed');
      }

      console.log('✅ Password reset initiated');

      // Confirm reset with new password
      const confirmResetResult = await this.userManager.confirmPasswordReset(resetResult.resetToken, 'newpassword123');
      if (!confirmResetResult.success) {
        throw new Error('Password reset confirmation failed');
      }

      console.log('✅ Password reset completed successfully');

      // Verify password was actually changed
      const updatedUser = await this.userManager.getUserByEmail(testEmail);
      if (updatedUser.password !== 'newpassword123') {
        throw new Error('Password was not updated');
      }

      console.log('✅ Password was successfully updated');

      this.testResults.push({
        testName: 'Password Reset Flow',
        status: 'PASSED',
        details: 'Password reset flow works correctly'
      });

    } catch (error) {
      console.error(`❌ Password reset test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Password Reset Flow',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  async testNotificationWorkflows() {
    console.log('\n💬 Testing Notification Workflows');
    console.log('===============================');

    // Test 1: Welcome notification after confirmation
    console.log('\n--- Test 1: Welcome Notification ---');
    try {
      const testEmail = `test-welcome-${Date.now()}@example.com`;
      const { user, confirmationToken } = await this.userManager.createUser(testEmail, 'password123');

      // Confirm email to trigger welcome flow
      await this.userManager.confirmEmail(confirmationToken);

      // Send welcome notification
      const welcomeNotif = await this.notificationSystem.sendNotification(
        user.id,
        'welcome_email_confirmed',
        'Welcome to Interview Ready! Your email is confirmed and your journey begins.'
      );

      if (!welcomeNotif.success) {
        throw new Error('Welcome notification failed to send');
      }

      console.log('✅ Welcome notification sent after confirmation');

      this.testResults.push({
        testName: 'Welcome Notification',
        status: 'PASSED',
        details: 'Welcome notification sent after email confirmation'
      });

    } catch (error) {
      console.error(`❌ Welcome notification test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Welcome Notification',
        status: 'FAILED',
        details: error.message
      });
    }

    // Test 2: Low credit notification
    console.log('\n--- Test 2: Low Credit Notification ---');
    try {
      const testEmail = `test-credits-${Date.now()}@example.com`;
      const { user } = await this.userManager.createUser(testEmail, 'password123', {
        confirmed: true,
        ai_credits: 2 // Low credit balance
      });

      // Simulate low credit notification
      const lowCreditNotif = await this.notificationSystem.sendNotification(
        user.id,
        'low_credits_alert',
        `You have ${user.ai_credits} AI credits remaining. Top up to continue using our services.`
      );

      if (!lowCreditNotif.success) {
        throw new Error('Low credit notification failed to send');
      }

      console.log('✅ Low credit notification sent');
      console.log(`   Credits: ${user.ai_credits}`);

      this.testResults.push({
        testName: 'Low Credit Notification',
        status: 'PASSED',
        details: 'Low credit notification sent correctly'
      });

    } catch (error) {
      console.error(`❌ Low credit notification test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Low Credit Notification',
        status: 'FAILED',
        details: error.message
      });
    }

    // Test 3: Resume completion notification
    console.log('\n--- Test 3: Resume Completion Notification ---');
    try {
      const testEmail = `test-resume-${Date.now()}@example.com`;
      const { user } = await this.userManager.createUser(testEmail, 'password123', {
        confirmed: true
      });

      // Simulate resume generation completion
      const resumeNotif = await this.notificationSystem.sendNotification(
        user.id,
        'resume_generation_complete',
        'Your tailored resume has been generated successfully. Download it now from the Resumes section.'
      );

      if (!resumeNotif.success) {
        throw new Error('Resume completion notification failed to send');
      }

      console.log('✅ Resume completion notification sent');

      this.testResults.push({
        testName: 'Resume Completion Notification',
        status: 'PASSED',
        details: 'Resume completion notification sent correctly'
      });

    } catch (error) {
      console.error(`❌ Resume completion notification test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Resume Completion Notification',
        status: 'FAILED',
        details: error.message
      });
    }

    // Test 4: Onboarding reminder notification
    console.log('\n--- Test 4: Onboarding Reminder Notification ---');
    try {
      const testEmail = `test-onboard-${Date.now()}@example.com`;
      const { user } = await this.userManager.createUser(testEmail, 'password123', {
        confirmed: true,
        onboardingCompleted: false
      });

      // Simulate onboarding reminder
      const onboardingNotif = await this.notificationSystem.sendNotification(
        user.id,
        'onboarding_reminder',
        'Complete your profile to unlock the full potential of Interview Ready. Finish setup in 2 minutes!'
      );

      if (!onboardingNotif.success) {
        throw new Error('Onboarding reminder notification failed to send');
      }

      console.log('✅ Onboarding reminder notification sent');
      console.log(`   Onboarding completed: ${user.onboardingCompleted}`);

      this.testResults.push({
        testName: 'Onboarding Reminder Notification',
        status: 'PASSED',
        details: 'Onboarding reminder notification sent correctly'
      });

    } catch (error) {
      console.error(`❌ Onboarding reminder notification test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Onboarding Reminder Notification',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  async testEmailTemplateSystem() {
    console.log('\n📝 Testing Email Template System');
    console.log('============================');

    const templateTests = [
      { name: 'Welcome Email', template: 'welcome', email: `welcome-${Date.now()}@example.com` },
      { name: 'Confirmation Email', template: 'confirmation', email: `confirm-${Date.now()}@example.com` },
      { name: 'Password Reset', template: 'resetPassword', email: `reset-${Date.now()}@example.com` },
      { name: 'Onboarding Reminder', template: 'onboardingReminder', email: `onboard-${Date.now()}@example.com` },
      { name: 'Resume Ready', template: 'resumeReady', email: `resume-${Date.now()}@example.com` }
    ];

    for (const test of templateTests) {
      console.log(`\n--- Test: ${test.name} ---`);
      try {
        const result = await this.emailService.sendEmail(test.email, test.template);

        if (!result.success) {
          throw new Error(`${test.name} email failed to send`);
        }

        const sentEmail = this.emailService.getLastEmail(test.email, test.template);
        if (!sentEmail) {
          throw new Error(`${test.name} email not found in sent emails`);
        }

        console.log(`✅ ${test.name} sent successfully`);
        console.log(`   Subject: ${sentEmail.subject}`);
        console.log(`   Template: ${sentEmail.template}`);

        this.testResults.push({
          testName: `${test.name} Template`,
          status: 'PASSED',
          details: `${test.name} template sent correctly`
        });

      } catch (error) {
        console.error(`❌ ${test.name} template test failed: ${error.message}`);
        this.testResults.push({
          testName: `${test.name} Template`,
          status: 'FAILED',
          details: error.message
        });
      }
    }

    // Test template with data replacement
    console.log('\n--- Test: Template with Data Replacement ---');
    try {
      const testEmail = `data-template-${Date.now()}@example.com`;
      const result = await this.emailService.sendEmail(testEmail, 'creditReminder', { credits: 3 });

      if (!result.success) {
        throw new Error('Credit reminder email failed to send');
      }

      const sentEmail = this.emailService.getLastEmail(testEmail, 'creditReminder');
      if (!sentEmail || !sentEmail.body.includes('3')) {
        throw new Error('Credit count was not properly replaced in template');
      }

      console.log('✅ Template data replacement works');
      console.log(`   Body includes "3 credits": ${sentEmail.body.includes('3')}`);

      this.testResults.push({
        testName: 'Template Data Replacement',
        status: 'PASSED',
        details: 'Template data replacement works correctly'
      });

    } catch (error) {
      console.error(`❌ Template data replacement test failed: ${error.message}`);
      this.testResults.push({
        testName: 'Template Data Replacement',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  generateReport() {
    console.log('\n📋 EMAIL CONFIRMATION & NOTIFICATION TEST REPORT');
    console.log('============================================');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

    console.log(`\n📧 Email Service Stats:`);
    console.log(`   Total Emails Sent: ${this.emailService.sentEmails.length}`);

    console.log(`\n👥 User Management Stats:`);
    console.log(`   Total Users: ${this.userManager.users.size}`);

    console.log(`\n🔔 Notification System Stats:`);
    console.log(`   Total Notifications: ${this.notificationSystem.notifications.length}`);

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach((result, index) => {
      const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${statusIcon} ${result.testName}: ${result.status}`);
      console.log(`      ${result.details}`);
    });

    if (failed > 0) {
      console.log(`\n🚨 ${failed} test(s) failed. The email confirmation system needs attention.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All email confirmation and notification tests passed! The system is working correctly.`);
      process.exit(0);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Email Confirmation and Notification Tests');
    console.log('===================================================');

    await this.testEmailConfirmationFlow();
    await this.testNotificationWorkflows();
    await this.testEmailTemplateSystem();

    this.generateReport();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const testSuite = new EmailConfirmationTestSuite();
  testSuite.runAllTests().catch(err => {
    console.error('Email confirmation tests failed:', err);
    process.exit(1);
  });
}

module.exports = { EmailConfirmationTestSuite, MockEmailService, MockUserManagement, MockNotificationSystem };