import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-rule mt-16">
      <div className="container-x py-12 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Link
            href="/"
            className="font-display text-lg font-black tracking-tight text-ink"
          >
            Paw<span className="text-accent">Voice</span>
          </Link>
          <p className="text-xs text-muted mt-3 leading-relaxed">
            A voice-first activity log for pet sitters and owners. Records what
            happened, in your words.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 text-xs">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Product</span>
            <Link href="/#pricing" className="text-muted hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link href="/register" className="text-muted hover:text-ink transition-colors">
              Get started
            </Link>
            <Link href="/login" className="text-muted hover:text-ink transition-colors">
              Sign in
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Legal</span>
            <Link href="/privacy-policy.md" className="text-muted hover:text-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-use.md" className="text-muted hover:text-ink transition-colors">
              Terms of Use
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Contact</span>
            <a href="mailto:gntulu@gmail.com" className="text-muted hover:text-ink transition-colors">
              gntulu@gmail.com
            </a>
          </div>
        </div>
      </div>
      <div className="container-x pb-8 text-xs text-muted">
        <p>© {new Date().getFullYear()} PawVoice. Activity log, not medical advice.</p>
      </div>
    </footer>
  );
}
