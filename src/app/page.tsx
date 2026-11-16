import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>De Groene Weide</h1>
      <p>Familiecamping op de boerderij van Boer Bert.</p>
      <p className={styles.note}>
        De kippen leggen de laatste hand aan deze website.
      </p>
    </main>
  );
}
