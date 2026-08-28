import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Django media (avatars/covers/logos/portfolio uploads), served from
      // MEDIA_URL — an absolute https://<DOMAIN>/media/ URL in production
      // (see config/settings/base.py) and a relative /media/ path in local
      // dev, which next/image resolves against localhost/127.0.0.1.
      { protocol: "https", hostname: "trugc.com.tr" },
      { protocol: "https", hostname: "www.trugc.com.tr" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

export default nextConfig;
