import type { MetadataRoute } from "next";
import { site } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.domain, changeFrequency: "daily", priority: 1 }];
}
