-- Add subscription_renewed template to email_templates

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
