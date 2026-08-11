// Central site configuration — single source of truth for branding/SEO.
export const SITE_NAME = "PawVoice";
export const TAGLINE = "Your pet's day, in your words.";
export const DESCRIPTION =
  "Call PawVoice to log walks, meds, and meals for your pet by voice. No apps, no typing — just speak, and each entry lands in a shared activity log for sitters and owners.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://pawvoice.xyz";
export const CONTACT_EMAIL = "gntulu@gmail.com";
