/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '60mb' }, // PDF-Kataloge bis 50 MB
  },
  images: {
    domains: ['v5.airtableusercontent.com', 'dl.airtable.com'],
  },
}

module.exports = nextConfig
