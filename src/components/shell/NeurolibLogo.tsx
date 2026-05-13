import { cn } from "@/lib/utils";

/**
 * Brand mark — a book viewed from above with a small knowledge-graph on each
 * page. Uses the Daylight Study palette directly so it stays cohesive against
 * the cream background.
 */
export function NeurolibLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Neurolib"
      className={cn("size-5", className)}
    >
      <path
        d="M 8 18 Q 8 14 12 13 L 30 12 Q 32 12 32 14 L 32 51 Q 32 52 30 52 L 12 50 Q 9 50 9 47 Z"
        fill="#FFFDF7"
        stroke="#1F2933"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 56 18 Q 56 14 52 13 L 34 12 Q 32 12 32 14 L 32 51 Q 32 52 34 52 L 52 50 Q 55 50 55 47 Z"
        fill="#FFFDF7"
        stroke="#1F2933"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="32"
        y1="13"
        x2="32"
        y2="52"
        stroke="#1F2933"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <g stroke="#5C6470" strokeWidth="1.1" strokeLinecap="round">
        <line x1="14" y1="24" x2="22" y2="32" />
        <line x1="22" y1="32" x2="16" y2="42" />
        <line x1="14" y1="24" x2="16" y2="42" />
        <line x1="50" y1="24" x2="42" y2="32" />
        <line x1="42" y1="32" x2="48" y2="42" />
        <line x1="50" y1="24" x2="48" y2="42" />
      </g>

      <g
        stroke="#FF7A59"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="0.5 2"
      >
        <line x1="14" y1="24" x2="32" y2="18" />
        <line x1="22" y1="32" x2="32" y2="32" />
        <line x1="16" y1="42" x2="32" y2="46" />
        <line x1="50" y1="24" x2="32" y2="18" />
        <line x1="42" y1="32" x2="32" y2="32" />
        <line x1="48" y1="42" x2="32" y2="46" />
      </g>

      {/* All nodes: coral */}
      <g fill="#FF7A59" stroke="#1F2933" strokeWidth="0.8">
        <circle cx="32" cy="18" r="2.4" />
        <circle cx="32" cy="32" r="2" />
        <circle cx="32" cy="46" r="2.4" />
        <circle cx="14" cy="24" r="2.2" />
        <circle cx="22" cy="32" r="2.2" />
        <circle cx="16" cy="42" r="2.2" />
        <circle cx="50" cy="24" r="2.2" />
        <circle cx="42" cy="32" r="2.2" />
        <circle cx="48" cy="42" r="2.2" />
      </g>
    </svg>
  );
}
