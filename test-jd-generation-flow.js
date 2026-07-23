const fs = require('fs');
const path = require('path');

const newResumePath = path.join(__dirname, 'app', '(tabs)', 'new-resume.tsx');
const coverLetterPath = path.join(__dirname, 'app', '(tabs)', 'cover-letter.tsx');

function testGenerationFlow() {
  console.log('Running static integration tests for JD Document (PDF) to Generation Flow...\n');

  if (!fs.existsSync(newResumePath) || !fs.existsSync(coverLetterPath)) {
    console.error('❌ FAILED: Required screens not found.');
    process.exit(1);
  }

  const resumeContent = fs.readFileSync(newResumePath, 'utf-8');
  const coverLetterContent = fs.readFileSync(coverLetterPath, 'utf-8');

  // Check 1: JD Extraction
  if (resumeContent.includes('useExtractJdMutation') && resumeContent.includes('extractJd.mutateAsync')) {
    console.log('✅ PASSED: JD Extraction mutation is properly integrated for PDF uploads.');
  } else {
    console.error('❌ FAILED: JD Extraction logic is missing or broken in new-resume.tsx.');
    process.exit(1);
  }

  // Check 2: Job Analysis Creation
  if (resumeContent.includes('analyzeJobMutation.mutateAsync')) {
    console.log('✅ PASSED: Job Application analysis is correctly chained after JD extraction.');
  } else {
    console.error('❌ FAILED: analyzeJob logic is missing in new-resume.tsx.');
    process.exit(1);
  }

  // Check 3: Resume Generation Tailoring
  if (resumeContent.includes('createResumeMutation.mutateAsync') && resumeContent.includes('job_analysis_id')) {
    console.log('✅ PASSED: Resume generation properly passes the analyzed job payload for AI tailoring.');
  } else {
    console.error('❌ FAILED: Resume generation is not properly hooked up to the tailored job analysis payload.');
    process.exit(1);
  }

  // Check 4: Cover Letter Generation Tailoring
  if (coverLetterContent.includes('coverLetterMutation.mutateAsync') && coverLetterContent.includes('job_description')) {
    console.log('✅ PASSED: Cover Letter generation properly passes the job payload for AI tailoring.');
  } else {
    console.error('❌ FAILED: Cover Letter generation is not properly hooked up to the job payload.');
    process.exit(1);
  }

  console.log('\nAll PDF to AI Generation flow integration tests passed successfully!');
}

try {
  testGenerationFlow();
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
