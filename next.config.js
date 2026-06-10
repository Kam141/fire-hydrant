/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com'
    ],
    // Allow local images stored in `public/profiles/*`, including query strings
    localPatterns: [
      {
        pathname: '/profiles/:path*',
      },
      // Allow specific root-level static images like /logo.png
      {
        pathname: '/logo.png',
      },
    ],
  },
}

module.exports = nextConfig
