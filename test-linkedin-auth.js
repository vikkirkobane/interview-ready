const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, 'app', '(auth)', 'login.tsx');
const signupPath = path.join(__dirname, 'app', '(auth)', 'signup.tsx');

function testFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the handleLinkedInSignIn function block
  const funcStart = content.indexOf('const handleLinkedInSignIn');
  if (funcStart === -1) {
    console.error(`❌ handleLinkedInSignIn not found in ${path.basename(filePath)}`);
    process.exit(1);
  }
  
  // Find the end of the function (rough heuristic)
  const returnStart = content.indexOf('return (', funcStart);
  const funcBody = content.substring(funcStart, returnStart);
  
  if (funcBody.includes("router.replace('/(tabs)')")) {
    console.error(`❌ FAILED: ${path.basename(filePath)} still contains synchronous router.replace('/(tabs)') inside handleLinkedInSignIn!`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${path.basename(filePath)} does not contain synchronous navigation in handleLinkedInSignIn.`);
  }
}

try {
  console.log('Running LinkedIn auth routing tests...');
  testFile(loginPath);
  testFile(signupPath);
  console.log('\nAll tests passed successfully!');
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
