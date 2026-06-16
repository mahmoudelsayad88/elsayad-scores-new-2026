"use client";

import { useState } from "react";

export default function TeamLogo({
  src,
  alt,
  size = 40,
  color,
  fallbackText,
}: {
  src: string;
  alt: string;
  size?: number;
  color?: string;
  fallbackText?: string;
}) {
  const [err, setErr] = useState(false);
  const initials =
    fallbackText ??
    alt
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("");

  if (err) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
        style={{
          width: size,
          height: size,
          background: color
            ? `linear-gradient(135deg, ${color}, #0a0e1a)`
            : "linear-gradient(135deg,#1a2138,#0a0e1a)",
          fontSize: size * 0.36,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
