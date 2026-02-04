const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Note: 'standalone' removed for Vercel - only needed for Docker
    // Next.js 16+ doesn't support eslint/typescript config here
    // Use CLI flags instead: next lint --quiet
};

// module.exports = withPWA(nextConfig);
module.exports = nextConfig;
