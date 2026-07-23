/**
 * Enhanced Master Test Runner for Interview Ready App
 *
 * Orchestrates all test suites including new cover letter functionality
 */

const { execSync } = require('child_process');

console.log('🌟 STARTING ENHANCED COMPREHENSIVE TEST SUITE FOR INTERVIEW READY APP');
console.log('===============================================================');
console.log('Running all test suites including cover letter generation & export...\n');

const testSuites = [
  { name: 'Main User Stories', file: 'test-main-user-stories.js' },
  { name: 'Output Relevance', file: 'test-output-relevance.js' },
  { name: 'Email Workflows', file: 'test-email-workflows.js' },
  { name: 'Cover Letter Generation', file: 'test-cover-letter-generation.js' }
];

const results = {};

for (const suite of testSuites) {
  console.log(`🚀 Running ${suite.name} tests...`);
  try {
    execSync(`node ${suite.file}`, { stdio: 'inherit' });
    results[suite.name] = 'PASSED';
    console.log(`✅ ${suite.name} tests: PASSED\n`);
  } catch (error) {
    results[suite.name] = 'FAILED';
    console.log(`❌ ${suite.name} tests: FAILED\n`);
  }
}

console.log('🎯 FINAL ENHANCED TEST SUITE REPORT');
console.log('==================================');

const passed = Object.values(results).filter(status => status === 'PASSED').length;
const failed = Object.values(results).filter(status => status === 'FAILED').length;
const total = Object.keys(results).length;

console.log('\n📊 Final Results:');
Object.entries(results).forEach(([suite, status]) => {
  const icon = status === 'PASSED' ? '✅' : '❌';
  console.log(`   ${icon} ${suite}: ${status}`);
});

console.log(`\n📈 Summary:`);
console.log(`   Total Suites: ${total}`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log(`\n🚨 ${failed} test suite(s) failed.`);
  console.log(`   Please check the individual test output above.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL TEST SUITES PASSED!`);
  console.log(`   The complete Interview Ready app functionality is validated.`);
  console.log(`   Including: Authentication, Resume Generation, Cover Letters, and Export Functions.`);
  process.exit(0);
}