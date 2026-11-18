/**
 * The hand-drawn chicken mascot from the Stijlgids. Decorative by default;
 * pass a `label` when the drawing carries meaning.
 */
export function Chicken({
  size = 104,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      focusable="false"
      {...a11y}
    >
      <ChickenShape />
    </svg>
  );
}

/** The chicken's paths, for use inside a larger illustration. */
export function ChickenShape() {
  return (
    <g strokeLinejoin="round">
      <ChickenBody />
      <ChickenWing />
      <ChickenLeg which="back" />
      <ChickenLeg which="front" />
    </g>
  );
}

const line = "var(--color-outline)";

/**
 * The separate parts, so the farm illustration can move them. In the
 * chicken's 120 × 120 grid: the hips sit at (56, 94) and (70, 92), the wing
 * joint at (66, 66).
 */
export function ChickenBody() {
  return (
    <g strokeLinejoin="round">
      <path
        d="M30 66 C20 58 18 46 24 40 C28 50 32 54 38 56"
        fill="var(--color-white)"
        stroke={line}
        strokeWidth="4"
      />
      <path
        d="M30 70 C30 45 50 32 66 36 C70 24 86 22 92 34 C100 50 98 84 72 92 C50 98 30 90 30 70 Z"
        fill="var(--color-white)"
        stroke={line}
        strokeWidth="4"
      />
      <path
        d="M76 27 C73 18 80 13 84 20 C86 12 95 14 92 25"
        fill="var(--color-kam-oranje)"
        stroke={line}
        strokeWidth="3"
      />
      <path d="M96 40 L108 44 L96 48 Z" fill="var(--color-eigeel)" stroke={line} strokeWidth="3" />
      <path d="M95 50 C97 57 92 59 90 54" fill="var(--color-kam-oranje)" stroke={line} strokeWidth="2.5" />
      <circle cx="86" cy="38" r="3.5" fill={line} />
    </g>
  );
}

export function ChickenWing() {
  return (
    <path
      d="M44 66 C52 58 66 60 70 70 C62 78 50 78 44 66 Z"
      fill="var(--color-stro)"
      stroke={line}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}

export function ChickenLeg({ which }: { which: "back" | "front" }) {
  return (
    <path
      d={which === "back" ? "M56 94 L54 108 M48 108 H60" : "M70 92 L72 108 M66 108 H78"}
      stroke={line}
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  );
}
