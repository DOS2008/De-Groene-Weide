import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { RouteKey } from "@/i18n/routing";
import { PageIntro } from "./PageIntro";
import styles from "./InfoPage.module.css";

const pages = [
  { route: "/accessibility", label: "accessibility" },
  { route: "/house-rules", label: "houseRules" },
  { route: "/privacy", label: "privacy" },
] as const satisfies readonly { route: RouteKey; label: string }[];

/** Shared layout for the footer pages: a side menu plus the text. */
export async function InfoPage({
  current,
  eyebrow,
  title,
  lead,
  children,
}: {
  current: (typeof pages)[number]["route"];
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getTranslations("footer");
  const ti = await getTranslations("infoPages");
  return (
    <div className={`container section ${styles.layout}`}>
      <nav aria-label={ti("navLabel")} className={styles.sub}>
        <ul>
          {pages.map((p) => (
            <li key={p.route}>
              <Link href={p.route} aria-current={p.route === current ? "page" : undefined}>
                {t(p.label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="prose">
        <PageIntro eyebrow={eyebrow} title={title} lead={lead} />
        {children}
      </div>
    </div>
  );
}
