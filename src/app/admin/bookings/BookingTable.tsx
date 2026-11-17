import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { sourceNames, statusNames, type BookingRow } from "@/lib/admin/bookings";
import { ActionForm, Submit } from "../ActionForm";
import { cancelBooking, confirmBooking } from "./actions";
import { TableWrap } from "@/components/TableWrap";

const short = (d: string) => formatDate(d, "nl", { weekday: "short", day: "numeric", month: "short" });

export function BookingTable({ rows, canEdit }: { rows: BookingRow[]; canEdit: boolean }) {
  return (
    <TableWrap label={"Boekingen"}>
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Plek</th>
            <th scope="col">Gast</th>
            <th scope="col">Data</th>
            <th scope="col">Pers.</th>
            <th scope="col">Taal</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                <span className="admin-pill">{r.plot_id}</span>
                <br />
                <Link href={`/admin/bookings/${r.id}`} className="admin-hint">
                  {r.code}
                </Link>
              </th>
              <td>
                {r.name}
                {r.email && (
                  <>
                    <br />
                    <a href={`mailto:${r.email}`}>{r.email}</a>
                  </>
                )}
                {r.phone && (
                  <>
                    <br />
                    <a href={`tel:${r.phone}`}>{r.phone}</a>
                  </>
                )}
                {r.remarks && <p className="admin-hint">“{r.remarks}”</p>}
              </td>
              <td>
                {short(r.arrival)} – {short(r.departure)}
                <br />
                <span className="admin-hint">{sourceNames[r.source]}</span>
              </td>
              <td>
                {(r.adults ?? 0) + r.children}
                {r.dogs > 0 && <span className="admin-hint"> + {r.dogs} hond</span>}
              </td>
              <td>{r.locale.toUpperCase()}</td>
              <td>
                <span className="admin-pill" data-status={r.status}>
                  {statusNames[r.status]}
                </span>
                {r.cancel_reason && <p className="admin-hint">{r.cancel_reason}</p>}
              </td>
              <td>
                {canEdit && r.status !== "cancelled" && (
                  <div className="admin-inline">
                    {r.status === "requested" && (
                      <ActionForm action={confirmBooking}>
                        <input type="hidden" name="id" value={r.id} />
                        <Submit>Bevestigen</Submit>
                      </ActionForm>
                    )}
                    <details>
                      <summary className="btn btn-quiet admin-btn-small">Annuleren</summary>
                      <ActionForm
                        action={cancelBooking}
                        className="admin-form"
                        confirm={`Reservering ${r.code} annuleren? De plek komt dan weer vrij.`}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <div className="admin-field">
                          <label htmlFor={`reason-${r.id}`}>Reden (voor jezelf)</label>
                          <input id={`reason-${r.id}`} name="reason" maxLength={500} />
                        </div>
                        {r.email && (
                          <label className="admin-inline">
                            <input type="checkbox" name="notify" defaultChecked /> Mail de gast
                          </label>
                        )}
                        <Submit className="btn btn-ink admin-btn-small">Annuleer {r.code}</Submit>
                      </ActionForm>
                    </details>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
