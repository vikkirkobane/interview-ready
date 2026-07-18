
const crypto = require('crypto');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

if (!paystackSecretKey) {
  console.error('PAYSTACK_SECRET_KEY is missing from .env');
  process.exit(1);
}

async function run() {
  const reference = process.argv[2];
  if (!reference) {
    console.error('Please provide the payment reference as a command line argument.');
    console.error('Example: node test-webhook.js IR_1784375655200_ulocaa');
    process.exit(1);
  }

  console.log(`Simulating Paystack charge.success webhook for reference: ${reference}...`);
  
  // Construct a mock payload that mimics Paystack
  const payload = {
    event: 'charge.success',
    data: {
      id: 123456789,
      domain: 'test',
      status: 'success',
      reference: reference,
      amount: 500, // Amount in cents
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      channel: 'card',
      currency: 'USD',
      ip_address: '127.0.0.1',
      metadata: {
        plan_code: 'PLN_0jg6lfy4ttw68tj',
        plan_type: 'PREMIUM',
        plan_interval: 'MONTHLY'
      },
      log: null,
      fees: null,
      fees_split: null,
      authorization: {
        authorization_code: 'AUTH_8dfhjjdt',
        bin: '408408',
        last4: '4081',
        exp_month: '12',
        exp_year: '2030',
        channel: 'card',
        card_type: 'visa DEBIT',
        bank: 'Test Bank',
        country_code: 'KE',
        brand: 'visa',
        reusable: true,
        signature: 'SIG_yUzxxx',
        account_name: null
      },
      customer: {
        id: 84312,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        customer_code: 'CUS_xnxdt6s1zg1f4nx',
        phone: '',
        metadata: null,
        risk_action: 'default'
      },
      plan: {}
    }
  };

  const payloadString = JSON.stringify(payload);
  
  // Create HMAC SHA512 signature
  const hash = crypto.createHmac('sha512', paystackSecretKey).update(payloadString).digest('hex');

  const response = await fetch(`${supabaseUrl}/functions/v1/payments-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': hash
    },
    body: payloadString
  });

  const responseText = await response.text();
  console.log('Response Status:', response.status);
  console.log('Response Text:', responseText);

  if (response.status === 200) {
    console.log('\n--- WEBHOOK PROCESSED SUCCESSFULLY ---');
  } else {
    console.log('\n--- WEBHOOK FAILED ---');
  }
}

run();
