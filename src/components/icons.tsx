import type { FacilityIcon } from "@/content/facilities";
import type { EventKind } from "@/lib/events";

type IconProps = { size?: number; className?: string };

function Svg({
  size = 24,
  className,
  viewBox = "0 0 24 24",
  strokeWidth = 2,
  children,
}: IconProps & { viewBox?: string; strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// Facility and event icons from the Stijlgids (32 × 32 grid).

export function ChickenIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <path d="M8 18c0-6 5-9 9-8 1-3 5-3 6 0 2 4 1 12-6 13-5 1-9-1-9-5z" />
      <path d="M24 12l4 1-4 2" />
      <path d="M14 23v4M19 23v4" />
    </Svg>
  );
}

export function TractorIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <circle cx="9" cy="23" r="5" />
      <circle cx="24" cy="25" r="3" />
      <path d="M14 23h7M6 17V9h8l3 8h7v5" />
      <path d="M20 17V11" />
    </Svg>
  );
}

export function PoolIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <path d="M4 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" />
      <path d="M4 26c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" />
      <path d="M10 15V6a3 3 0 0 1 6 0M22 15V6" />
    </Svg>
  );
}

export function BarnIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <path d="M4 14L16 5l12 9v13H4z" />
      <path d="M12 27v-8h8v8" />
    </Svg>
  );
}

export function ShopIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <path d="M5 12l2-6h18l2 6" />
      <path d="M5 12c0 2 1.5 3 3.5 3S12 14 12 12c0 2 1.5 3 4 3s4-1 4-3c0 2 1.5 3 3.5 3S27 14 27 12" />
      <path d="M7 15v12h18V15" />
      <path d="M13 27v-6h6v6" />
    </Svg>
  );
}

export function ShowerIcon(p: IconProps) {
  return (
    <Svg {...p} viewBox="0 0 32 32" strokeWidth={2.2}>
      <path d="M8 28V9a4 4 0 0 1 8 0" />
      <path d="M12 13h8a4 4 0 0 0-8 0z" />
      <path d="M14 18v2M18 18v2M16 22v2M12 22v2M20 22v2" />
    </Svg>
  );
}

const facilityIcons: Record<FacilityIcon, (p: IconProps) => React.ReactNode> = {
  chicken: ChickenIcon,
  tractor: TractorIcon,
  pool: PoolIcon,
  shop: ShopIcon,
  barn: BarnIcon,
  shower: ShowerIcon,
};

export function FacilityIconFor({ icon, ...p }: IconProps & { icon: FacilityIcon }) {
  const Icon = facilityIcons[icon];
  return <Icon {...p} />;
}

const eventIcons: Record<EventKind, (p: IconProps) => React.ReactNode> = {
  animals: ChickenIcon,
  play: TractorIcon,
  pool: PoolIcon,
  food: BarnIcon,
};

export function EventIconFor({ kind, ...p }: IconProps & { kind: EventKind }) {
  const Icon = eventIcons[kind];
  return <Icon {...p} />;
}

// UI icons (24 × 24 grid).

export function MoonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
    </Svg>
  );
}

export function PauseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 5v14M16 5v14" />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 5l12 7-12 7z" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </Svg>
  );
}

export function MailIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </Svg>
  );
}

export function PinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </Svg>
  );
}

export function ArrowIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12l5 5 9-10" />
    </Svg>
  );
}
