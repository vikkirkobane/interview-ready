# Supabase Identity Linking Implementation

This document describes the implementation of Supabase identity linking functionality in the Interview Ready app.

## Overview

The identity linking feature allows users to connect multiple authentication providers (Google, LinkedIn, etc.) to a single user account. This enables users to sign in with any of their linked providers while maintaining a unified profile and data.

## Technical Implementation

### 1. Auth Store Extensions

The `src/stores/auth-store.ts` file has been extended with three new methods:

- `linkIdentity(provider: string)`: Links an additional OAuth provider to the current user account
- `unlinkIdentity(identityId: string)`: Removes a linked identity from the user account
- `getUserIdentities()`: Retrieves all identities linked to the user account

### 2. Identity Manager Component

The `src/components/IdentityManager.tsx` component provides:

- A UI to view all linked accounts
- Ability to link new providers (Google, LinkedIn)
- Ability to unlink existing providers
- Visual indicators for each provider type
- Confirmation dialogs for unlinking

### 3. Profile Screen Integration

The `app/(tabs)/profile.tsx` screen now includes the IdentityManager component, making it accessible to users from their profile.

## How It Works

1. **Linking Flow**: User initiates linking from the profile screen → OAuth popup opens → Supabase handles the OAuth flow → Identity gets linked to the current account
2. **Viewing Identities**: Component fetches and displays all linked identities
3. **Unlinking Flow**: User confirms unlinking action → Identity is removed from the account → User can no longer sign in with that provider

## Security Considerations

- Only the user's own identities can be managed
- Supabase's built-in security handles authorization
- Unlinking requires confirmation to prevent accidental removal
- OAuth flows use PKCE for enhanced security

## Configuration Requirements

To enable this feature, you must:

1. Enable "Manual Linking" in your Supabase dashboard under Authentication settings
2. Configure OAuth providers (Google, LinkedIn) in the dashboard
3. Add the appropriate redirect URLs to your OAuth provider configurations

## Providers Supported

Currently supports linking:
- Google
- LinkedIn
- Any other OAuth provider configured in your Supabase project

## Error Handling

- Network errors are caught and displayed to the user
- Invalid operations return appropriate error messages
- Toast notifications inform users of success/failure
- Confirmation dialogs prevent accidental account removal

## Testing

The implementation includes:
- Unit tests for all auth store methods
- Integration test demonstrating the full flow
- Validation script to verify implementation completeness
- Error handling tests

Run the validation with: `node check-identity-linking.js`

## User Experience

Users can now:
- See all their linked accounts in one place
- Easily link new providers to their account
- Safely unlink providers they no longer want to use
- Maintain the same profile/data regardless of which provider they sign in with