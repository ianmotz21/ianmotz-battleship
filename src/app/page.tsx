import Board from "@/components/Board";
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

      <div className={styles.boards}>
        <Board
          side="rome"
          title="Roman Fleet"
          motto="Senatus Populusque Romanus"
        />
        <div className={styles.versus} aria-hidden="true">
          <span className={styles.versusLine} />
          <span className={styles.versusText}>contra</span>
          <span className={styles.versusLine} />
        </div>
        <Board side="carthage" title="Carthaginian Fleet" motto="Qart-ḥadašt" />
      </div>

      <footer className={styles.footer}>
        Roma · Carthago
      </footer>
    </main>
  );
}
