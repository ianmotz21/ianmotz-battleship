"use client";

import { useEffect, useState, type ReactNode } from "react";
import Board, { type Dispatch, type Shots } from "@/components/Board";
import {
  FLEET,
  checkPlacement,
  getShip,
  type Orientation,
  type PlacementCheck,
  type Placements,
  type ShipId,
  type ShipType,
} from "@/lib/fleet";
import styles from "./PlayerFleet.module.css";

const ORIENTATIONS: Orientation[] = ["horizontal", "vertical"];

function describeProblem(ship: ShipType, result: PlacementCheck): string {
  if (result.ok) {
    return "";
  }
  if (result.reason === "off-board") {
    return `Your ${ship.name} won't fit there. It would run off the board.`;
  }
  return `Your ${ship.name} would collide with your ${getShip(result.blockedBy).name}.`;
}

type PlayerFleetProps = {
  placements: Placements;
  onPlacementsChange: (next: Placements) => void;
  /** Once the battle starts, ships can no longer be moved. */
  locked: boolean;
  shots: Shots;
  sunk: ShipId[];
  dispatch: Dispatch | null;
  status?: ReactNode;
};

export default function PlayerFleet({
  placements,
  onPlacementsChange: setPlacements,
  locked,
  shots,
  sunk,
  dispatch,
  status: battleStatus,
}: PlayerFleetProps) {
  const [selectedId, setSelectedId] = useState<ShipId | null>(FLEET[0].id);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hoveredCoord, setHoveredCoord] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedShip = selectedId ? getShip(selectedId) : null;
  const placedCount = FLEET.filter((ship) => placements[ship.id]).length;
  const preview =
    selectedShip && hoveredCoord ? checkPlacement(placements, selectedShip, hoveredCoord, orientation) : null;

  useEffect(() => {
    if (locked) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "r" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      setOrientation((current) => (current === "horizontal" ? "vertical" : "horizontal"));
      setNotice(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locked]);

  function selectShip(id: ShipId) {
    setSelectedId(id);
    setNotice(null);
  }

  function chooseOrientation(next: Orientation) {
    setOrientation(next);
    setNotice(null);
  }

  function handleSelectCell(coord: string) {
    if (!selectedShip) {
      setNotice("Every ship is placed. Choose one from the list to move it.");
      return;
    }

    const result = checkPlacement(placements, selectedShip, coord, orientation);
    if (!result.ok) {
      setNotice(describeProblem(selectedShip, result));
      return;
    }

    const next: Placements = { ...placements, [selectedShip.id]: { cells: result.cells, orientation } };
    setPlacements(next);
    setNotice(null);
    setSelectedId(FLEET.find((ship) => !next[ship.id])?.id ?? null);
  }

  function clearFleet() {
    setPlacements({});
    setSelectedId(FLEET[0].id);
    setNotice(null);
  }

  let status: string;
  if (notice) {
    status = notice;
  } else if (selectedShip && placements[selectedShip.id]) {
    status = `Choose a new starting square for your ${selectedShip.name}.`;
  } else if (selectedShip) {
    status = `Place your ${selectedShip.name} (${selectedShip.size} squares): choose its starting square.`;
  } else {
    status = "The fleet is assembled. Choose a ship to reposition it.";
  }

  if (locked) {
    return (
      <Board
        side="rome"
        title="Roman Fleet"
        motto="Senatus Populusque Romanus"
        ships={placements}
        shots={shots}
        sunk={sunk}
        status={battleStatus}
        dispatch={dispatch}
      />
    );
  }

  return (
    <Board
      side="rome"
      title="Roman Fleet"
      motto="Senatus Populusque Romanus"
      ships={placements}
      placement={{
        preview: preview ? { cells: preview.cells, valid: preview.ok } : null,
        onSelectCell: handleSelectCell,
        onHoverCell: setHoveredCoord,
      }}
    >
      <div className={styles.controls}>
        <p className={`${styles.status} ${notice ? styles.warning : ""}`} aria-live="polite" data-testid="placement-status">
          {status}
        </p>

        <ul className={styles.ships} aria-label="Ships">
          {FLEET.map((ship) => {
            const placed = Boolean(placements[ship.id]);
            return (
              <li key={ship.id}>
                <button
                  type="button"
                  className={`${styles.ship} ${placed ? styles.placed : ""}`}
                  aria-pressed={ship.id === selectedId}
                  data-ship={ship.id}
                  data-placed={placed}
                  onClick={() => selectShip(ship.id)}
                >
                  <span className={styles.shipName}>{ship.name}</span>
                  <span className={styles.pips} aria-hidden="true">
                    {Array.from({ length: ship.size }, (_, i) => (
                      <span key={i} className={styles.pip} />
                    ))}
                  </span>
                  <span className={styles.visuallyHidden}>
                    , {ship.size} squares{placed ? ", placed" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.toolbar}>
          <div className={styles.orientation} role="group" aria-label="Orientation">
            {ORIENTATIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.toggle}
                aria-pressed={orientation === option}
                data-orientation={option}
                onClick={() => chooseOrientation(option)}
              >
                {option === "horizontal" ? "Horizontal" : "Vertical"}
              </button>
            ))}
          </div>
          <span className={styles.hint}>Press R to rotate</span>
        </div>

        <div className={styles.footer}>
          <span data-testid="ships-placed">
            {placedCount} / {FLEET.length} ships placed
          </span>
          <button type="button" className={styles.clear} onClick={clearFleet} disabled={placedCount === 0}>
            Clear fleet
          </button>
        </div>
      </div>
    </Board>
  );
}
