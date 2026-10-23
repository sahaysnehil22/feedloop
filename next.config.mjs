/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // The embed loader must be fetchable from any site.
        source: "/loader.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        // The widget iframe is embedded cross-origin.
        source: "/w",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
