-- Add Kenya M-Pesa pricing as secondary payment option
-- Primary market uses USD with card/bank payments
-- Secondary market (Kenya) uses KES with M-Pesa

-- Insert Kenya-specific plans for M-Pesa payments
INSERT INTO public.paystack_plans (plan_code, plan_type, name, amount, currency, interval, description) VALUES
  ('PLN_premium_monthly_kes', 'PREMIUM', 'Premium Monthly (M-Pesa)', 500.00, 'KES', 'MONTHLY', 'Unlimited AI credits, all templates, priority support - Pay with M-Pesa'),
  ('PLN_premium_yearly_kes', 'PREMIUM', 'Premium Yearly (M-Pesa)', 5000.00, 'KES', 'YEARLY', 'Unlimited AI credits, all templates, priority support (2 months free) - Pay with M-Pesa'),
  ('PLN_premium_plus_monthly_kes', 'PREMIUM_PLUS', 'Premium Plus Monthly (M-Pesa)', 1000.00, 'KES', 'MONTHLY', 'Everything in Premium + priority queue, advanced analytics - Pay with M-Pesa'),
  ('PLN_premium_plus_yearly_kes', 'PREMIUM_PLUS', 'Premium Plus Yearly (M-Pesa)', 10000.00, 'KES', 'YEARLY', 'Everything in Premium + priority queue, advanced analytics (2 months free) - Pay with M-Pesa')
ON CONFLICT (plan_code) DO NOTHING;

-- Update existing plans to use USD as primary currency
UPDATE public.paystack_plans 
SET 
  currency = 'USD',
  amount = CASE 
    WHEN plan_code = 'PLN_premium_monthly' THEN 5.00
    WHEN plan_code = 'PLN_premium_yearly' THEN 50.00
    WHEN plan_code = 'PLN_premium_plus_monthly' THEN 10.00
    WHEN plan_code = 'PLN_premium_plus_yearly' THEN 100.00
    ELSE amount
  END,
  description = CASE 
    WHEN plan_code = 'PLN_premium_monthly' THEN 'Unlimited AI credits, all templates, priority support - Pay with Card or Bank'
    WHEN plan_code = 'PLN_premium_yearly' THEN 'Unlimited AI credits, all templates, priority support (2 months free) - Pay with Card or Bank'
    WHEN plan_code = 'PLN_premium_plus_monthly' THEN 'Everything in Premium + priority queue, advanced analytics - Pay with Card or Bank'
    WHEN plan_code = 'PLN_premium_plus_yearly' THEN 'Everything in Premium + priority queue, advanced analytics (2 months free) - Pay with Card or Bank'
    ELSE description
  END
WHERE plan_code IN ('PLN_premium_monthly', 'PLN_premium_yearly', 'PLN_premium_plus_monthly', 'PLN_premium_plus_yearly');

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