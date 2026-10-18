import { useId, type CSSProperties, type ReactNode } from "react";
import { Medallion } from "@/components/Insignia";
import type { ShotOutcome } from "@/lib/battleMessages";
import { BOARD_SIZE, COLUMN_LABELS, FLEET, getShip, type Placements, type ShipId } from "@/lib/fleet";
import styles from "./Board.module.css";

const ROW_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type Side = "rome" | "carthage";

/** "E5" -> "E·V", matching the board's column letters and Roman-numeral rows. */
export function coordLabel(coord: string): string {
  return `${coord[0]}·${ROW_LABELS[Number(coord.slice(1)) - 1]}`;
}

export type Shots = Map<string, ShotOutcome>;

export type Dispatch = {
  id: number;
  text: string;
  outcome: ShotOutcome;
  /** Bold announcement shown above the text, e.g. when a ship sinks. */
  headline?: string;
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
  /** Ships drawn on this board: the player's own, or enemy ships once sunk. */
  ships?: Placements;
  sunk?: ShipId[];
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

type ShipPlacement = NonNullable<Placements[ShipId]>;

/** Covers the ship's squares, so its hull can be drawn as one piece across them. */
function shipArea(placed: ShipPlacement, size: number): CSSProperties {
  const vertical = placed.orientation === "vertical";
  const col = Math.min(...placed.cells.map((cell) => COLUMN_LABELS.indexOf(cell[0])));
  const row = Math.min(...placed.cells.map((cell) => Number(cell.slice(1)) - 1));
  // +2 skips the row/column of labels (grid lines are 1-based).
  return {
    gridColumn: `${col + 2} / span ${vertical ? 1 : size}`,
    gridRow: `${row + 2} / span ${vertical ? size : 1}`,
  };
}

/**
 * A top-down galley: bronze ram and painted eyes at the bow, oars along the
 * sides, and a curled stern ornament. Drawn bow-left, then turned for vertical ships.
 */
function Hull({ size, vertical, sunk, side, style }: {
  size: number;
  vertical: boolean;
  sunk: boolean;
  side: Side;
  style: CSSProperties;
}) {
  const id = useId();
  const L = size * 100;
  const oars: number[] = [];
  for (let x = 90; x <= L - 70; x += 55) {
    oars.push(x);
  }
  const stripe = side === "rome" ? "#a82424" : "#6b2f70";
  return (
    <svg
      className={`${styles.hull} ${sunk ? styles.hullSunk : ""}`}
      style={style}
      viewBox={vertical ? `0 0 100 ${L}` : `0 0 ${L} 100`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6a3c" />
          <stop offset="0.5" stopColor="#7a4f2a" />
          <stop offset="1" stopColor="#4e301a" />
        </linearGradient>
      </defs>
      <g transform={vertical ? "translate(100 0) rotate(90)" : undefined}>
        <g stroke="#3b2412" strokeWidth="3.5" strokeLinecap="round">
          {oars.map((x) => (
            <path key={x} d={`M${x} 24L${x - 14} 5M${x} 76L${x - 14} 95`} />
          ))}
        </g>
        <path
          d={`M6 50C18 34 34 24 60 22L${L - 40} 22C${L - 18} 22 ${L - 6} 34 ${L - 6} 50C${L - 6} 66 ${L - 18} 78 ${L - 40} 78L60 78C34 76 18 66 6 50Z`}
          fill={`url(#${id}-wood)`}
          stroke="#2e1c0e"
          strokeWidth="2.5"
        />
        <path d={`M52 28.5H${L - 38}M52 71.5H${L - 38}`} stroke={stripe} strokeWidth="4" />
        <path
          d={`M42 50C50 41 58 37 72 37L${L - 44} 37C${L - 30} 37 ${L - 22} 43 ${L - 22} 50C${L - 22} 57 ${L - 30} 63 ${L - 44} 63L72 63C58 63 50 59 42 50Z`}
          fill="#c4935c"
          opacity="0.5"
        />
        <path d={`M72 44H${L - 44}M72 50H${L - 44}M72 56H${L - 44}`} stroke="rgba(60, 35, 15, 0.45)" strokeWidth="1.2" />
        <path d="M0 50L13 43.5V56.5Z" fill="#c9974f" stroke="#6e4a1e" strokeWidth="1.5" />
        <circle cx="30" cy="38.5" r="3" fill="#f3eee4" />
        <circle cx="30" cy="61.5" r="3" fill="#f3eee4" />
        <circle cx={L / 2} cy="50" r="5" fill="#3b2412" />
        <path d={`M${L - 16} 38C${L - 3} 38 ${L - 3} 62 ${L - 16} 62`} fill="none" stroke="#c9974f" strokeWidth="3" />
      </g>
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
  sunk = [],
  shots,
  onAttack,
  attackDisabled = false,
  placement,
  status,
  dispatch,
  children,
}: BoardProps) {
  const segments = mapShipSegments(ships);
  const placedShips = FLEET.flatMap(({ id, size }) => {
    const placed = ships?.[id];
    return placed ? [{ id, size, placed, isSunk: sunk.includes(id) }] : [];
  });
  // Hit praise comes from the attacker's general, a miss draws a jab from the defender's.
  const speaker = dispatch && (dispatch.outcome === "hit") === (side === "rome") ? "hannibal" : "scipio";

  function shipClasses(segment: ShipSegment | undefined): string {
    if (!segment) {
      return "";
    }
    const axis = segment.orientation === "horizontal" ? "H" : "V";
    const end = segment.position === "middle" ? "" : styles[`${segment.position}${axis}`];
    return `${styles.ship} ${end} ${sunk.includes(segment.shipId) ? styles.sunk : ""}`;
  }

  function shotClasses(outcome: ShotOutcome | undefined): string {
    if (!outcome) {
      return "";
    }
    return `${styles.attacked} ${outcome === "hit" ? styles.hit : styles.miss}`;
  }

  function renderCell(col: string, rowIndex: number) {
    const coord = `${col}${rowIndex + 1}`;
    const segment = segments.get(coord);
    const outcome = shots?.get(coord);
    const isAttacked = outcome !== undefined;
    const cellLabel = `Column ${col}, row ${ROW_LABELS[rowIndex]}`;
    const shipLabel = segment ? `, ${getShip(segment.shipId).name}` : "";
    const shotLabel = isAttacked ? `, attacked, ${outcome}` : "";
    // Staggers the ocean animation so swells roll diagonally across the board.
    const waveStyle = { "--wave": COLUMN_LABELS.indexOf(col) + rowIndex } as CSSProperties;

    if (placement) {
      const inPreview = placement.preview?.cells.includes(coord) ?? false;
      const previewState = inPreview ? (placement.preview!.valid ? "valid" : "invalid") : undefined;
      const previewClass = previewState === "valid" ? styles.previewValid : previewState === "invalid" ? styles.previewInvalid : "";
      return (
        <button
          key={coord}
          type="button"
          className={`${styles.cell} ${styles.placeTarget} ${shipClasses(segment)} ${previewClass}`}
          style={waveStyle}
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
          className={`${styles.cell} ${styles.target} ${shipClasses(segment)} ${shotClasses(outcome)}`}
          style={waveStyle}
        data-coord={coord}
          data-ship={segment?.shipId}
          data-sunk={segment ? sunk.includes(segment.shipId) : undefined}
          data-attacked={isAttacked}
          data-outcome={outcome}
          aria-label={`${cellLabel}${shipLabel}${shotLabel}`}
          disabled={isAttacked || attackDisabled}
          onClick={() => onAttack(coord)}
        />
      );
    }

    return (
      <div
        key={coord}
        className={`${styles.cell} ${shipClasses(segment)} ${shotClasses(outcome)}`}
        style={waveStyle}
        data-coord={coord}
        data-ship={segment?.shipId}
        data-sunk={segment ? sunk.includes(segment.shipId) : undefined}
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
        {placedShips.map(({ id, size, placed, isSunk }) => (
          <Hull
            key={id}
            size={size}
            vertical={placed.orientation === "vertical"}
            sunk={isSunk}
            side={side}
            style={shipArea(placed, size)}
          />
        ))}
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
        {placedShips
          .filter(({ isSunk }) => isSunk)
          .map(({ id, size, placed }) => (
            <span key={`sink-${id}`} className={styles.sinkFlash} style={shipArea(placed, size)} aria-hidden="true" />
          ))}
      </div>
      {status && <p className={styles.status}>{status}</p>}
      {dispatch !== undefined && (
        <div className={styles.dispatchArea} aria-live="polite">
          {dispatch && (
            <div key={dispatch.id} className={styles.dispatchRow}>
              <Medallion general={speaker} className={styles.medallion} />
              <p
                className={`${styles.dispatch} ${dispatch.outcome === "hit" ? styles.dispatchHit : styles.dispatchMiss}`}
                data-testid="battle-dispatch"
                data-outcome={dispatch.outcome}
              >
                {dispatch.headline && (
                  <strong className={styles.dispatchHeadline} data-testid="sunk-announcement">
                    {dispatch.headline}
                  </strong>
                )}
                {dispatch.text}
              </p>
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
