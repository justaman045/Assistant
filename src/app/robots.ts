import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/(protected)/"] },
    sitemap: "https://personal-dashboard.app/sitemap.xml",
  };
}
