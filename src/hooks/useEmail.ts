import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateKey?: string;
  templateVariables?: Record<string, string>;
  emailType: string;
  metadata?: Record<string, any>;
}

interface EmailStats {
  total_sent: number;
  total_failed: number;
  total_pending: number;
  by_type: Record<string, {
    count: number;
    sent: number;
    failed: number;
  }>;
}

interface UseEmailReturn {
  sendEmail: (params: SendEmailParams) => Promise<{ success: boolean; message_id?: string; error?: string }>;
  getEmailStats: (days?: number) => Promise<EmailStats | null>;
  isSending: boolean;
  error: string | null;
}

export async function sendEmailDirectly(params: SendEmailParams): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const { data, error: functionError } = await supabase.functions.invoke('email-send', {
      body: params,
    });

    if (functionError) {
      throw new Error(functionError.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send email');
    }

    return {
      success: true,
      message_id: data.data.message_id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error sending email:', err);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Hook for sending emails and managing email operations
 * Uses Spaceship SMTP via Supabase Edge Function
 */
export function useEmail(): UseEmailReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (params: SendEmailParams) => {
    setIsSending(true);
    setError(null);
    const result = await sendEmailDirectly(params);
    if (!result.success) {
      setError(result.error || 'Unknown error');
    }
    setIsSending(false);
    return result;
  };

  const getEmailStats = async (days: number = 30): Promise<EmailStats | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error: statsError } = await supabase.rpc('get_email_stats', {
        p_user_id: user.user.id,
        p_days: days,
      });

      if (statsError) {
        throw new Error(statsError.message);
      }

      return data as EmailStats;
    } catch (err) {
      console.error('Error getting email stats:', err);
      return null;
    }
  };

  return {
    sendEmail,
    getEmailStats,
    isSending,
    error,
  };
}

/**
 * Helper functions for common email operations
 */

export const EmailHelpers = {
  /**
   * Send payment success email
   */
  sendPaymentSuccess: async (params: {
    to: string;
    userName: string;
    amount: string;
    currency: string;
    planName: string;
    transactionId: string;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: 'Payment Successful - Interview Ready',
      templateKey: 'payment_success',
      templateVariables: {
        user_name: params.userName,
        amount: params.amount,
        currency: params.currency,
        plan_name: params.planName,
        transaction_id: params.transactionId,
      },
      emailType: 'payment_success',
      metadata: {
        transaction_id: params.transactionId,
        plan: params.planName,
      },
    });
  },

  /**
   * Send payment failed email
   */
  sendPaymentFailed: async (params: {
    to: string;
    userName: string;
    amount: string;
    currency: string;
    errorMessage: string;
    retryUrl?: string;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: 'Payment Failed - Action Required',
      templateKey: 'payment_failed',
      templateVariables: {
        user_name: params.userName,
        amount: params.amount,
        currency: params.currency,
        error_message: params.errorMessage,
        retry_url: params.retryUrl || 'https://appinterviewready.top/pricing',
      },
      emailType: 'payment_failed',
    });
  },

  /**
   * Send subscription created email
   */
  sendSubscriptionCreated: async (params: {
    to: string;
    userName: string;
    planName: string;
    billingPeriod: string;
    nextBillingDate: string;
    credits?: string;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: `Welcome to Interview Ready ${params.planName}!`,
      templateKey: 'subscription_created',
      templateVariables: {
        user_name: params.userName,
        plan_name: params.planName,
        billing_period: params.billingPeriod,
        next_billing_date: params.nextBillingDate,
        credits: params.credits || '150',
      },
      emailType: 'subscription_created',
      metadata: {
        plan: params.planName,
      },
    });
  },

  /**
   * Send referral reward email
   */
  sendReferralReward: async (params: {
    to: string;
    userName: string;
    referredUser: string;
    credits: string;
    referralCode: string;
    totalReferrals: string;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: 'You Earned Referral Credits! - Interview Ready',
      templateKey: 'referral_reward',
      templateVariables: {
        user_name: params.userName,
        referred_user: params.referredUser,
        credits: params.credits,
        referral_code: params.referralCode,
        total_referrals: params.totalReferrals,
      },
      emailType: 'referral_reward',
    });
  },

  /**
   * Send welcome email
   */
  sendWelcome: async (params: {
    to: string;
    userName: string;
    credits?: string;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: 'Welcome to Interview Ready!',
      templateKey: 'welcome',
      templateVariables: {
        user_name: params.userName,
        first_name: params.userName,
        credits: params.credits || '10',
        app_url: 'https://appinterviewready.top',
        help_url: 'https://appinterviewready.top/#faq',
        current_year: new Date().getFullYear().toString(),
      },
      emailType: 'welcome',
    });
  },

  /**
   * Send VIP Waitlist Confirmation email
   */
  sendWaitlistConfirmation: async (params: {
    to: string;
    userName: string;
    queuePosition?: number;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: "You're on the VIP Waitlist! 🚀 - Interview Ready",
      templateKey: 'waitlist_confirmation',
      templateVariables: {
        user_name: params.userName,
        first_name: params.userName,
        queue_position: (params.queuePosition || 100).toString(),
        app_url: 'https://appinterviewready.top',
      },
      emailType: 'waitlist_confirmation',
      metadata: { queue_position: params.queuePosition || 100 },
    });
  },

  /**
   * Send custom email
   */
  sendCustom: async (params: {
    to: string;
    subject: string;
    html: string;
    metadata?: Record<string, any>;
  }) => {
    return sendEmailDirectly({
      to: params.to,
      subject: params.subject,
      html: params.html,
      emailType: 'custom',
      metadata: params.metadata,
    });
  },
};
