import type { ReactNode } from "react";
import type { ShotOutcome } from "@/lib/battleMessages";
import { BOARD_SIZE, COLUMN_LABELS, FLEET, getShip, type Placements, type ShipId } from "@/lib/fleet";
import styles from "./Board.module.css";

const ROW_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type Side = "rome" | "carthage";

export type Shots = Map<string, ShotOutcome>;

export type Dispatch = {
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
  /** Ships drawn on this board (only ever the player's own). */
  ships?: Placements;
  /** Shots fired at this board, and whether each one hit. */
  shots?: Shots;
  /** Makes every square an attack button that calls this when clicked. */
  onAttack?: (coord: string) => void;
  attackDisabled?: boolean;
  placement?: PlacementHandlers;
  status?: ReactNode;
  /** Pass null to reserve space for battle messages before the first shot. */
  dispatch?: Dispatch | null;
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
  ships,
  shots,
  onAttack,
  attackDisabled = false,
  placement,
  status,
  dispatch,
  children,
}: BoardProps) {
  const segments = mapShipSegments(ships);

  function shipClasses(segment: ShipSegment | undefined): string {
    if (!segment) {
      return "";
    }
    const axis = segment.orientation === "horizontal" ? "H" : "V";
    const end = segment.position === "middle" ? "" : styles[`${segment.position}${axis}`];
    return `${styles.ship} ${end}`;
  }

  function shotClasses(outcome: ShotOutcome | undefined): string {
    if (!outcome) {
      return "";
    }
    return `${styles.attacked} ${outcome === "hit" ? styles.hit : ""}`;
  }

  function renderCell(col: string, rowIndex: number) {
    const coord = `${col}${rowIndex + 1}`;
    const segment = segments.get(coord);
    const outcome = shots?.get(coord);
    const isAttacked = outcome !== undefined;
    const cellLabel = `Column ${col}, row ${ROW_LABELS[rowIndex]}`;
    const shipLabel = segment ? `, ${getShip(segment.shipId).name}` : "";
    const shotLabel = isAttacked ? `, attacked, ${outcome}` : "";

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
          aria-label={`${cellLabel}${shipLabel}`}
          onClick={() => placement.onSelectCell(coord)}
          onMouseEnter={() => placement.onHoverCell(coord)}
          onFocus={() => placement.onHoverCell(coord)}
        />
      );
    }

    if (onAttack) {
      return (
        <button
          key={coord}
          type="button"
          className={`${styles.cell} ${styles.target} ${shotClasses(outcome)}`}
          data-coord={coord}
          data-attacked={isAttacked}
          data-outcome={outcome}
          aria-label={`${cellLabel}${shotLabel}`}
          disabled={isAttacked || attackDisabled}
          onClick={() => onAttack(coord)}
        />
      );
    }

    return (
      <div
        key={coord}
        className={`${styles.cell} ${shipClasses(segment)} ${shotClasses(outcome)}`}
        data-coord={coord}
        data-ship={segment?.shipId}
        data-attacked={isAttacked}
        data-outcome={outcome}
        role="img"
        aria-label={`${cellLabel}${shipLabel}${shotLabel}`}
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
        className={`${styles.grid} ${onAttack && attackDisabled ? styles.waiting : ""}`}
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
      {status && <p className={styles.status}>{status}</p>}
      {dispatch !== undefined && (
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
      )}
      {children}
    </section>
  );
}
