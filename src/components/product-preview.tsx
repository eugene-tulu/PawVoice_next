// src/components/product-preview.tsx
import { Badge } from "./ui";

const ACTIVITIES = [
  { type: "Walk", pet: "Buster", time: "4:12 PM", note: "30 min loop around the park, very energetic today.", dot: "bg-accent" },
  { type: "Medication", pet: "Whiskers", time: "11:02 AM", note: "Morning dose given with food.", dot: "bg-emerald-500" },
  { type: "Feeding", pet: "Mochi", time: "8:30 AM", note: "1/2 cup kibble, drank well.", dot: "bg-sky-500" },
];

export function ProductPreview() {
  return (
    <div className="relative">
      <div className="card-raise overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-rule px-4 py-3 bg-paper-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="ml-3 font-mono text-xs text-muted">pawvoice.xyz — Buster</span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-xl font-semibold text-ink leading-none">Buster</p>
              <p className="text-xs text-muted mt-1">Dog · Labrador · 4 years</p>
            </div>
            <Badge tone="accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
            </Badge>
          </div>

          <div className="space-y-2.5">
            {ACTIVITIES.map((a) => (
              <div
                key={a.type}
                className="flex items-start gap-3 rounded-xl border border-rule bg-paper px-3.5 py-3"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{a.type}</p>
                    <span className="font-mono text-xs text-muted shrink-0">{a.time}</span>
                  </div>
                  <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{a.note}</p>
                  <p className="text-[10px] text-muted mt-1">for {a.pet}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent-soft px-3.5 py-3">
            <span className="text-lg" aria-hidden>🎙️</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-accent">Call logged</p>
              <p className="text-[11px] text-muted">“Buster had a 30-minute walk and seemed energetic”</p>
            </div>
            <span className="font-mono text-xs text-accent">0.50 min</span>
          </div>
        </div>
      </div>

      {/* floating credit chip */}
      <div className="absolute -bottom-4 -left-4 card-raise hidden sm:flex items-center gap-2 px-3.5 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-paper text-xs font-semibold">
          $
        </span>
        <div>
          <p className="text-xs font-medium text-ink leading-none">Balance</p>
          <p className="font-mono text-xs text-muted mt-0.5">$24.30 left</p>
        </div>
      </div>
    </div>
  );
}
