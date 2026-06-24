import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attendance Control",
    short_name: "Attendance",
    description: "PIN-based attendance clock-in/out system",
    start_url: "/",
    display: "standalone",
    scope: "/",
    background_color: "#ffffff",
    theme_color: "#6d28d9",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
