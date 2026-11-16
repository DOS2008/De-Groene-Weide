import type { Facility } from "@/content/facilities";
import { FacilityIconFor } from "./icons";
import styles from "./FacilityTile.module.css";

const surfaces: Record<Facility["surface"], string> = {
  stro: "var(--color-stro)",
  gras: "var(--color-plot-free)",
  water: "var(--color-water)",
};

/** Illustrated tile that stands in for a photo until Bert's photos arrive. */
export function FacilityTile({ facility, height = 160 }: { facility: Facility; height?: number }) {
  return (
    <div
      className={styles.tile}
      style={{ background: surfaces[facility.surface], height }}
      aria-hidden="true"
    >
      <FacilityIconFor icon={facility.icon} size={Math.round(height * 0.45)} />
    </div>
  );
}
