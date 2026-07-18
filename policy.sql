CREATE POLICY "Paystack plans readable by all" ON public.paystack_plans FOR SELECT USING (true);
