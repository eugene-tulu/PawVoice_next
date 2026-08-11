import { promises as fs } from "fs";
import path from "path";
import { renderMarkdown } from "@/lib/markdown";
import { SiteNav } from "@/components/site-nav";
import { Eyebrow } from "@/components/ui";

export const metadata = {
  title: "Privacy Policy",
  description: "How PawVoice collects, uses, and protects your information.",
};

export default async function PrivacyPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content/privacy-policy.md"),
    "utf8",
  );
  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />
      <main className="container-x py-16 max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <article className="mt-4">{renderMarkdown(md)}</article>
      </main>
    </div>
  );
}
