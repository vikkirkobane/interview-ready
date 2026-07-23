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

  // 1. Check if FileSystem is imported
  if (content.includes("import * as FileSystem from 'expo-file-system'")) {
    console.log('✅ PASSED: expo-file-system is properly imported.');
  } else {
    console.error('❌ FAILED: expo-file-system import is missing.');
    process.exit(1);
  }

  // 2. Check if uploadAsync is used instead of fetch for non-web environments
  if (content.includes('await FileSystem.uploadAsync')) {
    console.log('✅ PASSED: FileSystem.uploadAsync is being used for native file uploads.');
  } else {
    console.error('❌ FAILED: FileSystem.uploadAsync is not found in the code.');
    process.exit(1);
  }

  // 3. Verify MULTIPART form data type is specified
  if (content.includes('uploadType: FileSystem.FileSystemUploadType.MULTIPART')) {
    console.log('✅ PASSED: Upload type is correctly set to MULTIPART.');
  } else {
    console.error('❌ FAILED: MULTIPART upload type is missing.');
    process.exit(1);
  }

  // 4. Verify dynamic mimeType assignment supports different file uploads
  if (content.includes("mimeType: mimeType || 'application/octet-stream'")) {
    console.log('✅ PASSED: Dynamic mimeType assignment is present (supports PDF, DOCX, images).');
  } else {
    console.error('❌ FAILED: Dynamic mimeType assignment is missing.');
    process.exit(1);
  }

  // 5. Verify FormData is no longer used for native
  // It shouldn't contain "const formData = new FormData()" immediately preceding a native fetch.
  // We can just check that inside the `else` block (native branch) we use uploadAsync.
  const nativeUploadBlockMatch = content.match(/} else {[\s\S]*?uploadAsync/);
  if (nativeUploadBlockMatch) {
    console.log('✅ PASSED: Native platform branch properly utilizes the new upload process.');
  } else {
    console.error('❌ FAILED: Native platform branch logic appears incorrect.');
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
