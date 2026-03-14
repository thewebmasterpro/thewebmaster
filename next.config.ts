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
  // HSTS - Force HTTPS
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://analytics.hagendigital.com https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://analytics.hagendigital.com https://www.google.com",
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // Cross-Origin-Opener-Policy
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  // Cross-Origin-Resource-Policy
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  // Cross-Origin-Embedder-Policy
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
];

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,

  // Security + caching headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Long-term cache for static assets (Next.js hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache images
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Cache static files (favicon, etc.)
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
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
