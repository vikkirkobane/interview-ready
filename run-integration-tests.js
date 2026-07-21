const { execSync } = require('child_process');
const fs = require('fs');

const tests = [
  'test-auth.cjs',
  'test-onboarding.cjs',
  'test-profile-settings.cjs',
  'test-recent-activities.cjs'
];

let failed = false;

console.log("=====================================");
console.log("   RUNNING INTEGRATION TESTS         ");
console.log("=====================================\n");

for (const test of tests) {
  console.log(`\n▶ Running ${test}...`);
  try {
    const output = execSync(`node --env-file=.env ${test}`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    console.log(`✅ ${test} passed!`);
  } catch (error) {
    console.error(error.stdout);
    console.error(error.stderr);
    console.error(`❌ ${test} FAILED!`);
    failed = true;
  }
}

if (failed) {
  console.log("\n❌ Some tests failed.");
  process.exit(1);
} else {
  console.log("\n✅ All integration tests passed!");
  process.exit(0);
}
