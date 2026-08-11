import { promises as fs } from "fs";
import path from "path";
import { renderMarkdown } from "@/lib/markdown";
import { SiteNav } from "@/components/site-nav";
import { Eyebrow } from "@/components/ui";

export const metadata = {
  title: "Terms of Use",
  description: "The agreement between you and PawVoice when you use the Service.",
};

export default async function TermsPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content/terms-of-use.md"),
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
