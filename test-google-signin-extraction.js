function testExtraction(userInfo, description) {
  const idToken = userInfo?.data?.idToken || userInfo?.idToken;
  
  let success = false;
  if (!idToken) {
    console.log(`[${description}] ❌ Failed to get Google ID token (Result: ${idToken})`);
  } else {
    console.log(`[${description}] ✅ Successfully extracted token: ${idToken}`);
    success = true;
  }
  return success;
}

console.log("--- Running Google Sign-In Token Extraction Tests ---\n");

// Scenario 1: Version 16+ structure (nested in data)
const v16UserInfo = {
  type: 'success',
  data: {
    idToken: "v16_token_12345",
    user: { email: "test@example.com" }
  }
};
testExtraction(v16UserInfo, "v16+ nested structure");

// Scenario 2: Older versions structure (flat)
const legacyUserInfo = {
  idToken: "legacy_token_67890",
  user: { email: "test@example.com" }
};
testExtraction(legacyUserInfo, "Legacy flat structure");

// Scenario 3: Cancelled or empty (no token)
const cancelledUserInfo = {
  type: 'cancelled'
};
testExtraction(cancelledUserInfo, "Cancelled / Missing token");

// Scenario 4: Undefined / Null
testExtraction(null, "Null userInfo");

console.log("\nAll tests complete!");
