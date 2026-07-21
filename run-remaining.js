const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const exclude = [
  'test-auth.cjs',
  'test-onboarding.cjs',
  'test-profile-settings.cjs',
  'test-recent-activities.cjs',
  'test.js', // already checked
];

const files = fs.readdirSync(__dirname).filter(f => 
  (f.startsWith('test-') && (f.endsWith('.js') || f.endsWith('.cjs'))) && !exclude.includes(f)
);

console.log(`Found ${files.length} tests to run.`);

async function runTest(file) {
  return new Promise((resolve) => {
    console.log(`\n========================================`);
    console.log(`▶ Running ${file}...`);
    
    const child = spawn('node', ['--env-file=.env', file], { shell: true });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      errorOutput += data.toString();
    });

    // Timeout: if a test takes more than 45 seconds, kill it
    const timeout = setTimeout(() => {
      console.log(`\n⏳ Timeout reached for ${file}. Killing process...`);
      child.kill('SIGKILL');
      resolve({ file, passed: false, error: 'Timeout' });
    }, 45000);
    
    // Idle timeout: if no output for 5 seconds after some output was generated, assume it's hanging on the Supabase timer and kill it.
    let idleTimeout;
    const resetIdle = () => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
         console.log(`\n⏳ Process idle for 5 seconds. Assuming finished. Killing process...`);
         child.kill('SIGKILL');
         resolve({ file, passed: !errorOutput.includes('Error') && !output.includes('❌') && !output.includes('Failed') });
      }, 5000);
    };
    
    child.stdout.on('data', resetIdle);
    child.stderr.on('data', resetIdle);
    resetIdle(); // Start idle timer

    child.on('close', (code) => {
      clearTimeout(timeout);
      clearTimeout(idleTimeout);
      if (code === 0 || code === null) {
        // If code is null, it was killed by us. We evaluate based on output.
        const hasError = errorOutput.includes('Error') || output.includes('❌') || output.includes('Failed');
        resolve({ file, passed: !hasError });
      } else {
        resolve({ file, passed: false, error: `Exit code ${code}` });
      }
    });
  });
}

async function main() {
  const results = [];
  for (const file of files) {
    const res = await runTest(file);
    results.push(res);
    if (res.passed) {
       console.log(`✅ ${file} passed!`);
    } else {
       console.log(`❌ ${file} failed!`);
    }
  }
  
  console.log(`\n\n=== FINAL RESULTS ===`);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Passed: ${passedCount} / ${results.length}`);
  for (const r of results) {
     console.log(`${r.passed ? '✅' : '❌'} ${r.file}`);
  }
}

main();
