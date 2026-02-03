<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Default Laravel user channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Private user channel - for user-specific updates (attendance, breaks, notifications)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Admin dashboard channel - only admins can subscribe
Broadcast::channel('admin.dashboard', function ($user) {
    return $user->role === 'admin';
});

// Admin employees channel - only admins can subscribe
Broadcast::channel('admin.employees', function ($user) {
    return $user->role === 'admin';
});

// Public attendance channel - all authenticated users can listen
// (for real-time stats and updates visible to everyone)
Broadcast::channel('attendance', function ($user) {
    return $user !== null;
});

// Public sessions channel - all authenticated users can listen
Broadcast::channel('sessions', function ($user) {
    return $user !== null;
});
