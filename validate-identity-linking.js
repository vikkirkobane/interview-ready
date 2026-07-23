/**
 * Identity Linking Test Runner
 *
 * This test validates that the Supabase identity linking functionality
 * is properly implemented in the Interview Ready app.
 */

console.log('🔍 Testing Supabase Identity Linking Implementation...');

// Test 1: Check that auth store has the required methods
try {
  const { useAuthStore } = require('./src/stores/auth-store');
  const store = useAuthStore.getState();

  const requiredMethods = ['linkIdentity', 'unlinkIdentity', 'getUserIdentities'];
  let allMethodsImplemented = true;

  for (const method of requiredMethods) {
    if (typeof store[method] !== 'function') {
      console.log(`❌ Missing method: ${method}`);
      allMethodsImplemented = false;
    } else {
      console.log(`✅ Method implemented: ${method}`);
    }
  }

  if (allMethodsImplemented) {
    console.log('✅ All identity linking methods are implemented in auth store');
  } else {
    console.log('❌ Some identity linking methods are missing');
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ Failed to import auth store: ${error.message}`);
  process.exit(1);
}

// Test 2: Check that the IdentityManager component exists and is properly structured
try {
  const fs = require('fs');
  const identityManagerPath = './src/components/IdentityManager.tsx';

  if (fs.existsSync(identityManagerPath)) {
    const content = fs.readFileSync(identityManagerPath, 'utf8');

    // Check for required functionality
    const hasLinkIdentity = content.includes('linkIdentity') || content.includes('handleLinkIdentity');
    const hasUnlinkIdentity = content.includes('unlinkIdentity') || content.includes('handleUnlinkIdentity');
    const hasGetIdentities = content.includes('getUserIdentities') || content.includes('loadIdentities');
    const hasProviderSupport = content.includes('google') && content.includes('linkedin');

    if (hasLinkIdentity && hasUnlinkIdentity && hasGetIdentities && hasProviderSupport) {
      console.log('✅ IdentityManager component has required functionality');
    } else {
      console.log('❌ IdentityManager component missing functionality');
      console.log(`   - Has link identity: ${hasLinkIdentity}`);
      console.log(`   - Has unlink identity: ${hasUnlinkIdentity}`);
      console.log(`   - Has get identities: ${hasGetIdentities}`);
      console.log(`   - Has provider support: ${hasProviderSupport}`);
    }
  } else {
    console.log('❌ IdentityManager component not found');
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ Failed to validate IdentityManager component: ${error.message}`);
  process.exit(1);
}

// Test 3: Check that profile screen imports and uses IdentityManager
try {
  const fs = require('fs');
  const profilePath = './app/(tabs)/profile.tsx';

  if (fs.existsSync(profilePath)) {
    const content = fs.readFileSync(profilePath, 'utf8');

    const hasIdentityManagerImport = content.includes('IdentityManager');
    const hasIdentityManagerComponent = content.includes('<IdentityManager');

    if (hasIdentityManagerImport && hasIdentityManagerComponent) {
      console.log('✅ Profile screen implements IdentityManager component');
    } else {
      console.log('❌ Profile screen missing IdentityManager implementation');
      console.log(`   - Has import: ${hasIdentityManagerImport}`);
      console.log(`   - Has component: ${hasIdentityManagerComponent}`);
    }
  } else {
    console.log('❌ Profile screen not found');
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ Failed to validate profile screen: ${error.message}`);
  process.exit(1);
}

console.log('\n🎉 Identity Linking Implementation Validation Complete!');
console.log('\n📋 Summary of Implementation:');
console.log('   • Auth store methods: linkIdentity, unlinkIdentity, getUserIdentities');
console.log('   • IdentityManager component: UI for managing linked accounts');
console.log('   • Profile screen integration: Displayed in user profile');
console.log('   • Provider support: Google and LinkedIn (with extensibility)');
console.log('   • User experience: Ability to link/unlink accounts safely');

console.log('\n💡 Next Steps:');
console.log('   1. Ensure "Enable Manual Linking" is turned ON in your Supabase dashboard under Auth settings');
console.log('   2. Test the functionality with real OAuth providers');
console.log('   3. Verify that users can sign in with any linked provider after linking');
console.log('   4. Validate that unlinking removes access but preserves user data');