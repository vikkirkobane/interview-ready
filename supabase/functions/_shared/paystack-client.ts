/**
 * Paystack API Client for Supabase Edge Functions
 * Handles payment initialization, verification, and subscription management
 */

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
}

export interface InitializePaymentParams {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
  plan?: string;
  subaccount?: string;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    fees: number;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, any>;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
      description: string;
      amount: number;
      interval: string;
      currency: string;
    };
  };
}

export interface CreateSubscriptionParams {
  customer: string; // customer code or email
  plan: string; // plan code
  authorization?: string; // authorization code
  start_date?: string; // ISO 8601 format
}

export interface CreateSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    customer: number;
    plan: number;
    integration: number;
    domain: string;
    start: number;
    status: string;
    quantity: number;
    amount: number;
    subscription_code: string;
    email_token: string;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    next_payment_date: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CancelSubscriptionParams {
  code: string; // subscription code
  token: string; // email token
}

export class PaystackClient {
  private baseUrl = 'https://api.paystack.co';
  private secretKey: string;
  public publicKey: string;

  constructor(config: PaystackConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResponse> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Paystack initialization failed: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Paystack verification failed: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<CreateSubscriptionResponse> {
    const response = await fetch(`${this.baseUrl}/subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Paystack subscription creation failed: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    params: CancelSubscriptionParams
  ): Promise<{ status: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Paystack subscription cancellation failed: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionCode: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/subscription/${subscriptionCode}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to fetch subscription: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const key = encoder.encode(this.secretKey);
    const data = encoder.encode(payload);

    return crypto.subtle
      .importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
      .then((cryptoKey) => crypto.subtle.sign('HMAC', cryptoKey, data))
      .then((signatureBuffer) => {
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signatureHex = signatureArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return signatureHex === signature;
      })
      .catch(() => false);
  }

  /**
   * Generate a unique payment reference
   */
  static generateReference(prefix = 'IR'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Convert amount to Paystack's smallest currency unit.
   * USD/NGN/GHS/ZAR: multiply by 100 (cents/kobo/pesewas)
   * KES/RWF: already in smallest unit — no conversion needed
   */
  static toSmallestUnit(amount: number, currency: string): number {
    const noConversionCurrencies = ['KES', 'RWF'];
    if (noConversionCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  /**
   * @deprecated Use toSmallestUnit(amount, currency) instead
   * Convert amount to kobo (smallest currency unit for NGN only)
   */
  static toKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from kobo to naira
   */
  static fromKobo(amount: number): number {
    return amount / 100;
  }
}

/**
 * Create a Paystack client instance
 */
export function createPaystackClient(): PaystackClient {
  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  const publicKey = Deno.env.get('PAYSTACK_PUBLIC_KEY');

  if (!secretKey || !publicKey) {
    throw new Error('Paystack API keys not configured');
  }

  return new PaystackClient({ secretKey, publicKey });
}
