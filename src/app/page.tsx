import Game from "@/components/Game";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Mare Nostrum · 264–146 BC</p>
        <h1 className={styles.title}>Bellum Punicum</h1>
        <p className={styles.subtitle}>Battleship</p>
        <div className={styles.meander} aria-hidden="true" />
      </header>

      <Game />

      <footer className={styles.footer}>
        Roma · Carthago
      </footer>
    </main>
  );
}
