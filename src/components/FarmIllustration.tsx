import { ChickenShape } from "./Chicken";

/** Drawn farmyard for the home hero: sun, hills, the old milking parlour, a fence and the chicken. */
export function FarmIllustration({ label, className }: { label: string; className?: string }) {
  const line = "var(--color-outline)";
  return (
    <svg viewBox="0 0 560 400" className={className} role="img" aria-label={label} focusable="false">
      <circle cx="460" cy="90" r="46" fill="var(--color-eigeel)" />
      <path
        d="M0 250 C120 190 220 210 320 240 C420 270 500 220 560 200 L560 400 L0 400 Z"
        fill="var(--color-hill-light)"
      />
      <path
        d="M0 300 C140 260 260 290 380 300 C460 306 520 290 560 280 L560 400 L0 400 Z"
        fill="var(--color-hill)"
      />
      <g stroke={line} strokeWidth="4" strokeLinejoin="round">
        <path d="M90 290 V200 L160 150 L230 200 V290 Z" fill="var(--color-barn)" />
        <path d="M135 290 V240 H185 V290" fill="var(--color-stro)" />
        <path d="M80 205 L160 145 L240 205" fill="none" />
        <rect x="146" y="180" width="28" height="22" fill="var(--color-stro)" />
      </g>
      <g stroke={line} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M300 300 V260 M340 300 V260 M380 300 V260 M290 272 H400" />
      </g>
      <g transform="translate(380 250) scale(1.15)">
        <ChickenShape />
      </g>
    </svg>
  );
}
