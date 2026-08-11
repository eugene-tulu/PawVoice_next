import { ImageResponse } from "next/og";

export const alt = "PawVoice — Your pet's day, in your words.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fdfff0",
          padding: "72px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#c53a15",
            }}
          />
          <span style={{ fontSize: 34, fontWeight: 700, color: "#1d1a13" }}>
            Paw<span style={{ color: "#c53a15" }}>Voice</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 70,
              fontWeight: 700,
              color: "#1d1a13",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Your pet&apos;s day,
          </span>
          <span
            style={{
              fontSize: 70,
              fontWeight: 700,
              color: "#c53a15",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            in your words.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#5a5246",
            maxWidth: 880,
          }}
        >
          Call to log walks, meds, and meals by voice. No apps, no typing —
          just speak.
        </div>
      </div>
    ),
    size,
  );
}
