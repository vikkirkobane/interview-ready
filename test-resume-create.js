const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'supabase', 'functions', 'resumes-create', 'index.ts');

function testFile() {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log('Running static analysis on resumes-create Edge Function...');

  // Check 1: Ensure mock user is removed
  if (content.includes("const user = { id: 'mock-user-123' }")) {
    console.error('❌ FAILED: Mock user is still present in the file!');
    process.exit(1);
  } else {
    console.log('✅ PASSED: Mock user has been removed.');
  }

  // Check 2: Ensure proper Supabase auth fetch is implemented
  if (content.includes('client.auth.getUser()')) {
    console.log('✅ PASSED: Function properly fetches the authenticated user via Supabase Auth.');
  } else {
    console.error('❌ FAILED: client.auth.getUser() is missing!');
    process.exit(1);
  }

  // Check 3: Ensure UnauthorizedError is thrown if no session
  if (content.includes("throw new UnauthorizedError('No active session')")) {
    console.log('✅ PASSED: Function correctly throws an UnauthorizedError when session is missing.');
  } else {
    console.error('❌ FAILED: UnauthorizedError handling is missing!');
    process.exit(1);
  }
}

try {
  testFile();
  console.log('\nAll verification checks passed successfully!');
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
