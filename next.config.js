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
    async rewrites() {
        return [
            {
                source: "/storage/:path*",
                destination: "http://127.0.0.1:8000/storage/:path*",
            },
            {
                source: "/api/:path*",
                destination: "http://127.0.0.1:8000/api/:path*",
            },
        ];
    },
};

// module.exports = withPWA(nextConfig);
module.exports = nextConfig;
