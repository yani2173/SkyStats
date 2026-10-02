/**
 * Minimalist, modern SkyStats logo.
 * 2.5D faceted ascending delta aircraft with directional lighting (like 3D but flat vector).
 */
export function SkyStatsMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SkyStats Logo"
    >
      <defs>
        {/* Left Wing: Lit Facet (Highlight side) */}
        <linearGradient id="as-wing-lit" x1="10" y1="6" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#56b8fc" />
          <stop offset="100%" stopColor="#2f94f2" />
        </linearGradient>

        {/* Right Wing: Shadow Facet (Dimensional depth side) */}
        <linearGradient id="as-wing-shadow" x1="16" y1="6" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2580ec" />
          <stop offset="100%" stopColor="#1a64ca" />
        </linearGradient>
      </defs>

      {/* Dark Rounded Container Squircle */}
      <rect width="32" height="32" rx="8" fill="#18181b" stroke="#27272a" strokeWidth="1" />

      {/* Left Wing (Light / Highlight Facet) */}
      <path
        d="M 16 6.5
           L 15.3 7.2
           L 7.5 22.2
           C 7.2 22.8 7.7 23.5 8.4 23.3
           L 15 21.2
           L 15.4 25.2
           C 15.5 25.5 15.7 25.7 16 25.7
           L 16 6.5 Z"
        fill="url(#as-wing-lit)"
      />

      {/* Right Wing (Shadow / Depth Facet) */}
      <path
        d="M 16 6.5
           L 16 25.7
           C 16.3 25.7 16.5 25.5 16.6 25.2
           L 17 21.2
           L 23.6 23.3
           C 24.3 23.5 24.8 22.8 24.5 22.2
           L 16.7 7.2
           L 16 6.5 Z"
        fill="url(#as-wing-shadow)"
      />

      {/* Subtle Center Ridge Highlight Line */}
      <line
        x1="16"
        y1="6.5"
        x2="16"
        y2="21.2"
        stroke="#ffffff"
        strokeWidth="0.4"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

export function SkyStatsLogo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className} select-none`}>
      <SkyStatsMark size={size} />
      <span className="font-semibold text-sm tracking-tight text-zinc-100">
        SkyStats
      </span>
    </div>
  );
}
