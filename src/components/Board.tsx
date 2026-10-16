"use client";

import { useState, type ReactNode } from "react";
import { pickBattleMessage, type ShotOutcome } from "@/lib/battleMessages";
import { BOARD_SIZE, COLUMN_LABELS, FLEET, getShip, type Placements, type ShipId } from "@/lib/fleet";
import styles from "./Board.module.css";

const ROW_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type Side = "rome" | "carthage";

type Dispatch = {
  id: number;
  text: string;
  outcome: ShotOutcome;
};

type ShipSegment = {
  shipId: ShipId;
  position: "start" | "middle" | "end";
  orientation: "horizontal" | "vertical";
};

export type PlacementPreview = {
  cells: string[];
  valid: boolean;
};

type PlacementHandlers = {
  preview: PlacementPreview | null;
  onSelectCell: (coord: string) => void;
  onHoverCell: (coord: string | null) => void;
};

type BoardProps = {
  title: string;
  motto: string;
  side: Side;
  interactive?: boolean;
  ships?: Placements;
  placement?: PlacementHandlers;
  findShipAt?: (coord: string) => ShipId | undefined;
  children?: ReactNode;
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

function mapShipSegments(ships: Placements = {}): Map<string, ShipSegment> {
  const segments = new Map<string, ShipSegment>();
  for (const { id } of FLEET) {
    const placed = ships[id];
    if (!placed) {
      continue;
    }
    placed.cells.forEach((cell, index) => {
      const position = index === 0 ? "start" : index === placed.cells.length - 1 ? "end" : "middle";
      segments.set(cell, { shipId: id, position, orientation: placed.orientation });
    });
  }
  return segments;
}

export default function Board({
  title,
  motto,
  side,
  interactive = false,
  ships,
  placement,
  findShipAt,
  children,
}: BoardProps) {
  const [shots, setShots] = useState<Map<string, ShotOutcome>>(() => new Map());
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const attacker: Side = side === "rome" ? "carthage" : "rome";
  const segments = mapShipSegments(ships);

  const hitCount = [...shots.values()].filter((outcome) => outcome === "hit").length;

  function handleAttack(coord: string) {
    if (shots.has(coord)) {
      return;
    }

    const outcome: ShotOutcome = findShipAt?.(coord) ? "hit" : "miss";

    setShots((previous) => {
      if (previous.has(coord)) {
        return previous;
      }
      const next = new Map(previous);
      next.set(coord, outcome);
      return next;
    });

    setDispatch({
      id: (dispatch?.id ?? 0) + 1,
      text: pickBattleMessage(attacker, outcome, dispatch?.text),
      outcome,
    });
  }

  function shipClasses(segment: ShipSegment | undefined): string {
    if (!segment) {
      return "";
    }
    const axis = segment.orientation === "horizontal" ? "H" : "V";
    const end = segment.position === "middle" ? "" : styles[`${segment.position}${axis}`];
    return `${styles.ship} ${end}`;
  }

  function renderCell(col: string, rowIndex: number) {
    const coord = `${col}${rowIndex + 1}`;
    const segment = segments.get(coord);
    const cellLabel = `Column ${col}, row ${ROW_LABELS[rowIndex]}`;

    if (placement) {
      const inPreview = placement.preview?.cells.includes(coord) ?? false;
      const previewState = inPreview ? (placement.preview!.valid ? "valid" : "invalid") : undefined;
      const previewClass = previewState === "valid" ? styles.previewValid : previewState === "invalid" ? styles.previewInvalid : "";
      return (
        <button
          key={coord}
          type="button"
          className={`${styles.cell} ${styles.placeTarget} ${shipClasses(segment)} ${previewClass}`}
          data-coord={coord}
          data-ship={segment?.shipId}
          data-preview={previewState}
          aria-label={`${cellLabel}${segment ? `, ${getShip(segment.shipId).name}` : ""}`}
          onClick={() => placement.onSelectCell(coord)}
          onMouseEnter={() => placement.onHoverCell(coord)}
          onFocus={() => placement.onHoverCell(coord)}
        />
      );
    }

    if (!interactive) {
      return (
        <div
          key={coord}
          className={`${styles.cell} ${shipClasses(segment)}`}
          data-coord={coord}
          data-ship={segment?.shipId}
        />
      );
    }

    const outcome = shots.get(coord);
    const isAttacked = outcome !== undefined;
    return (
      <button
        key={coord}
        type="button"
        className={`${styles.cell} ${styles.target} ${isAttacked ? styles.attacked : ""} ${outcome === "hit" ? styles.hit : ""}`}
        data-coord={coord}
        data-attacked={isAttacked}
        data-outcome={outcome}
        aria-label={`${cellLabel}${isAttacked ? `, attacked, ${outcome}` : ""}`}
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
      <div
        className={styles.grid}
        onMouseLeave={placement ? () => placement.onHoverCell(null) : undefined}
        onBlur={placement ? () => placement.onHoverCell(null) : undefined}
      >
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
            Shots fired: <span data-testid="shots-fired">{shots.size}</span>
            {" · "}
            Hits: <span data-testid="hits">{hitCount}</span>
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
      {children}
    </section>
  );
}
