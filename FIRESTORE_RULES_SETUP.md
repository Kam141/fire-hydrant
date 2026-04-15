# Firestore Security Rules Setup

## Problem

You're seeing "Missing or insufficient permissions" errors when trying to fetch user data via the admin API, even though you're logged in as admin. This is because Firestore has default security rules that block all read/write operations.

## Solution

You need to set up proper Firestore security rules. Follow these steps:

## Step-by-Step Setup

### 1. Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### 2. Replace Security Rules

1. You should see the current rules (likely the default deny-all rules)
2. Delete all existing content
3. Copy the entire content from `firestore.rules` file in this project
4. Paste it into the Rules editor
5. Click **Publish**

Your rules should look like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions...
    function isAdmin(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role == 'admin';
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    // Users collection rules...
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow read: if isAuthenticated() && isAdmin(request.auth.uid);
      allow write: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && isAdmin(request.auth.uid);
    }

    match /users/{document=**} {
      allow read: if isAuthenticated() && isAdmin(request.auth.uid);
    }
  }
}
```

### 3. Verify Rules

After publishing:

1. Go back to **Data** tab
2. You should see your `users` collection with user documents
3. Go back to the app and try accessing the admin panel again

## What These Rules Do

### isAdmin(uid)

- Checks if a user's document has `role: 'admin'`
- Used to verify admin access before allowing operations

### All Users Collection Permissions

**Authenticated users can:**

- Read their own user document
- Write/modify their own user document

**Admins can:**

- Read any user document
- Update any user document
- Read all documents in the users collection

**Everyone else:**

- Cannot read/write the users collection

## Testing the Rules

### Test 1: Non-admin user tries to access admin panel

1. Log in as a regular user
2. Go to `/admin/user-management`
3. Should see "Access Denied" and redirect to dashboard
4. Check browser console - should see 403 error from API

### Test 2: Admin user accesses admin panel

1. Log in as admin
2. Go to `/admin/user-management`
3. Should see list of all users
4. Should be able to change user roles

### Test 3: Firestore rules work correctly

1. Open browser DevTools → Network tab
2. Go to user management page
3. Check the API request `/api/admin/users`
4. Should see successful response with user list

## Adding More Rules

If you have other collections (like sensor logs, events, etc.), add them to the rules:

```
match /sensorLogs/{document=**} {
  // All authenticated users can read logs
  allow read: if isAuthenticated();

  // Only admins/petugas can write logs
  allow write: if isAuthenticated() && (isAdmin(request.auth.uid) ||
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'petugas');
}
```

## Troubleshooting

### Still getting 403 errors?

1. **Check if rules were published**: Go to Firebase Rules tab - look for green checkmark
2. **Clear browser cache**: Ctrl+Shift+Delete or Cmd+Shift+Delete
3. **Log out and back in**: Forces new token generation
4. **Check user role in Firebase**: Go to Data tab, check `users` collection, verify role is "admin"

### Rules validation error?

1. Check for syntax errors in the rules
2. Make sure all `match` blocks are properly closed
3. Look at the error message in the Rules editor for hints

### API still returns 403?

1. Check browser console for detailed error message
2. The server logs should show where it's failing
3. If it says "Missing or insufficient permissions", it's a Firestore rules issue
4. Re-publish the rules and force-refresh the page

## Security Notes

⚠️ **Important:** These rules are for development. For production:

1. **Add more granular checks**: Verify user exists before accessing
2. **Rate limiting**: Consider adding request limit rules
3. **Data validation**: Validate that updated data matches expected schema
4. **Audit logging**: Log important operations
5. **Role-based actions**: Add checks for specific operations per role

Example safer rules for production:

```
match /users/{userId} {
  allow read: if isAuthenticated() &&
              (request.auth.uid == userId || isAdmin(request.auth.uid));

  allow update: if isAuthenticated() && isAdmin(request.auth.uid) &&
                request.resource.data.keys().hasOnly(['role', 'displayName', 'photoURL']);
}
```

## Reference

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [Firestore Security Cheat Sheet](https://firebase.google.com/docs/firestore/security/rules-structure)
