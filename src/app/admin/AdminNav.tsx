"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./AdminShell";

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <ul className="admin-nav-list">
      {items.map((i) => {
        const current = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={current ? "page" : undefined}>
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
