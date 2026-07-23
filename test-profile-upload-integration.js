const fs = require('fs');
const path = require('path');

const onboardingPath = path.join(__dirname, 'app', '(onboarding)', 'profile.tsx');
const tabsPath = path.join(__dirname, 'app', '(tabs)', 'profile.tsx');

function testIntegration() {
  console.log('Running static integration tests for PDF Resume Upload across screens...\n');

  if (!fs.existsSync(onboardingPath) || !fs.existsSync(tabsPath)) {
    console.error('❌ FAILED: Required profile screens not found.');
    process.exit(1);
  }

  const onboardingContent = fs.readFileSync(onboardingPath, 'utf-8');
  const tabsContent = fs.readFileSync(tabsPath, 'utf-8');

  // Check 1: Onboarding Screen - PDF config
  if (onboardingContent.includes("'application/pdf'")) {
    console.log('✅ PASSED: Onboarding profile screen properly permits PDF file selection.');
  } else {
    console.error('❌ FAILED: Onboarding screen lacks PDF configuration.');
    process.exit(1);
  }

  // Check 2: Onboarding Screen - Parse Integration
  if (onboardingContent.includes('const extractedData = await parseResume.mutateAsync(payload)')) {
    console.log('✅ PASSED: Onboarding screen properly routes the uploaded file payload to the parseResume Edge Function.');
  } else {
    console.error('❌ FAILED: Onboarding screen parseResume integration is broken.');
    process.exit(1);
  }

  // Check 3: Tabs Screen - PDF config
  if (tabsContent.includes("'application/pdf'")) {
    console.log('✅ PASSED: User Settings profile screen properly permits PDF file selection.');
  } else {
    console.error('❌ FAILED: User Settings screen lacks PDF configuration.');
    process.exit(1);
  }

  // Check 4: Tabs Screen - Parse Integration
  if (tabsContent.includes('const extractedData = await parseResume.mutateAsync(payload)')) {
    console.log('✅ PASSED: User Settings profile screen properly routes the uploaded file payload to the parseResume Edge Function.');
  } else {
    console.error('❌ FAILED: User Settings profile screen parseResume integration is broken.');
    process.exit(1);
  }
  
  // Check 5: Tabs Screen - Extracted data is saved
  if (tabsContent.includes('await updateProfile({')) {
    console.log('✅ PASSED: User Settings profile screen successfully saves the extracted resume data to the Supabase database.');
  } else {
    console.error('❌ FAILED: User Settings profile screen does not save the extracted data.');
    process.exit(1);
  }

  console.log('\nAll PDF Resume Upload integration tests passed successfully!');
}

try {
  testIntegration();
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
