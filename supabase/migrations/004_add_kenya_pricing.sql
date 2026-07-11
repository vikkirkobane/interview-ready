-- Add Kenya M-Pesa pricing as secondary payment option
-- Primary market uses USD with card/bank payments
-- Secondary market (Kenya) uses KES with M-Pesa

-- Insert Kenya-specific plans for M-Pesa payments with actual Paystack plan codes
INSERT INTO public.paystack_plans (plan_code, plan_type, name, amount, currency, interval, description) VALUES
  ('PLN_7l2u2vr9r7844sz', 'PREMIUM', 'Premium Monthly (M-Pesa)', 500.00, 'KES', 'MONTHLY', 'Unlimited AI credits, all templates, priority support - Pay with M-Pesa'),
  ('PLN_rsxpxfrt13zyatj', 'PREMIUM', 'Premium Yearly (M-Pesa)', 5000.00, 'KES', 'YEARLY', 'Unlimited AI credits, all templates, priority support (2 months free) - Pay with M-Pesa'),
  ('PLN_gi0q6ldgfi6e0cd', 'PREMIUM_PLUS', 'Premium Plus Monthly (M-Pesa)', 1000.00, 'KES', 'MONTHLY', 'Everything in Premium + priority queue, advanced analytics - Pay with M-Pesa'),
  ('PLN_qy200k9hkdd183d', 'PREMIUM_PLUS', 'Premium Plus Yearly (M-Pesa)', 10000.00, 'KES', 'YEARLY', 'Everything in Premium + priority queue, advanced analytics (2 months free) - Pay with M-Pesa')
ON CONFLICT (plan_code) DO NOTHING;

-- Update existing plans to use USD as primary currency (using actual Paystack plan codes)
UPDATE public.paystack_plans 
SET 
  currency = 'USD',
  amount = CASE 
    WHEN plan_code = 'PLN_0jg6lfy4ttw68tj' THEN 5.00
    WHEN plan_code = 'PLN_2uob7t7251usns5' THEN 50.00
    WHEN plan_code = 'PLN_fkvsy1vdlgcnp0p' THEN 10.00
    WHEN plan_code = 'PLN_35hurhal4nnj3n9' THEN 100.00
    ELSE amount
  END,
  description = CASE 
    WHEN plan_code = 'PLN_0jg6lfy4ttw68tj' THEN 'Unlimited AI credits, all templates, priority support - Pay with Card or Bank'
    WHEN plan_code = 'PLN_2uob7t7251usns5' THEN 'Unlimited AI credits, all templates, priority support (2 months free) - Pay with Card or Bank'
    WHEN plan_code = 'PLN_fkvsy1vdlgcnp0p' THEN 'Everything in Premium + priority queue, advanced analytics - Pay with Card or Bank'
    WHEN plan_code = 'PLN_35hurhal4nnj3n9' THEN 'Everything in Premium + priority queue, advanced analytics (2 months free) - Pay with Card or Bank'
    ELSE description
  END
WHERE plan_code IN ('PLN_0jg6lfy4ttw68tj', 'PLN_2uob7t7251usns5', 'PLN_fkvsy1vdlgcnp0p', 'PLN_35hurhal4nnj3n9');

-- Add payment method field to track primary vs secondary payment
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'bank', 'mobile_money'));

-- Add country_code column if it doesn't exist
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Create index for payment method queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_method ON public.payment_transactions(payment_method);

-- Add comment
COMMENT ON COLUMN public.payment_transactions.payment_method IS 'Payment method used: card, bank, or mobile_money (M-Pesa)';
COMMENT ON COLUMN public.payment_transactions.country_code IS 'ISO 3166-1 alpha-2 country code (KE for Kenya M-Pesa, NULL for international USD)';