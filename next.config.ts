import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// =============================================================================
// SECURITY HEADERS
// https://securityheaders.com for testing
// =============================================================================

const securityHeaders = [
  // Prevents clickjacking attacks
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevents MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Controls DNS prefetching
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Controls referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions Policy (formerly Feature-Policy)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS - Force HTTPS (uncomment in production with HTTPS)
  // {
  //   key: "Strict-Transport-Security",
  //   value: "max-age=31536000; includeSubDomains; preload",
  // },
  // Content Security Policy (customize based on your needs)
  // {
  //   key: "Content-Security-Policy",
  //   value: `
  //     default-src 'self';
  //     script-src 'self' 'unsafe-eval' 'unsafe-inline';
  //     style-src 'self' 'unsafe-inline';
  //     img-src 'self' data: https:;
  //     font-src 'self';
  //     connect-src 'self' https:;
  //     frame-ancestors 'none';
  //   `.replace(/\n/g, ""),
  // },
];

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      // Add allowed image domains here
      // {
      //   protocol: "https",
      //   hostname: "images.unsplash.com",
      // },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Recommended: strict mode for better error catching
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable React compiler when stable
    // reactCompiler: true,
  },
};

// MDX configuration
const withMDX = createMDX({
  // Add MDX plugins here if needed
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

// Merge MDX config with Next.js config
export default withMDX({
  ...nextConfig,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
});
