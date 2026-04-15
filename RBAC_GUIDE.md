# Role-Based Access Control System

This document explains the new role-based access control (RBAC) system implemented in the Fire Hydrant system.

## Overview

The system has been enhanced with three user roles:

- **Admin**: Full access to all features including user management
- **Petugas**: Access to control, diagnostics, and monitoring features
- **User**: Limited access to view status and logs

## System Architecture

### 1. User Roles and Permissions

Each user has a role stored in Firestore that determines which features they can access.

#### Admin

- Manage user accounts and roles
- Access all control and monitoring features
- View diagnostic information
- Full system configuration access

#### Petugas

- Control hydrant systems (auto/manual modes)
- View diagnostics
- Monitor system status
- Read logs

#### User

- View system status and dashboard
- Read logs
- View notifications
- Limited visibility only

### 2. Files Added/Modified

#### New Files:

- `src/components/hoc/withRoleProtection.tsx` - HOC for page protection
- `src/lib/roleConfig.ts` - Role configuration and utilities
- `src/pages/api/admin/users.ts` - API endpoints for user management
- `src/pages/admin/user-management.tsx` - Admin user management page
- `src/pages/admin/user-management.module.css` - Styling

#### Modified Files:

- `src/types/system.ts` - Added UserRole and UserProfile types
- `src/lib/firebaseConfig.ts` - Added role management functions
- `src/context/AuthContext.tsx` - Extended to fetch and expose user role
- `src/components/layout/sidebar/index.tsx` - Added admin menu item

## How to Use

### 1. Protect Pages with Role-Based Access

Use the `withRoleProtection` HOC to prevent unauthorized access to pages. Route permissions are automatically read from `roleConfig.ts`:

```typescript
import { withRoleProtection } from '@/components/hoc/withRoleProtection';

function AdminPage() {
  return <div>Admin Content</div>;
}

export default withRoleProtection(AdminPage);
```

**How it works:**

1. The HOC automatically detects the current route pathname
2. It looks up the route in `ROLE_BASED_ROUTES` defined in `roleConfig.ts`
3. It compares the user's role against the allowed roles for that route
4. Redirects to dashboard if access is denied

**To configure which roles can access a route**, edit `src/lib/roleConfig.ts`:

```typescript
export const ROLE_BASED_ROUTES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "petugas", "user"],
  "/admin/user-management": ["admin"],
  "/auto-control": ["admin", "petugas"],
  "/manual-control": ["admin", "petugas"],
  // Add more routes as needed
};
```

For routes not defined in `ROLE_BASED_ROUTES`, all authenticated users are allowed.

### 2. Check User Role in Components

Use the `useAuth` hook to get the current user's role:

```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { role, user } = useAuth();

  if (role === 'admin') {
    return <AdminPanel />;
  }

  if (role === 'petugas') {
    return <PetugasPanel />;
  }

  return <UserPanel />;
}
```

### 3. Check Role Before Rendering Elements

```typescript
import { useAuth } from '@/context/AuthContext';

function ConditionalFeature() {
  const { role } = useAuth();

  return (
    <div>
      {role === 'admin' && <AdminButton />}
      {(role === 'admin' || role === 'petugas') && <ControlPanel />}
    </div>
  );
}
```

## Admin Panel Features

### Access User Management

1. Navigate to **Manajemen Pengguna** in the sidebar (admin only)
2. View all registered users
3. See current role of each user
4. Change user roles using the dropdown

### Setting User Roles

- Click the dropdown next to a user's current role
- Select the new role (admin, petugas, user)
- The change is saved immediately

## API Endpoints

### GET /api/admin/users

Retrieves all users with their profiles. Admin only.

**Headers:**

```
Authorization: Bearer {idToken}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "uid": "user-id",
      "email": "user@example.com",
      "displayName": "User Name",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/admin/users

Updates a user's role. Admin only.

**Headers:**

```
Authorization: Bearer {idToken}
Content-Type: application/json
```

**Body:**

```json
{
  "userId": "user-id-to-update",
  "newRole": "petugas"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "uid": "user-id",
    "email": "user@example.com",
    "role": "petugas"
  }
}
```

## Database Schema

Users are stored in Firestore under the `users` collection with this structure:

```typescript
{
  uid: string; // Firebase UID
  email: string; // User email
  displayName: string; // User's display name
  photoURL: string; // Profile photo URL
  role: "admin" | "petugas" | "user"; // User role
  createdAt: Timestamp; // Account creation date
  provider: string; // Auth provider (email, google, etc)
}
```

## Setting Up Initial Admin User

To set up the first admin user:

1. Register a user account normally
2. Go to Firestore Console
3. Navigate to `users` collection
4. Find the user document (uid as document ID)
5. Edit the `role` field and change it to `admin`
6. Save changes

Or use the Firebase CLI to set up admin users programmatically.

## Utility Functions

### useAuth Hook

```typescript
const { user, role, loading, signOut } = useAuth();
```

### Role Helpers (from roleConfig.ts)

#### canAccessRoute()

```typescript
import { canAccessRoute } from "@/lib/roleConfig";

const hasAccess = canAccessRoute("admin", "/admin/user-management");
```

#### getRoleDisplayName()

```typescript
import { getRoleDisplayName } from "@/lib/roleConfig";

console.log(getRoleDisplayName("petugas")); // "Petugas"
```

#### getRoleDescription()

```typescript
import { getRoleDescription } from "@/lib/roleConfig";

const desc = getRoleDescription("admin");
// "Akses penuh ke semua fitur..."
```

## Security Considerations

1. **API Protection**: All admin APIs verify the user's role on the backend
2. **Client-side Protection**: Pages are protected with HOC redirects
3. **Token Verification**: Firebase ID tokens are verified for API calls
4. **Data Privacy**: Users can only see their own data except admins

## Troubleshooting

### User can't access admin page

- Verify the user's role is set to `admin` in Firestore
- Check browser console for authentication errors
- Ensure the user is logged in

### Role changes not taking effect

- Refresh the page after role change
- Clear browser cache
- Check Firestore console to verify the change was saved

### API returns 403 error

- Ensure user is authenticated (has valid token)
- Verify user role is `admin` or `petugas` as needed
- Check the API endpoint permissions

## Future Enhancements

Potential improvements to the RBAC system:

- Permission-based access (separate from roles)
- User groups and batch permission management
- Audit logs for role changes
- Custom role creation
- Deprecation warnings for old role system
