# Sensor Parameters Feature

## Overview

The Sensor Parameters page allows **Petugas (Technicians)** and **Admin** users to set threshold values for all system sensors. These parameters are stored in Firestore and can be used by the control system to determine when to trigger alerts or activate automatic responses.

## What Was Added

### Files Created

- `src/pages/parameters/index.tsx` - Parameters management page
- `src/pages/parameters/parameters.module.css` - Styling for parameters page
- `src/pages/api/parameters.ts` - API endpoint for getting/setting parameters

### Files Modified

- `src/types/system.ts` - Added `SensorParameters` interface
- `src/lib/firebaseConfig.ts` - Added parameter read/write functions
- `src/lib/roleConfig.ts` - Added `/parameters` route with petugas/admin access
- `src/components/layout/sidebar/index.tsx` - Added "Parameter Sensor" menu item
- `src/components/layout/dashboard-frame/index.tsx` - Added 'parameters' to active types

## Features

### Parameter Types

1. **Temperature Threshold** (°C)
   - Range: 0-150°C
   - Default: 60°C
   - Used to determine if system is overheating

2. **Fire Percent Threshold** (%)
   - Range: 0-100%
   - Default: 30%
   - Percentage of fire detection to trigger alert

3. **Pressure Threshold** (bar)
   - Range: 0-50 bar
   - Default: 5 bar
   - Minimum system pressure required for operation

4. **Flow Rate Threshold** (LPM)
   - Range: 0-1000 LPM
   - Default: 10 LPM
   - Minimum water flow rate to open valve

5. **Water Level Threshold** (%)
   - Range: 0-100%
   - Default: 20%
   - Minimum water level before alarm

### Access Control

- **Admin**: Full access to view, edit all system parameters
- **Petugas**: Can view and edit sensor parameters
- **User**: No access (redirected)

### Data Storage

Parameters are stored in Firestore under:

```
/parameters/sensors
{
  temperatureThreshold: number,
  firePercentThreshold: number,
  pressureThreshold: number,
  flowRateThreshold: number,
  waterLevelThreshold: number,
  updatedAt: timestamp,
  updatedBy: string (user ID)
}
```

## Usage

### Accessing the Parameters Page

1. Log in as **Admin** or **Petugas**
2. Look for **"Parameter Sensor"** in the sidebar menu
3. Click to open the parameters page

### Setting Parameters

1. Each parameter shows its current value
2. Enter new values for any parameter you want to change
3. Values are validated for valid ranges
4. Click **"Simpan Parameter"** to save changes

### Canceling Changes

1. Click **"Batalkan Perubahan"** to reset values to last saved state
2. This doesn't modify stored parameters, just resets the form

### Viewing History

The last update timestamp is shown at the bottom with who made the change (user ID).

## API Endpoints

### GET /api/parameters

Fetch current sensor parameters.

**Authentication**: Bearer token (required)  
**Authorization**: Petugas or Admin role

**Response:**

```json
{
  "success": true,
  "data": {
    "temperatureThreshold": 60,
    "firePercentThreshold": 30,
    "pressureThreshold": 5,
    "flowRateThreshold": 10,
    "waterLevelThreshold": 20,
    "updatedAt": "2024-01-15T10:30:00Z",
    "updatedBy": "user-uid-xxxxx"
  }
}
```

### POST /api/parameters

Update sensor parameters.

**Authentication**: Bearer token (required)  
**Authorization**: Petugas or Admin role

**Request Body:**

```json
{
  "temperatureThreshold": 60,
  "firePercentThreshold": 30,
  "pressureThreshold": 5,
  "flowRateThreshold": 10,
  "waterLevelThreshold": 20
}
```

**Response:**

```json
{
  "success": true,
  "message": "Parameter berhasil diperbarui",
  "data": {
    "temperatureThreshold": 60,
    "firePercentThreshold": 30,
    "pressureThreshold": 5,
    "flowRateThreshold": 10,
    "waterLevelThreshold": 20,
    "updatedAt": "2024-01-15T10:30:00Z",
    "updatedBy": "user-uid-xxxxx"
  }
}
```

## Firestore Security Rules

Add these rules to allow Petugas and Admin to access parameters:

```firestore rules
// Parameters collection - allow petugas and admin
match /parameters/{document=**} {
  allow read: if isAuthenticated() && (
    isAdmin(request.auth.uid) ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'petugas'
  );

  allow write: if isAuthenticated() && (
    isAdmin(request.auth.uid) ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'petugas'
  );
}
```

Update your `firestore.rules` file to include this rule and republish to Firebase.

## Default Values

If no parameters are set, the system uses default values:

- Temperature: 60°C
- Fire Percent: 30%
- Pressure: 5 bar
- Flow Rate: 10 LPM
- Water Level: 20%

## Validation

The system validates all input:

- **Temperature**: 0-150°C
- **Fire Percent**: 0-100%
- **Pressure**: 0-50 bar
- **Flow Rate**: 0-1000 LPM
- **Water Level**: 0-100%

Invalid values are rejected with an error message.

## Troubleshooting

### Cannot access parameters page

- Verify you're logged in as Admin or Petugas
- Check your role in Firestore users collection
- Clear browser cache and refresh

### "Forbidden" error (403)

- Your user role doesn't have permission
- Contact admin to upgrade your role to Petugas

### "Unauthorized" error (401)

- Your authentication token is expired
- Log out and log back in

### Changes not saving

- Check browser console for error details
- Verify your internet connection
- Try refreshing the page

## Future Enhancements

Potential improvements:

- Profile-based parameter sets (different configurations for different locations)
- Parameter history/audit log
- Export/import parameters
- Automatic parameter recommendations based on sensor data
- Alert when parameters need adjustment
- Bulk parameter updates

## Integration with Control System

The parameters are now available via Firestore at `/parameters/sensors`. The control system can:

1. Load parameters on startup:

   ```typescript
   const params = await getSensorParameters();
   ```

2. Use in automatic control logic:

   ```typescript
   if (sensorData.temperature > params.temperatureThreshold) {
     // Trigger alert
   }
   ```

3. Update via API:
   ```typescript
   await updateSensorParameters(newParams, userId);
   ```

## References

- [Sensor Parameters Type Definition](src/types/system.ts)
- [Firebase Functions](src/lib/firebaseConfig.ts)
- [Parameters Page](src/pages/parameters/index.tsx)
- [API Endpoint](src/pages/api/parameters.ts)
- [Role Configuration](src/lib/roleConfig.ts)
