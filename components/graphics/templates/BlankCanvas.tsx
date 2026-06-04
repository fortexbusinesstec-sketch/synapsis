import { ReactNode } from "react";

interface BlankCanvasProps {
  children?: ReactNode;
  grid?: boolean;
  title?: string;
  subtitle?: string;
}

export default function BlankCanvas({
  children,
  grid = true,
  title = "Title",
  subtitle = "Subtitle",
}: BlankCanvasProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#ffffff",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {grid && (
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", opacity: 0.15 }}
        >
          <defs>
            <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      <div
        style={{
          position: "absolute",
          top: 24,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: "#1e293b",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          {subtitle}
        </p>
      </div>

      {children}
    </div>
  );
}
