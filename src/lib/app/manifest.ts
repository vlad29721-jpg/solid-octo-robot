import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D&D Master Hub",
    short_name: "Master Hub",
    description: "Листы персонажей, боевая карта, инициатива и кубики для вашей партии.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "ru",
    icons: [
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
