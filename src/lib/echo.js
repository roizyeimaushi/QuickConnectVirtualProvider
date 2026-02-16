'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally (required by Laravel Echo)
if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
}

let echoInstance = null;

/**
 * Initialize Laravel Echo with Reverb configuration
 * @param {string} token - Bearer token for authentication
 * @returns {Echo} - Laravel Echo instance
 */
export function initializeEcho(token, forceNew = false) {
    if (typeof window === 'undefined') {
        return null;
    }

    // Return existing instance if already initialized (unless forceNew is requested)
    if (echoInstance && !forceNew) {
        return echoInstance;
    }

    // Disconnect existing instance before creating a new one
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // Automatically derive reverb host from API URL if not provided
    let defaultHost = 'localhost';
    if (apiUrl && (apiUrl.includes('onrender.com') || apiUrl.includes('railway.app'))) {
        defaultHost = apiUrl.replace('https://', '').replace('http://', '').split('/')[0];
    }

    let reverbHost = process.env.NEXT_PUBLIC_REVERB_HOST || defaultHost;
    
    // Sanitize host: remove protocols and trailing slashes
    reverbHost = reverbHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/$/, '');

    // Auto-configure for Production (Railway/Render)
    const isProduction = reverbHost.includes('railway.app') || reverbHost.includes('onrender.com');
    
    const reverbPort = process.env.NEXT_PUBLIC_REVERB_PORT || (isProduction ? '443' : '8080');
    const reverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || (isProduction ? 'https' : 'http');
    const reverbKey = process.env.NEXT_PUBLIC_REVERB_KEY || 'y8f9rilu0kvciolzehfx';

    try {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: reverbHost,
            wsPort: parseInt(reverbPort),
            wssPort: parseInt(reverbPort),
            forceTLS: reverbScheme === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: `${apiUrl}/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            },
            // Reconnection settings
            enableLogging: process.env.NODE_ENV === 'development',
        });

        console.log('[Echo] Laravel Echo initialized with Reverb');
        return echoInstance;
    } catch (error) {
        console.error('[Echo] Failed to initialize:', error);
        return null;
    }
}

/**
 * Get the current Echo instance
 * @returns {Echo|null}
 */
export function getEcho() {
    return echoInstance;
}

/**
 * Disconnect and cleanup Echo instance
 */
export function disconnectEcho() {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
        console.log('[Echo] Disconnected');
    }
}

/**
 * Subscribe to a public channel
 * @param {string} channelName 
 * @returns {Channel}
 */
export function subscribeToChannel(channelName) {
    if (!echoInstance) {
        console.warn('[Echo] Not initialized');
        return null;
    }
    return echoInstance.channel(channelName);
}

/**
 * Subscribe to a private channel (requires auth)
 * @param {string} channelName 
 * @returns {Channel}
 */
export function subscribeToPrivateChannel(channelName) {
    if (!echoInstance) {
        console.warn('[Echo] Not initialized');
        return null;
    }
    return echoInstance.private(channelName);
}

/**
 * Leave a channel
 * @param {string} channelName 
 */
export function leaveChannel(channelName) {
    if (echoInstance) {
        echoInstance.leave(channelName);
    }
}

const echoUtils = {
    initializeEcho,
    getEcho,
    disconnectEcho,
    subscribeToChannel,
    subscribeToPrivateChannel,
    leaveChannel,
};

export default echoUtils;
