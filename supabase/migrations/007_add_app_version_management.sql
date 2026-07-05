-- Migration: Add App Version Management
-- Description: Adds table and functions for managing app version requirements and force updates
-- Version: 1.0.0
-- Date: 2026-07-04

-- Create app_versions table to store minimum required versions
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'all')),
  minimum_version TEXT NOT NULL, -- Semantic version format: "1.0.0"
  latest_version TEXT NOT NULL, -- Latest available version
  force_update BOOLEAN DEFAULT false, -- If true, users must update immediately
  update_message TEXT, -- Custom message to display to users
  store_url TEXT, -- App store/Play store URL for updates
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create partial unique index to ensure only one active version config per platform
CREATE UNIQUE INDEX idx_app_versions_platform_active_unique 
  ON public.app_versions(platform) 
  WHERE is_active = true;

-- Create index for faster lookups
CREATE INDEX idx_app_versions_platform_active ON public.app_versions(platform, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active version requirements (needed for version check before auth)
CREATE POLICY "Anyone can read active app versions"
  ON public.app_versions
  FOR SELECT
  USING (is_active = true);

-- Only service role can insert/update/delete (managed via Supabase dashboard or admin tools)
-- Regular users cannot modify version configs
CREATE POLICY "Only service role can manage app versions"
  ON public.app_versions
  FOR ALL
  USING (false);

-- Function to check if app version is valid
CREATE OR REPLACE FUNCTION public.check_app_version(
  p_platform TEXT,
  p_current_version TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_result JSON;
  v_needs_update BOOLEAN;
  v_force_update BOOLEAN;
BEGIN
  -- Get active version config for platform or 'all'
  SELECT * INTO v_config
  FROM public.app_versions
  WHERE is_active = true
    AND (platform = p_platform OR platform = 'all')
  ORDER BY 
    CASE 
      WHEN platform = p_platform THEN 1
      WHEN platform = 'all' THEN 2
    END
  LIMIT 1;

  -- If no config found, allow access
  IF v_config IS NULL THEN
    RETURN json_build_object(
      'is_valid', true,
      'needs_update', false,
      'force_update', false,
      'message', 'No version requirements configured'
    );
  END IF;

  -- Compare versions (simple string comparison for semantic versioning)
  -- Format: "major.minor.patch" e.g., "1.2.3"
  v_needs_update := public.compare_versions(p_current_version, v_config.minimum_version) < 0;
  v_force_update := v_needs_update AND v_config.force_update;

  -- Build result
  v_result := json_build_object(
    'is_valid', NOT v_force_update,
    'needs_update', v_needs_update,
    'force_update', v_force_update,
    'current_version', p_current_version,
    'minimum_version', v_config.minimum_version,
    'latest_version', v_config.latest_version,
    'message', COALESCE(v_config.update_message, 'A new version is available. Please update to continue.'),
    'store_url', v_config.store_url,
    'platform', v_config.platform
  );

  RETURN v_result;
END;
$$;

-- Function to compare semantic versions
-- Returns: -1 if v1 < v2, 0 if v1 = v2, 1 if v1 > v2
CREATE OR REPLACE FUNCTION public.compare_versions(
  v1 TEXT,
  v2 TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v1_parts TEXT[];
  v2_parts TEXT[];
  v1_major INTEGER;
  v1_minor INTEGER;
  v1_patch INTEGER;
  v2_major INTEGER;
  v2_minor INTEGER;
  v2_patch INTEGER;
BEGIN
  -- Split versions by '.'
  v1_parts := string_to_array(v1, '.');
  v2_parts := string_to_array(v2, '.');

  -- Parse version components (default to 0 if missing)
  v1_major := COALESCE(v1_parts[1]::INTEGER, 0);
  v1_minor := COALESCE(v1_parts[2]::INTEGER, 0);
  v1_patch := COALESCE(v1_parts[3]::INTEGER, 0);
  
  v2_major := COALESCE(v2_parts[1]::INTEGER, 0);
  v2_minor := COALESCE(v2_parts[2]::INTEGER, 0);
  v2_patch := COALESCE(v2_parts[3]::INTEGER, 0);

  -- Compare major version
  IF v1_major < v2_major THEN
    RETURN -1;
  ELSIF v1_major > v2_major THEN
    RETURN 1;
  END IF;

  -- Compare minor version
  IF v1_minor < v2_minor THEN
    RETURN -1;
  ELSIF v1_minor > v2_minor THEN
    RETURN 1;
  END IF;

  -- Compare patch version
  IF v1_patch < v2_patch THEN
    RETURN -1;
  ELSIF v1_patch > v2_patch THEN
    RETURN 1;
  END IF;

  -- Versions are equal
  RETURN 0;
END;
$$;

-- Function to update app version configuration
-- Note: This function should be called via Supabase dashboard SQL editor (service role)
CREATE OR REPLACE FUNCTION public.update_app_version_config(
  p_platform TEXT,
  p_minimum_version TEXT,
  p_latest_version TEXT,
  p_force_update BOOLEAN DEFAULT false,
  p_update_message TEXT DEFAULT NULL,
  p_store_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config_id UUID;
BEGIN
  -- Validate platform
  IF p_platform NOT IN ('ios', 'android', 'all') THEN
    RAISE EXCEPTION 'Invalid platform. Must be one of: ios, android, all';
  END IF;

  -- Deactivate existing config for this platform
  UPDATE public.app_versions
  SET is_active = false,
      updated_at = NOW()
  WHERE platform = p_platform
    AND is_active = true;

  -- Insert new config
  INSERT INTO public.app_versions (
    platform,
    minimum_version,
    latest_version,
    force_update,
    update_message,
    store_url,
    is_active,
    created_by
  )
  VALUES (
    p_platform,
    p_minimum_version,
    p_latest_version,
    p_force_update,
    p_update_message,
    p_store_url,
    true,
    auth.uid()
  )
  RETURNING id INTO v_config_id;

  RETURN json_build_object(
    'success', true,
    'config_id', v_config_id,
    'platform', p_platform,
    'minimum_version', p_minimum_version,
    'latest_version', p_latest_version,
    'force_update', p_force_update
  );
END;
$$;

-- Insert default version configurations
INSERT INTO public.app_versions (platform, minimum_version, latest_version, force_update, update_message, store_url, is_active)
VALUES 
  ('ios', '1.0.0', '1.0.0', false, 'A new version of Interview Ready is available. Update now for the best experience!', 'https://apps.apple.com/app/interview-ready/id123456789', true),
  ('android', '1.0.0', '1.0.0', false, 'A new version of Interview Ready is available. Update now for the best experience!', 'https://play.google.com/store/apps/details?id=com.interviewready.app', true)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_app_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_versions_updated_at
  BEFORE UPDATE ON public.app_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_versions_updated_at();

-- Grant permissions
GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT ALL ON public.app_versions TO service_role;

-- Add comments
COMMENT ON TABLE public.app_versions IS 'Stores minimum required app versions and force update configurations';
COMMENT ON FUNCTION public.check_app_version IS 'Checks if the current app version meets minimum requirements';
COMMENT ON FUNCTION public.compare_versions IS 'Compares two semantic version strings';
COMMENT ON FUNCTION public.update_app_version_config IS 'Updates app version configuration (call via Supabase dashboard)';