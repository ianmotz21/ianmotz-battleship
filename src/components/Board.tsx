import styles from "./Board.module.css";

const BOARD_SIZE = 10;
const COLUMN_LABELS = "ABCDEFGHIJ".split("");
const ROW_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) => String(i + 1));

type BoardProps = {
  title: string;
};

export default function Board({ title }: BoardProps) {
  return (
    <section className={styles.board} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        <div />
        {COLUMN_LABELS.map((col) => (
          <div key={col} className={styles.label}>
            {col}
          </div>
        ))}
        {ROW_LABELS.map((row) => [
          <div key={`label-${row}`} className={styles.label}>
            {row}
          </div>,
          ...COLUMN_LABELS.map((col) => (
            <div key={`${col}${row}`} className={styles.cell} />
          )),
        ])}
      </div>
    </section>
  );
}
