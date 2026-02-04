const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // turbopack: {},
    // Note: 'standalone' removed for Vercel - only needed for Docker
    typescript: {
        // Allow builds to complete in development only
        ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },
    eslint: {
        // Allow builds in development only
        ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
};

// module.exports = withPWA(nextConfig);
module.exports = nextConfig;
