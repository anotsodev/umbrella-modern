// Apple touch icon. Renders the umbrella glyph at 180×180 on a
// rounded zinc-900 square so it reads well on a home-screen tile
// against either a light or dark wallpaper. Served at
// /apple-icon by Next.js App Router conventions.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#18181b",
          borderRadius: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="120"
          height="120"
          fill="none"
          stroke="#fafafa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M28 16a11 11 0 0 0-22 0" />
          <path d="M6 16h20" />
          <path d="M16 6V8" />
          <path d="m23 9-1 1" />
          <path d="m9 9 1 1" />
          <path d="M16 16v11" />
          <path d="M12 24a4 4 0 0 0 8 0" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
