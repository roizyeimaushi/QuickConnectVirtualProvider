# Real-Time Implementation Guide

## Overview

This document describes the real-time data synchronization implementation for the AttendanceSheetSystem using **Laravel Reverb** (WebSocket server) and **Laravel Echo** (frontend client).

## Architecture

```
┌───────────────┐     WebSocket     ┌──────────────┐     Broadcast     ┌─────────────┐
│   Browser     │ ◄───────────────► │ Laravel      │ ◄───────────────► │  Laravel    │
│ (Laravel Echo)│   (Port 8080)     │   Reverb     │       Events      │  Backend    │
└───────────────┘                   └──────────────┘                   └─────────────┘
```

## Components

### Backend (Laravel)

1. **Laravel Reverb** - WebSocket server
   - Package: `laravel/reverb`
   - Config: `config/reverb.php`
   - Port: 8080 (development), configurable for production

2. **Broadcast Events** - Located in `app/Events/`
   - `AttendanceUpdated` - Fired on time-in, time-out
   - `BreakUpdated` - Fired on break start/end
   - `SessionUpdated` - Fired on session create/update/lock/unlock
   - `DashboardStatsUpdated` - For admin dashboard updates
   - `EmployeeUpdated` - For employee list changes
   - `NotificationCreated` - For instant notifications

3. **Channels** - Defined in `routes/channels.php`
   - `attendance` - Public channel for attendance updates
   - `sessions` - Public channel for session updates
   - `user.{id}` - Private channel for user-specific updates
   - `admin.dashboard` - Private channel for admin stats
   - `admin.employees` - Private channel for employee management

### Frontend (Next.js/React)

1. **Laravel Echo Client** - `src/lib/echo.js`
   - Configures connection to Reverb WebSocket server
   - Handles authentication for private channels

2. **RealTimeProvider** - `src/components/providers/realtime-provider.jsx`
   - Context provider managing WebSocket subscriptions
   - Integrates with SWR for automatic cache invalidation
   - Handles channel subscriptions based on user role

3. **ConnectionStatus** - `src/components/ui/connection-status.jsx`
   - Visual indicator showing WebSocket connection status
   - Click to manually refresh all data

## Running Locally

### 1. Start the Backend API
```bash
cd backend/quickcon-api
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Start Laravel Reverb (WebSocket Server)
```bash
cd backend/quickcon-api
php artisan reverb:start --host=0.0.0.0 --port=8080
```

### 3. Start the Frontend
```bash
npm run dev
```

## Environment Variables

### Backend (.env)
```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=sync

REVERB_APP_ID=691335
REVERB_APP_KEY=y8f9rilu0kvciolzehfx
REVERB_APP_SECRET=f5bn0dqbfswkppdw8amg
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REVERB_KEY=y8f9rilu0kvciolzehfx
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

## How It Works

### Event Flow

1. **User Action** (e.g., Time-In)
   - Controller processes the request
   - Creates/updates database record
   - Dispatches broadcast event: `event(new AttendanceUpdated($record, 'confirmed'))`

2. **Reverb Broadcasting**
   - Reverb receives the event
   - Broadcasts to subscribed WebSocket clients
   - Sends to both public and private channels

3. **Frontend Reception**
   - Laravel Echo receives the event
   - RealTimeProvider handles the event
   - SWR cache is invalidated with `mutate()`
   - UI automatically re-renders with fresh data

### Channel Authentication

Private channels require authentication:
- Frontend sends auth request to `/broadcasting/auth`
- Backend validates user token and role
- Returns auth signature for WebSocket subscription

## Deployment (Render)

For production deployment on Render:

1. **Update Environment Variables**
   ```env
   REVERB_HOST=your-app.onrender.com
   REVERB_PORT=443
   REVERB_SCHEME=https
   ```

2. **Configure Reverb for Production**
   - Use SSL termination at load balancer
   - Configure allowed origins in `config/reverb.php`

3. **Start Reverb as Background Process**
   - Add to `Dockerfile.monolith` or run as separate service
   - Consider using Supervisor for process management

## Polling Fallback

Even with WebSocket real-time updates, the system maintains fallback polling:

| Data Type | WebSocket | Polling Fallback |
|-----------|-----------|------------------|
| Attendance | Primary | 30 seconds |
| Dashboard | Primary | 60 seconds |
| Lists/Reports | Primary | 120 seconds |

This ensures data stays synchronized even if WebSocket connection drops.

## Troubleshooting

### WebSocket Not Connecting
1. Check Reverb is running: `php artisan reverb:start`
2. Verify environment variables match between backend and frontend
3. Check browser console for connection errors
4. Verify CORS configuration allows WebSocket connections

### Events Not Broadcasting
1. Verify `BROADCAST_CONNECTION=reverb` in `.env`
2. Check `QUEUE_CONNECTION=sync` for immediate dispatching
3. Look for errors in Laravel logs: `storage/logs/laravel.log`
4. Verify event classes implement `ShouldBroadcast`

### Private Channels Not Authorizing
1. Check broadcast routes are registered: `Broadcast::routes()`
2. Verify channel authorization in `routes/channels.php`
3. Ensure token is being sent in auth request headers
4. Check Sanctum middleware is applied to broadcast routes

## Files Modified/Created

### Backend
- `composer.json` - Added laravel/reverb
- `config/broadcasting.php` - Broadcasting configuration
- `config/reverb.php` - Reverb configuration
- `routes/api.php` - Added broadcast routes
- `routes/channels.php` - Channel authorization
- `app/Events/` - All broadcast event classes
- `app/Http/Controllers/AttendanceRecordController.php` - Event dispatching
- `app/Http/Controllers/AttendanceSessionController.php` - Event dispatching
- `.env` - Updated broadcast connection

### Frontend
- `package.json` - Added laravel-echo, pusher-js
- `src/lib/echo.js` - Echo client configuration
- `src/components/providers/realtime-provider.jsx` - Real-time context
- `src/components/ui/connection-status.jsx` - Connection indicator
- `src/app/layout.jsx` - Added RealTimeProvider
- `src/lib/swr-hooks.js` - Updated polling intervals
- `src/app/dashboard/admin/page.jsx` - Updated polling
- `.env.local` - Reverb configuration
