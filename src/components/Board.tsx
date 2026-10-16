import styles from "./Board.module.css";

const BOARD_SIZE = 10;
const COLUMN_LABELS = "ABCDEFGHIJ".split("");
const ROW_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type Side = "rome" | "carthage";

type BoardProps = {
  title: string;
  motto: string;
  side: Side;
};

function Emblem({ side }: { side: Side }) {
  if (side === "rome") {
    return <span className={styles.spqr}>SPQR</span>;
  }

  // Sign of Tanit, the emblem of Carthage's patron goddess.
  return (
    <svg className={styles.tanit} viewBox="0 0 24 28" aria-hidden="true">
      <circle cx="12" cy="6" r="4" />
      <path d="M3 13H21" />
      <path d="M12 11L4 26H20Z" />
    </svg>
  );
}

export default function Board({ title, motto, side }: BoardProps) {
  return (
    <section className={`${styles.board} ${styles[side]}`} aria-label={title}>
      <header className={styles.header}>
        <Emblem side={side} />
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.motto}>{motto}</p>
      </header>
      <div className={styles.grid}>
        <div />
        {COLUMN_LABELS.map((col) => (
          <div key={col} className={styles.label}>
            {col}
          </div>
        ))}
        {ROW_LABELS.slice(0, BOARD_SIZE).map((row, rowIndex) => [
          <div key={`label-${row}`} className={styles.label}>
            {row}
          </div>,
          ...COLUMN_LABELS.map((col) => (
            <div key={`${col}${rowIndex + 1}`} className={styles.cell} />
          )),
        ])}
      </div>
    </section>
  );
}
