"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#fdfff0",
          color: "#1d1a13",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            PawVoice ran into a problem.
          </h1>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
            Please reload the page to continue.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              background: "#c53a15",
              color: "#fdfff0",
              border: 0,
              borderRadius: 9999,
              padding: "0.6rem 1.25rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
