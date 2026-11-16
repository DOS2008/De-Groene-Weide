import styles from "./PageIntro.module.css";

/** Eyebrow, page heading and lead text at the top of a page. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.intro}>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {lead ? <p className="lead">{lead}</p> : null}
      {children}
    </div>
  );
}
