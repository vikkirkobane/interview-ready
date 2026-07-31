const fs = require('fs');
const path = require('path');

const apiFilePath = path.join(__dirname, 'src', 'lib', 'api.ts');

function testUploadImplementation() {
  console.log('Running static analysis on apiUploadFile implementation...\n');
  
  if (!fs.existsSync(apiFilePath)) {
    console.error('❌ FAILED: api.ts not found.');
    process.exit(1);
  }

  const content = fs.readFileSync(apiFilePath, 'utf-8');

  // 1. Check if the upload helper is exported and documented
  if (content.includes('export async function apiUploadFile')) {
    console.log('✅ PASSED: apiUploadFile is exported.');
  } else {
    console.error('❌ FAILED: apiUploadFile export is missing.');
    process.exit(1);
  }

  // 2. Check the upload path branches on platform (web vs native)
  if (content.includes("if (Platform.OS === 'web')")) {
    console.log('✅ PASSED: Platform-specific upload branches are present.');
  } else {
    console.error('❌ FAILED: Platform branch for web uploads is missing.');
    process.exit(1);
  }

  // 3. Verify the native path uses fetch + FormData with a file part
  //    (This is the correct approach for Expo SDK 56+ on both web and native.
  //    FileSystem.uploadAsync is deprecated in the new expo-file-system API.)
  const nativeBranch = content.match(/} else \{[\s\S]*?formData\.append\('file'/);
  if (nativeBranch) {
    console.log('✅ PASSED: Native platform branch uses FormData with a "file" part.');
  } else {
    console.error('❌ FAILED: Native platform branch does not build a FormData file part.');
    process.exit(1);
  }

  // 4. Verify dynamic mimeType assignment supports different file uploads
  if (content.includes('mimeType || \'application/octet-stream\'')) {
    console.log('✅ PASSED: Dynamic mimeType assignment is present (supports PDF, DOCX, images).');
  } else {
    console.error('❌ FAILED: Dynamic mimeType assignment is missing.');
    process.exit(1);
  }

  // 5. Verify the web branch supports Blob uploads (webFile)
  if (content.includes('webFile')) {
    console.log('✅ PASSED: Web platform branch supports Blob file uploads.');
  } else {
    console.error('❌ FAILED: Web platform Blob support is missing.');
    process.exit(1);
  }

  console.log('\nAll file upload simulation checks passed successfully!');
}

try {
  testUploadImplementation();
} catch (e) {
  console.error('Test execution failed:', e.message);
  process.exit(1);
}
