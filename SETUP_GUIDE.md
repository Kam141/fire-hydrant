# Quick Setup Guide - Role-Based Access Control

## 🎯 Step-by-Step Setup

### Step 0: Set Up Firestore Security Rules (IMPORTANT!)

⚠️ **Do this first!** Without proper Firestore security rules, you'll see "permission denied" errors.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Firestore Database** → **Rules** tab
3. Copy all content from `firestore.rules` in this project
4. Paste it into the Rules editor
5. Click **Publish**

See [FIRESTORE_RULES_SETUP.md](./FIRESTORE_RULES_SETUP.md) for detailed instructions.

### Step 1: Set Up First Admin User

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **Register a user account**
   - Go to `/auth/register`
   - Create an account with your preferred email and password

3. **Access Firebase Firestore Console**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Firestore Database

4. **Update User Role**
   - Navigate to `users` collection
   - Find the document with your email address (ID should be your Firebase UID)
   - Click the document to open it
   - Find the `role` field (should be "user")
   - Click on the `role` field and change it to `admin`
   - Click outside or press Enter to save

5. **Refresh the app**
   - Go back to the app and refresh the page
   - You should now see "Manajemen Pengguna" in the sidebar

### Step 2: Test Admin Panel

1. Click "Manajemen Pengguna" in the sidebar
2. You should see a list of all registered users
3. Try changing a user's role using the dropdown
4. Verify the change appears immediately

### Step 3: Register and Assign Roles to Other Users

1. Register additional user accounts
2. Go to Admin Panel → User Management
3. Change their roles:
   - **Admin**: For system administrators
   - **Petugas**: For technicians/operators
   - **User**: For regular viewers

### Step 4: Test Role-Based Access

1. **Log out** from admin account
2. **Register a new user** or use an existing non-admin account
3. Try accessing `/admin/user-management` directly in URL
4. You should be redirected to dashboard (no access)

## 🔒 Protect Existing Pages

To restrict access to existing pages, wrap them with `withRoleProtection`. The HOC automatically reads permissions from `roleConfig.ts`:

### Example: Protect Auto-Control Page

**Before:**

```typescript
// src/pages/auto-control/index.tsx
export default function AutoControl() {
  return <div>Auto Control</div>;
}
```

**After:**

```typescript
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function AutoControl() {
  return <div>Auto Control</div>;
}

export default withRoleProtection(AutoControl);
```

### Configure Route Permissions

Edit `src/lib/roleConfig.ts` to define which roles can access each route:

```typescript
export const ROLE_BASED_ROUTES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "petugas", "user"],
  "/auto-control": ["admin", "petugas"],
  "/manual-control": ["admin", "petugas"],
  // Add your routes here
};
```

### Apply to All Key Pages

```typescript
// src/pages/auto-control/index.tsx
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function AutoControl() {
  return <div>Auto Control</div>;
}

export default withRoleProtection(AutoControl);
// Permissions defined in roleConfig: ['admin', 'petugas']

// src/pages/manual-control/index.tsx
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function ManualControl() {
  return <div>Manual Control</div>;
}

export default withRoleProtection(ManualControl);
// Permissions defined in roleConfig: ['admin', 'petugas']

// src/pages/diagnostic/index.tsx
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function Diagnostic() {
  return <div>Diagnostic</div>;
}

export default withRoleProtection(Diagnostic);
// Permissions defined in roleConfig: ['admin', 'petugas']

// src/pages/log-read/index.tsx
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function LogRead() {
  return <div>Log Read</div>;
}

export default withRoleProtection(LogRead);
// Permissions defined in roleConfig: ['admin', 'petugas', 'user']

// src/pages/notifications/index.tsx
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function Notifications() {
  return <div>Notifications</div>;
}

export default withRoleProtection(Notifications);
// Permissions defined in roleConfig: ['admin', 'petugas', 'user']
```

## 📊 Role-Based Access Matrix

| Feature            | Admin | Petugas | User |
| ------------------ | ----- | ------- | ---- |
| Dashboard          | ✅    | ✅      | ✅   |
| Kontrol Otomatis   | ✅    | ✅      | ❌   |
| Kontrol Manual     | ✅    | ✅      | ❌   |
| Diagnostik         | ✅    | ✅      | ❌   |
| Log Read           | ✅    | ✅      | ✅   |
| Notifikasi         | ✅    | ✅      | ✅   |
| Manajemen Pengguna | ✅    | ❌      | ❌   |

## 🛠️ Common Tasks

### Change a User's Role

1. Go to Admin Panel
2. Find the user in the list
3. Click the dropdown in "Ubah Peran" column
4. Select new role
5. Change is saved automatically

### Demote an Admin

- Open Admin Panel
- Find the admin user
- Change their role to "petugas" or "user"
- The change takes effect immediately

### Promote a User to Admin

- Open Admin Panel
- Find the user
- Change their role to "admin"
- They'll see "Manajemen Pengguna" after next login/refresh

### Reset User to Default Role

- Open Admin Panel
- Find the user
- Change their role to "user"
- They'll lose access to advanced features after refresh

## 🧪 Testing Checklist

- [ ] Admin can access user management page
- [ ] Admin can see list of all users
- [ ] Admin can change user roles
- [ ] Role changes take effect immediately
- [ ] Non-admin cannot access user management
- [ ] Non-admin redirected to dashboard when accessing `/admin/user-management`
- [ ] Each role has correct page access
- [ ] Admin cannot demote self manually via API validation

## 🔧 Monitoring and Debugging

### Check User Role in Console

Open browser Developer Tools (F12) → Console:

```javascript
// Check current user role
const auth = window.__NEXT_DATA__;
console.log("Auth data:", auth);
```

### Firebase Firestore Verification

1. Go to Firebase Console → Firestore
2. Check `users` collection
3. Look for user document
4. Verify `role` field has correct value

### Check API Response

In browser Network tab:

1. Go to User Management page
2. Look for `/api/admin/users` request
3. Check response payload
4. Verify it returns success and user list

## 📝 Troubleshooting

### "Access Denied" Message

**Cause**: User role not set to admin
**Solution**:

1. Go to Firestore
2. Update user role to "admin"
3. Refresh page

### Admin menu not showing after role change

**Cause**: Login token not refreshed
**Solution**:

1. Log out completely
2. Log back in
3. Menu should now appear

### API returns 403 error

**Cause**: Token validation failed
**Solution**:

1. Ensure you're logged in as admin
2. Try logging out and back in
3. Check browser console for errors

## 📚 Additional Resources

- [Complete RBAC Guide](./RBAC_GUIDE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Role Configuration](src/lib/roleConfig.ts)
- [User Management Page](src/pages/admin/user-management.tsx)
