import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/staff";
import { getFacilities, getPlots } from "@/lib/data/map";
import { getPriceInfo } from "@/lib/data/booking";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { NewBookingForm } from "./NewBookingForm";

export const metadata: Metadata = { title: "Reservering toevoegen" };

export default async function NewBookingPage() {
  await requireStaff("admin", "reception");
  const [plots, facilities, prices, messages] = await Promise.all([
    getPlots("nl"),
    getFacilities("nl"),
    getPriceInfo("nl"),
    getMessages({ locale: "nl" }),
  ]);
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Reserveringen</span>
          <h1>Reservering toevoegen</h1>
        </div>
      </div>
      <p className="admin-hint">
        Voor een boeking per telefoon of aan de balie. Dezelfde kaart en dezelfde regels als op de website: een bezette
        plek kun je niet kiezen. De plek is meteen bezet op de site.
      </p>
      {/* The map component uses the public site's texts. */}
      <NextIntlClientProvider locale="nl" messages={{ map: messages.map, booking: messages.booking }}>
        <NewBookingForm plots={plots} facilities={facilities} prices={prices} />
      </NextIntlClientProvider>
    </>
  );
}
