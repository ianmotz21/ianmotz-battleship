import Board from "@/components/Board";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Battleship</h1>
      <div className={styles.boards}>
        <Board title="Your Fleet" />
        <Board title="Enemy Waters" />
      </div>
    </main>
  );
}
