import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Chicken } from "@/components/Chicken";
import { CalmToggle } from "./CalmToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const t = await getTranslations("meta");
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Chicken size={48} />
          <span>{t("siteName")}</span>
        </Link>
        <MainNav />
        <div className={styles.tools}>
          <LanguageSwitcher />
          <CalmToggle />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
