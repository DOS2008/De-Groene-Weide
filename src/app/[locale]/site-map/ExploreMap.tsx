"use client";

import { Link } from "@/i18n/navigation";
import { SiteMap } from "@/components/map/SiteMap";
import type { MapFacility, MapPlot } from "@/lib/data/map";

/** The map in explore mode: no dates, everything clickable. */
export function ExploreMap({
  plots,
  facilities,
  ctaLabel,
}: {
  plots: MapPlot[];
  facilities: MapFacility[];
  ctaLabel: string;
}) {
  return (
    <SiteMap
      plots={plots}
      facilities={facilities}
      mode="explore"
      plotFooter={(plot) => (
        <Link href={{ pathname: "/book", query: { plek: plot.id } }} className="btn btn-primary">
          {ctaLabel}
        </Link>
      )}
    />
  );
}
