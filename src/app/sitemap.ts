import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fenua-chords.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: songs }, { data: artists }] = await Promise.all([
    supabase.from("songs").select("slug, created_at").eq("status", "published"),
    supabase.from("artists").select("slug, created_at"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/chansons`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/artistes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  const songRoutes: MetadataRoute.Sitemap = (songs ?? []).map((song) => ({
    url: `${BASE_URL}/chansons/${song.slug}`,
    lastModified: new Date(song.created_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const artistRoutes: MetadataRoute.Sitemap = (artists ?? []).map((artist) => ({
    url: `${BASE_URL}/artistes/${artist.slug}`,
    lastModified: new Date(artist.created_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...songRoutes, ...artistRoutes];
}
