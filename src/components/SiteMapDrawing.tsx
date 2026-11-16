import { FacilityIconFor } from "./icons";
import type { FacilityIcon } from "@/content/facilities";

/**
 * Draft drawing of the terrain, laid out like the hi-fi design: meadows A
 * and B on the left, facilities in the middle, campers, pool and safari
 * tents on the right. Static in Prio 1; Prio 2 replaces it with the real
 * SVG map where every plot is a button. The text list next to it carries
 * the same information for screen readers.
 */
export function SiteMapDrawing({
  label,
  labels,
}: {
  label: string;
  labels: {
    zoneA: string;
    zoneB: string;
    zoneC: string;
    zoneS: string;
    entrance: string;
    playground: string;
    chickens: string;
    canteen: string;
    sanitary: string;
    pool: string;
    reception: string;
  };
}) {
  return (
    <svg viewBox="0 0 1000 640" role="img" aria-label={label} focusable="false" style={{ display: "block", width: "100%", height: "auto" }}>
      <rect x="0" y="0" width="1000" height="640" rx="28" fill="var(--color-plot-free)" />
      {/* Farm lane from the entrance */}
      <path d="M500 640 V40" stroke="var(--color-stro)" strokeWidth="44" strokeLinecap="round" />
      <path d="M410 520 H590 M410 300 H590" stroke="var(--color-stro)" strokeWidth="26" />

      <Zone x={24} y={24} w={376} h={200} title={labels.zoneA}>
        <Plots x={44} y={68} cols={5} rows={4} from={1} w={58} h={30} gap={10} />
      </Zone>

      <Facility x={24} y={242} w={376} h={110} icon="tractor" title={labels.playground} fill="var(--color-meadow)" />

      <Zone x={24} y={370} w={376} h={200} title={labels.zoneB}>
        <Plots x={44} y={414} cols={5} rows={4} from={21} w={58} h={30} gap={10} />
      </Zone>

      <Facility x={418} y={24} w={164} h={92} icon="chicken" title={labels.chickens} fill="var(--color-stro)" small />
      <Facility x={418} y={134} w={164} h={110} icon="barn" title={labels.canteen} fill="var(--color-clay)" small />
      <Facility x={418} y={330} w={164} h={110} icon="shower" title={labels.sanitary} fill="var(--color-white)" small />
      <Facility x={418} y={458} w={164} h={100} icon="shop" title={labels.reception} fill="var(--color-stro)" small />

      <Zone x={600} y={24} w={376} h={176} title={labels.zoneC}>
        <Plots x={620} y={68} cols={6} rows={2} from={1} w={50} h={48} gap={9} />
      </Zone>

      <Facility x={600} y={218} w={376} h={134} icon="pool" title={labels.pool} fill="var(--color-pool)" />

      <Zone x={600} y={370} w={376} h={200} title={labels.zoneS}>
        <Plots x={620} y={414} cols={4} rows={2} from={1} w={78} h={60} gap={11} />
      </Zone>

      {/* Entrance */}
      <g>
        <rect x="430" y="588" width="140" height="40" rx="20" fill="var(--color-weidegroen)" />
        <text x="500" y="614" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--color-white)">
          {labels.entrance}
        </text>
      </g>
    </svg>
  );
}

function Zone({
  x,
  y,
  w,
  h,
  title,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="18"
        fill="var(--color-gras-licht)"
        stroke="var(--color-weidegroen)"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <text x={x + 18} y={y + 30} fontSize="18" fontWeight="700" fill="var(--color-inkt)">
        {title}
      </text>
      {children}
    </g>
  );
}

function Plots({
  x,
  y,
  cols,
  rows,
  from,
  w,
  h,
  gap,
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  from: number;
  w: number;
  h: number;
  gap: number;
}) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = from + r * cols + c;
      const cx = x + c * (w + gap);
      const cy = y + r * (h + gap);
      cells.push(
        <g key={n}>
          <rect x={cx} y={cy} width={w} height={h} rx="7" fill="var(--color-plot-free)" stroke="var(--color-weidegroen)" strokeWidth="2" />
          <text x={cx + w / 2} y={cy + h / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-inkt)">
            {n}
          </text>
        </g>,
      );
    }
  }
  return <>{cells}</>;
}

function Facility({
  x,
  y,
  w,
  h,
  icon,
  title,
  fill,
  small,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  icon: FacilityIcon;
  title: string;
  fill: string;
  small?: boolean;
}) {
  const iconSize = small ? 34 : 44;
  // Long names wrap onto two lines in the narrow middle column.
  const lines = small ? splitInTwo(title) : [title];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="16" fill={fill} stroke="var(--color-outline)" strokeOpacity="0.25" strokeWidth="2" />
      <g transform={`translate(${x + (small ? w / 2 - iconSize / 2 : 20)} ${y + (small ? 12 : h / 2 - iconSize / 2)})`} color="var(--color-schuurbruin)">
        <FacilityIconFor icon={icon} size={iconSize} />
      </g>
      {lines.map((line, i) => (
        <text
          key={line}
          x={small ? x + w / 2 : x + 20 + iconSize + 14}
          y={small ? y + iconSize + 34 + i * 20 : y + h / 2 + 6}
          textAnchor={small ? "middle" : "start"}
          fontSize={small ? 15 : 19}
          fontWeight="700"
          fill="var(--color-inkt)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function splitInTwo(title: string): string[] {
  if (title.length <= 16) return [title];
  const words = title.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
