# Firebase Admin SDK Setup

## Problem

The API endpoint `/api/admin/users` was using client-side Firebase SDK in a Node.js environment, which doesn't have proper authentication context. This causes "Missing or insufficient permissions" errors.

## Solution

Use **Firebase Admin SDK** on the server-side, which has full Firestore access and doesn't need to follow security rules.

## Setup Steps

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ **Project Settings** (top-left, next to project name)
4. Go to **Service Accounts** tab
5. Under "Firebase Admin SDK", click **Generate New Private Key**
6. A JSON file will download (like `fire-hydrant-xxxxx-firebase-adminsdk-xxxxx-xxxxx.json`)

### 3. Add Service Account to Environment

**Option A: Using .env.local (Recommended for Development)**

1. Open `.env.local` at the project root (create if doesn't exist)
2. Add the path to your service account JSON file:

   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-adminsdk-xxxxx-xxxxx.json
   ```

3. Also add the service account credentials as environment variables (for deployment):
   ```
   FIREBASE_ADMIN_PROJECT_ID=your-project-id
   FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   ```

**Option B: Place file in project**

1. Move the downloaded JSON file to your project root
2. Rename it to `firebase-adminsdk-key.json` (optional)
3. The `src/lib/firebaseAdmin.ts` will automatically detect and use it

### 4. Update firebaseAdmin.ts

If using environment variables, update `src/lib/firebaseAdmin.ts`:

```typescript
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin");
  }
}
```

### 5. Restart Development Server

```bash
npm run dev
```

## Testing

1. Make sure you're logged in as an admin user
2. Go to Admin Panel (`/admin/user-management`)
3. Check the browser console and server terminal
4. You should see:
   - "Token verified for user: xxx"
   - "Admin verified for user: xxx"
   - "Successfully fetched users: X"

## Environment Variables Reference

### For .env.local (Development)

```
GOOGLE_APPLICATION_CREDENTIALS=/full/path/to/firebase-adminsdk-key.json
```

### For .env.production (or deployment platforms like Vercel)

```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## Finding Your Values

**FIREBASE_ADMIN_PROJECT_ID:**

- In the downloaded JSON file: `"project_id": "your-project-id"`
- In Firebase Console: Project Settings → General (ID is shown at top)

**FIREBASE_ADMIN_CLIENT_EMAIL:**

- In the downloaded JSON file: `"client_email": "..."`

**FIREBASE_ADMIN_PRIVATE_KEY:**

- In the downloaded JSON file: `"private_key": ""`
- Make sure to escape newlines as `\n`

## Security

⚠️ **Important Security Notes:**

1. **Never commit** `firebase-adminsdk-key.json` or private keys to Git
2. Add to `.gitignore`:

   ```
   firebase-adminsdk-key.json
   .env.local
   ```

3. **For production (Vercel, Firebase Hosting, etc.):**
   - Use platform's environment variable system
   - Never paste keys directly in code
   - Rotate keys periodically

4. **Service Account Permissions:**
   - The service account has full access to your Firebase project
   - Only use it for server-side operations
   - Treat it like a password

## Troubleshooting

### "Could not initialize Firebase Admin"

- Check if `GOOGLE_APPLICATION_CREDENTIALS` path is correct (absolute path required)
- Verify the JSON file exists at that location
- Check `npm install firebase-admin` was successful

### "Token verification error"

- Token might be expired
- Log out and back in to get a fresh token
- Check browser DevTools → Application → Cookies for auth token

### "Admin access required" (403 error)

- Verify user role is set to "admin" in Firestore
- Go to Firebase Console → Firestore → users collection
- Check the user document has `role: "admin"`

### Still getting "Missing or insufficient permissions"

- This means the Admin SDK isn't initialized properly
- Check console logs during server startup for initialization errors
- Verify service account has Firestore read/write permissions

## API Endpoints Now Working

✅ **GET /api/admin/users** - Fetch all users (admin only)  
✅ **POST /api/admin/users** - Update user role (admin only)

Both endpoints now use Firebase Admin SDK and will work correctly with proper authentication.

## Reference

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Service Accounts](https://firebase.google.com/docs/auth/admin-setup)
- [Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
