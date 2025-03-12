/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*', // Redirect all /api/ calls
                destination: 'http://127.0.0.1:5000/:path*', // Forward them to Flask backend
            }
        ]
    }
};

export default nextConfig;
