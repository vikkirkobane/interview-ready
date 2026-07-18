-- Fix get_referral_stats ordering issue with jsonb_agg
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'referral_code', u.referral_code,
    'total_referrals', u.total_referrals,
    'credits_earned', u.referral_credits_earned,
    'referrals', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', sub.id,
            'referred_user', jsonb_build_object(
              'first_name', sub.first_name,
              'last_name', LEFT(COALESCE(sub.last_name, ''), 1) || '.'
            ),
            'credits_granted', sub.credits_granted_to_referrer,
            'created_at', sub.created_at
          )
        ), '[]'::jsonb
      )
      FROM (
        SELECT r.id, ru.first_name, ru.last_name, r.credits_granted_to_referrer, r.created_at
        FROM public.referrals r
        JOIN public.users ru ON ru.id = r.referred_id
        WHERE r.referrer_id = p_user_id
        ORDER BY r.created_at DESC
      ) sub
    )
  ) INTO v_stats
  FROM public.users u
  WHERE u.id = p_user_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
