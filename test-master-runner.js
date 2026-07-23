/**
 * Master Test Runner for Interview Ready App
 *
 * Orchestrates all test suites for the main user stories:
 * - Authentication flows
 * - Email confirmation workflows
 * - Resume creation with various inputs
 * - Output relevance validation
 */

const fs = require('fs');
const path = require('path');

// Import test modules
const { MockAppSimulator } = require('./test-main-user-stories');
const { RelevanceValidationTester } = require('./test-output-relevance');
const { EmailConfirmationTestSuite } = require('./test-email-workflows');

class MasterTestRunner {
  constructor() {
    this.results = {
      mainUserStories: null,
      outputRelevance: null,
      emailWorkflows: null
    };
  }

  async runMainUserStoryTests() {
    console.log('🚀 RUNNING MAIN USER STORY TESTS');
    console.log('================================');

    try {
      const simulator = new MockAppSimulator();
      await simulator.runAllTests();
      this.results.mainUserStories = 'PASSED';
    } catch (error) {
      console.error('❌ Main user story tests failed:', error.message);
      this.results.mainUserStories = 'FAILED';
    }
  }

  async runOutputRelevanceTests() {
    console.log('\n🔍 RUNNING OUTPUT RELEVANCE TESTS');
    console.log('=================================');

    try {
      const tester = new RelevanceValidationTester();
      await tester.runRelevanceTests();
      this.results.outputRelevance = 'PASSED';
    } catch (error) {
      console.error('❌ Output relevance tests failed:', error.message);
      this.results.outputRelevance = 'FAILED';
    }
  }

  async runEmailWorkflowTests() {
    console.log('\n📧 RUNNING EMAIL WORKFLOW TESTS');
    console.log('=============================');

    try {
      const testSuite = new EmailConfirmationTestSuite();
      await testSuite.runAllTests();
      this.results.emailWorkflows = 'PASSED';
    } catch (error) {
      console.error('❌ Email workflow tests failed:', error.message);
      this.results.emailWorkflows = 'FAILED';
    }
  }

  generateMasterReport() {
    console.log('\n🎯 MASTER TEST SUITE REPORT');
    console.log('==========================');

    const statuses = Object.values(this.results);
    const passed = statuses.filter(status => status === 'PASSED').length;
    const failed = statuses.filter(status => status === 'FAILED').length;
    const total = statuses.length;

    console.log('\n📊 Test Suite Results:');
    console.log(`   Main User Stories: ${this.results.mainUserStories}`);
    console.log(`   Output Relevance: ${this.results.outputRelevance}`);
    console.log(`   Email Workflows: ${this.results.emailWorkflows}`);

    console.log(`\n📈 Overall Summary:`);
    console.log(`   Total Suites: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log(`\n🚨 ${failed} test suite(s) failed.`);
      console.log(`   Please run individual test files to diagnose issues:`);
      console.log(`   - node test-main-user-stories.js`);
      console.log(`   - node test-output-relevance.js`);
      console.log(`   - node test-email-workflows.js`);
      process.exit(1);
    } else {
      console.log(`\n🎉 ALL TEST SUITES PASSED!`);
      console.log(`   The main user stories are fully functional and validated.`);
      process.exit(0);
    }
  }

  async runAllTests() {
    console.log('🌟 STARTING COMPREHENSIVE TEST SUITE FOR INTERVIEW READY APP');
    console.log('========================================================');
    console.log('Testing core user flows and business logic validation...');
    console.log('');

    // Run all test suites sequentially
    await this.runMainUserStoryTests();
    await this.runOutputRelevanceTests();
    await this.runEmailWorkflowTests();

    this.generateMasterReport();
  }

  async runSelectiveTests(suiteName) {
    console.log(`🔍 RUNNING SELECTIVE TESTS FOR: ${suiteName.toUpperCase()}`);
    console.log('===============================================');

    switch(suiteName.toLowerCase()) {
      case 'auth':
      case 'authentication':
        await this.runMainUserStoryTests();
        break;
      case 'relevance':
      case 'validation':
        await this.runOutputRelevanceTests();
        break;
      case 'email':
      case 'notifications':
        await this.runEmailWorkflowTests();
        break;
      case 'all':
        await this.runAllTests();
        return;
      default:
        console.log(`❌ Unknown test suite: ${suiteName}`);
        console.log(`   Available suites: auth, relevance, email, all`);
        return;
    }

    // Generate report for the specific suite
    console.log(`\n📋 ${suiteName.toUpperCase()} TEST SUITE COMPLETE`);
    console.log('================================');
    switch(suiteName.toLowerCase()) {
      case 'auth':
      case 'authentication':
        console.log(`Main User Stories Result: ${this.results.mainUserStories}`);
        break;
      case 'relevance':
      case 'validation':
        console.log(`Output Relevance Result: ${this.results.outputRelevance}`);
        break;
      case 'email':
      case 'notifications':
        console.log(`Email Workflows Result: ${this.results.emailWorkflows}`);
        break;
    }
  }
}

// Command line interface
async function runTests() {
  const runner = new MasterTestRunner();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Run selective tests based on argument
    const suite = args[0];
    await runner.runSelectiveTests(suite);
  } else {
    // Run all tests by default
    await runner.runAllTests();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Master test runner failed:', err);
    process.exit(1);
  });
}

module.exports = MasterTestRunner;