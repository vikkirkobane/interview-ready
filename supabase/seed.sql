-- Supabase Seed Script for Interview Ready
-- This file populates the database with sample data for development purposes.

-- 1. Insert a test user into auth.users (Supabase Auth schema)
-- The trigger `handle_new_user` will automatically insert into `public.users`.
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'b4859a85-f5b2-4cd8-b3ab-24239e248a3d',
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"first_name": "Alex", "last_name": "Smith"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Give the trigger a moment to run before updating public tables (in actual execution, it is synchronous)

-- 2. Update the public.users record (give the user premium credits)
UPDATE public.users 
SET 
    plan = 'PREMIUM',
    ai_credits = 50,
    avatar_url = 'https://i.pravatar.cc/150?u=testuser'
WHERE id = 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d';

-- 3. Insert into public.user_profiles
INSERT INTO public.user_profiles (
    user_id,
    phone,
    location,
    country,
    linkedin_url,
    summary,
    current_role,
    years_experience,
    target_roles,
    work_preference,
    technical_skills,
    soft_skills,
    profile_completeness
) VALUES (
    'b4859a85-f5b2-4cd8-b3ab-24239e248a3d',
    '+1 (555) 123-4567',
    'San Francisco, CA',
    'USA',
    'https://linkedin.com/in/alexsmith-test',
    'Product-driven engineer transitioning to Senior Product Management. Passionate about user growth, analytics, and agile methodologies.',
    'Senior Product Manager',
    5,
    ARRAY['Senior Product Manager', 'Growth Product Manager', 'Product Lead'],
    'HYBRID',
    ARRAY['Agile', 'Scrum', 'Jira', 'SQL', 'Data Analysis', 'Figma', 'Python'],
    ARRAY['Leadership', 'Communication', 'Problem Solving', 'Strategic Thinking'],
    85
) ON CONFLICT (user_id) DO UPDATE SET 
    current_role = EXCLUDED.current_role;

-- 4. Insert Job Applications
INSERT INTO public.job_applications (
    id,
    user_id,
    job_title,
    company,
    company_logo_url,
    location,
    is_remote,
    status,
    match_score,
    applied_at
) VALUES 
('a1000000-0000-0000-0000-000000000001', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'Senior Product Manager', 'TechCorp', 'https://logo.clearbit.com/apple.com', 'San Francisco, CA', false, 'SCREENING', 92, now() - interval '2 days'),
('a2000000-0000-0000-0000-000000000002', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'Growth Product Manager', 'StartupInc', 'https://logo.clearbit.com/stripe.com', 'Remote', true, 'APPLIED', 85, now() - interval '5 days'),
('a3000000-0000-0000-0000-000000000003', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'Product Lead', 'FintechCo', 'https://logo.clearbit.com/plaid.com', 'New York, NY', false, 'INTERVIEW', 88, now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Resumes
-- We'll use one of the templates generated in the schema (e.g. 'Modern Pro')
DO $$
DECLARE
    modern_pro_template_id UUID;
    resume_id UUID := 'r1000000-0000-0000-0000-000000000001';
BEGIN
    SELECT id INTO modern_pro_template_id FROM public.resume_templates WHERE slug = 'modern-pro' LIMIT 1;
    
    INSERT INTO public.resumes (
        id,
        user_id,
        title,
        template_id,
        is_base,
        status,
        ats_score
    ) VALUES (
        resume_id,
        'b4859a85-f5b2-4cd8-b3ab-24239e248a3d',
        'Senior PM Resume - TechCorp',
        modern_pro_template_id,
        true,
        'READY',
        88
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Resume Content
    INSERT INTO public.resume_contents (
        resume_id,
        name,
        title,
        summary,
        experience,
        skills
    ) VALUES (
        resume_id,
        'Alex Smith',
        'Senior Product Manager',
        'Innovative Senior Product Manager with 5+ years of experience scaling consumer applications and driving cross-functional teams to deliver impactful solutions.',
        '[{"company": "CurrentCo", "title": "Product Manager", "dates": "2020 - Present", "bullets": ["Led growth initiatives resulting in 30% MAU increase.", "Managed a team of 5 engineers and 2 designers."]}]'::jsonb,
        '{"technical": ["SQL", "Figma", "Jira"], "soft": ["Leadership", "Agile"]}'::jsonb
    ) ON CONFLICT (resume_id) DO NOTHING;
END $$;

-- 6. Insert Mock Interviews
INSERT INTO public.mock_interviews (
    id,
    user_id,
    job_application_id,
    role,
    company,
    interview_type,
    status,
    overall_score,
    communication_score,
    star_score,
    confidence_score
) VALUES 
('m1000000-0000-0000-0000-000000000001', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'a3000000-0000-0000-0000-000000000003', 'Product Lead', 'FintechCo', 'BEHAVIORAL', 'COMPLETED', 82, 85, 78, 88),
('m2000000-0000-0000-0000-000000000002', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'a1000000-0000-0000-0000-000000000001', 'Senior Product Manager', 'TechCorp', 'SYSTEM_DESIGN', 'IN_PROGRESS', null, null, null, null)
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Networking Contacts
INSERT INTO public.networking_contacts (
    id,
    user_id,
    name,
    role,
    company,
    relationship,
    status
) VALUES 
('n1000000-0000-0000-0000-000000000001', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'Jane Doe', 'Recruiter', 'TechCorp', 'RECRUITER', 'ACTIVE'),
('n2000000-0000-0000-0000-000000000002', 'b4859a85-f5b2-4cd8-b3ab-24239e248a3d', 'John Smith', 'Director of Product', 'StartupInc', 'MENTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
