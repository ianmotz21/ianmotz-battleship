"use client";

import { useState } from "react";
import { pickBattleMessage, type ShotOutcome } from "@/lib/battleMessages";
import styles from "./Board.module.css";

const BOARD_SIZE = 10;
const COLUMN_LABELS = "ABCDEFGHIJ".split("");
const ROW_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type Side = "rome" | "carthage";

type Dispatch = {
  id: number;
  text: string;
  outcome: ShotOutcome;
};

type BoardProps = {
  title: string;
  motto: string;
  side: Side;
  interactive?: boolean;
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

export default function Board({ title, motto, side, interactive = false }: BoardProps) {
  const [attacked, setAttacked] = useState<Set<string>>(() => new Set());
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const attacker: Side = side === "rome" ? "carthage" : "rome";

  function handleAttack(coord: string) {
    if (attacked.has(coord)) {
      return;
    }

    setAttacked((previous) => {
      if (previous.has(coord)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(coord);
      return next;
    });

    // No ships exist yet, so every shot is a miss.
    const outcome: ShotOutcome = "miss";
    setDispatch({
      id: (dispatch?.id ?? 0) + 1,
      text: pickBattleMessage(attacker, outcome, dispatch?.text),
      outcome,
    });
  }

  function renderCell(col: string, rowIndex: number) {
    const coord = `${col}${rowIndex + 1}`;

    if (!interactive) {
      return <div key={coord} className={styles.cell} data-coord={coord} />;
    }

    const isAttacked = attacked.has(coord);
    return (
      <button
        key={coord}
        type="button"
        className={`${styles.cell} ${styles.target} ${isAttacked ? styles.attacked : ""}`}
        data-coord={coord}
        data-attacked={isAttacked}
        aria-label={`Column ${col}, row ${ROW_LABELS[rowIndex]}${isAttacked ? ", attacked" : ""}`}
        disabled={isAttacked}
        onClick={() => handleAttack(coord)}
      />
    );
  }

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
          ...COLUMN_LABELS.map((col) => renderCell(col, rowIndex)),
        ])}
      </div>
      {interactive && (
        <>
          <p className={styles.status}>
            Shots fired: <span data-testid="shots-fired">{attacked.size}</span>
          </p>
          <div className={styles.dispatchArea} aria-live="polite">
            {dispatch && (
              <p
                key={dispatch.id}
                className={`${styles.dispatch} ${dispatch.outcome === "hit" ? styles.dispatchHit : styles.dispatchMiss}`}
                data-testid="battle-dispatch"
                data-outcome={dispatch.outcome}
              >
                {dispatch.text}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
