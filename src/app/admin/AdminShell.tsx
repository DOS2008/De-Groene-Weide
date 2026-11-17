import Link from "next/link";
import { ChickenShape } from "@/components/Chicken";
import { can, getStaff, roleNames, type Role } from "@/lib/admin/staff";
import { AdminNav } from "./AdminNav";
import { signOut } from "./auth-actions";

export type NavItem = { href: string; label: string };

function navFor(role: Role): NavItem[] {
  const items: (NavItem & { show: boolean })[] = [
    { href: "/admin", label: "Start", show: true },
    { href: "/admin/pages", label: "Pagina's & teksten", show: can.content(role) },
    { href: "/admin/media", label: "Foto's & media", show: can.media(role) },
    { href: "/admin/events", label: "Evenementen", show: can.events(role) },
    { href: "/admin/plots", label: "Plekken", show: can.bookings(role) },
    { href: "/admin/prices", label: "Prijzen & seizoenen", show: can.content(role) },
    { href: "/admin/bookings", label: "Reserveringen", show: can.bookings(role) },
    { href: "/admin/facilities", label: "Voorzieningen", show: can.content(role) },
    { href: "/admin/messages", label: "Berichten", show: can.messages(role) },
    { href: "/admin/settings", label: "Instellingen", show: can.content(role) },
    { href: "/admin/users", label: "Gebruikers & rollen", show: can.content(role) },
  ];
  return items.filter((i) => i.show).map(({ href, label }) => ({ href, label }));
}

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();

  if (!staff?.aal2) {
    return (
      <main id="inhoud" tabIndex={-1} className="admin-login-main">
        {children}
      </main>
    );
  }

  return (
    <div className="admin-frame">
      <nav className="admin-nav" aria-label="Beheer">
        <Link href="/admin" className="admin-brand">
          <svg viewBox="0 0 120 120" width="40" height="40" aria-hidden="true">
            <ChickenShape />
          </svg>
          <span>Beheer</span>
        </Link>
        <AdminNav items={navFor(staff.role)} />
        <div className="admin-who">
          <span>
            {staff.name} · {roleNames[staff.role]}
          </span>
          <span>Tweestapsverificatie aan</span>
          <form action={signOut}>
            <button type="submit" className="admin-signout">
              Uitloggen
            </button>
          </form>
        </div>
      </nav>
      <main id="inhoud" tabIndex={-1} className="admin-main">
        {children}
      </main>
    </div>
  );
}
