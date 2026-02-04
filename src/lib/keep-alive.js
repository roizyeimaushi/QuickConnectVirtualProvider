// Keep-Alive Utility for Render.com Free Tier
// Pings the backend health endpoint every 10 minutes to prevent cold starts

import { API_BASE_URL } from './constants';

let keepAliveInterval = null;
let isKeepAliveActive = false;

/**
 * Ping the health endpoint
 * Returns true if successful, false otherwise
 */
export const pingHealth = async () => {
    try {
        // Remove /api from the base URL to get the health endpoint
        const baseUrl = API_BASE_URL.replace('/api', '');
        const response = await fetch(`${baseUrl}/api/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            console.debug('[Keep-Alive] Server is awake');
            return true;
        }
        return false;
    } catch (error) {
        // Silent fail - this is just a keep-alive ping
        console.debug('[Keep-Alive] Ping failed:', error.message);
        return false;
    }
};

/**
 * Start the keep-alive interval
 * Pings the server every 10 minutes (600000ms)
 */
export const startKeepAlive = () => {
    if (isKeepAliveActive) {
        console.debug('[Keep-Alive] Already active');
        return;
    }

    // Only run in browser
    if (typeof window === 'undefined') return;

    // Initial ping
    pingHealth();

    // Set up interval (10 minutes = 600000ms)
    keepAliveInterval = setInterval(() => {
        pingHealth();
    }, 600000); // 10 minutes

    isKeepAliveActive = true;
    console.debug('[Keep-Alive] Started - pinging every 10 minutes');
};

/**
 * Stop the keep-alive interval
 */
export const stopKeepAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
    isKeepAliveActive = false;
    console.debug('[Keep-Alive] Stopped');
};

/**
 * Check if keep-alive is active
 */
export const isKeepAliveRunning = () => isKeepAliveActive;

export default {
    pingHealth,
    startKeepAlive,
    stopKeepAlive,
    isKeepAliveRunning,
};
