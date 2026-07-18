INSERT INTO public.paystack_plans (plan_code, plan_type, name, amount, currency, interval, description) VALUES
  ('PLN_0jg6lfy4ttw68tj', 'PREMIUM', 'Premium Monthly', 5.00, 'USD', 'MONTHLY', 'Unlimited AI credits, all templates, priority support'),
  ('PLN_2uob7t7251usns5', 'PREMIUM', 'Premium Yearly', 50.00, 'USD', 'YEARLY', 'Unlimited AI credits, all templates, priority support (2 months free)'),
  ('PLN_fkvsy1vdlgcnp0p', 'PREMIUM_PLUS', 'Premium Plus Monthly', 10.00, 'USD', 'MONTHLY', 'Everything in Premium + priority queue, advanced analytics'),
  ('PLN_35hurhal4nnj3n9', 'PREMIUM_PLUS', 'Premium Plus Yearly', 100.00, 'USD', 'YEARLY', 'Everything in Premium + priority queue, advanced analytics (2 months free)')
ON CONFLICT (plan_code) DO NOTHING;

INSERT INTO public.paystack_plans (plan_code, plan_type, name, amount, currency, interval, description) VALUES
  ('PLN_7l2u2vr9r7844sz', 'PREMIUM', 'Premium Monthly (M-Pesa)', 500.00, 'KES', 'MONTHLY', 'Unlimited AI credits, all templates, priority support - Pay with M-Pesa'),
  ('PLN_rsxpxfrt13zyatj', 'PREMIUM', 'Premium Yearly (M-Pesa)', 5000.00, 'KES', 'YEARLY', 'Unlimited AI credits, all templates, priority support (2 months free) - Pay with M-Pesa'),
  ('PLN_gi0q6ldgfi6e0cd', 'PREMIUM_PLUS', 'Premium Plus Monthly (M-Pesa)', 1000.00, 'KES', 'MONTHLY', 'Everything in Premium + priority queue, advanced analytics - Pay with M-Pesa'),
  ('PLN_qy200k9hkdd183d', 'PREMIUM_PLUS', 'Premium Plus Yearly (M-Pesa)', 10000.00, 'KES', 'YEARLY', 'Everything in Premium + priority queue, advanced analytics (2 months free) - Pay with M-Pesa')
ON CONFLICT (plan_code) DO NOTHING;

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

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, variables) VALUES
(
  'subscription_renewed',
  'Subscription Renewed',
  'Your Subscription was Renewed - Interview Ready',
  '<html><body><h1>Subscription Renewed!</h1><p>Hi {{user_name}},</p><p>Your {{plan_name}} subscription has been successfully renewed.</p><p><strong>Next billing date:</strong> {{next_billing_date}}</p><p>Thank you for your continued support!</p></body></html>',
  'Subscription Renewed!\n\nHi {{user_name}},\n\nYour {{plan_name}} subscription has been successfully renewed.\n\nNext billing date: {{next_billing_date}}\n\nThank you for your continued support!',
  '["user_name", "plan_name", "next_billing_date"]'::JSONB
)
ON CONFLICT (template_key) DO UPDATE SET 
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables;
