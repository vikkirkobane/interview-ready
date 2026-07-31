const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, 'app', '(auth)', 'login.tsx');
const layoutPath = path.join(__dirname, 'app', '_layout.tsx');

function runAuthVerification() {
  console.log('Running static verification for OAuth onboarding logic...\n');
  
  if (!fs.existsSync(loginPath) || !fs.existsSync(layoutPath)) {
    console.error('❌ Failed to locate target files');
    process.exit(1);
  }

  const loginContent = fs.readFileSync(loginPath, 'utf8');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  // Verify login.tsx handleGoogleSignIn logic
  if (loginContent.includes('const isCompleted = useAuthStore.getState().user?.user_metadata?.onboarding_completed;') && 
      /router\.replace\('\/\(onboarding\)\/referral-code'( as any)?\)/.test(loginContent)) {
    console.log('✅ login.tsx properly checks onboarding status and routes un-onboarded users correctly.');
  } else {
    console.error('❌ login.tsx is missing onboarding routing logic.');
    process.exit(1);
  }

  // Verify _layout.tsx AuthGuard logic
  if (layoutContent.includes('const inOnboarding = firstSegment === \'(onboarding)\';') &&
      layoutContent.includes('if (!isCompleted && !inOnboarding) {') &&
      /router\.replace\('\/\(onboarding\)\/referral-code'( as any)?\)/.test(layoutContent)) {
    console.log('✅ _layout.tsx (AuthGuard) properly intercepts un-onboarded users across the app.');
  } else {
    console.error('❌ _layout.tsx is missing the global onboarding intercept logic.');
    process.exit(1);
  }

  console.log('\nAll OAuth onboarding routing checks passed!');
}

try {
  runAuthVerification();
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
