"use client";

import { useEffect, useRef, useState } from "react";
import Board, { type Dispatch, type Shots, type Side } from "@/components/Board";
import PlayerFleet from "@/components/PlayerFleet";
import { pickBattleMessage, type ShotOutcome } from "@/lib/battleMessages";
import { BOARD_SIZE, FLEET, randomPlacements, shipAt, toCoord, type Placements } from "@/lib/fleet";
import styles from "./Game.module.css";

/** Pause before Carthage fires back, so each turn is easy to follow. */
const CARTHAGE_DELAY_MS = 900;

function addShot(shots: Shots, coord: string, outcome: ShotOutcome): Shots {
  const next = new Map(shots);
  next.set(coord, outcome);
  return next;
}

function countHits(shots: Shots): number {
  return [...shots.values()].filter((outcome) => outcome === "hit").length;
}

function nextDispatch(previous: Dispatch | null, attacker: Side, outcome: ShotOutcome): Dispatch {
  return {
    id: (previous?.id ?? 0) + 1,
    text: pickBattleMessage(attacker, outcome, previous?.text),
    outcome,
  };
}

/** Carthage's aim: a random square it hasn't fired at yet. */
function pickCarthageTarget(shots: Shots): string | null {
  const open: string[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const coord = toCoord(col, row);
      if (!shots.has(coord)) {
        open.push(coord);
      }
    }
  }
  return open.length > 0 ? open[Math.floor(Math.random() * open.length)] : null;
}

export default function Game() {
  const [romanShips, setRomanShips] = useState<Placements>({});
  const [shotsAtCarthage, setShotsAtCarthage] = useState<Shots>(() => new Map());
  const [shotsAtRome, setShotsAtRome] = useState<Shots>(() => new Map());
  const [turn, setTurn] = useState<Side>("rome");
  const [carthageDispatch, setCarthageDispatch] = useState<Dispatch | null>(null);
  const [romeDispatch, setRomeDispatch] = useState<Dispatch | null>(null);

  // Carthage's hidden fleet. Kept in a ref because nothing on screen shows it.
  const carthageShipsRef = useRef<Placements>({});
  // Flips instantly on click, so two very fast clicks can't both fire in one turn.
  const romeMayFireRef = useRef(true);

  // Placed in the browser after the page loads, so each visit gets a new layout.
  useEffect(() => {
    carthageShipsRef.current = randomPlacements();
  }, []);

  const fleetReady = FLEET.every((ship) => romanShips[ship.id]);
  const battleStarted = shotsAtCarthage.size > 0;

  function handleRomeAttack(coord: string) {
    if (!fleetReady || turn !== "rome" || !romeMayFireRef.current || shotsAtCarthage.has(coord)) {
      return;
    }
    romeMayFireRef.current = false;

    const outcome: ShotOutcome = shipAt(carthageShipsRef.current, coord) ? "hit" : "miss";
    setShotsAtCarthage(addShot(shotsAtCarthage, coord, outcome));
    setCarthageDispatch(nextDispatch(carthageDispatch, "rome", outcome));
    setTurn("carthage");
  }

  // Carthage's turn: after a short pause it fires once at the Roman fleet,
  // using the same hit check, then hands the turn back to Rome.
  useEffect(() => {
    if (turn !== "carthage") {
      return;
    }
    const timer = setTimeout(() => {
      const target = pickCarthageTarget(shotsAtRome);
      if (target) {
        const outcome: ShotOutcome = shipAt(romanShips, target) ? "hit" : "miss";
        setShotsAtRome(addShot(shotsAtRome, target, outcome));
        setRomeDispatch(nextDispatch(romeDispatch, "carthage", outcome));
      }
      romeMayFireRef.current = true;
      setTurn("rome");
    }, CARTHAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [turn, shotsAtRome, romanShips, romeDispatch]);

  let phase: "setup" | Side;
  let turnText: string;
  if (!fleetReady) {
    phase = "setup";
    turnText = "Place all five Roman ships to begin the battle.";
  } else if (turn === "carthage") {
    phase = "carthage";
    turnText = "Carthage is taking aim…";
  } else {
    phase = "rome";
    turnText = battleStarted
      ? "Your move: fire on the Carthaginian fleet."
      : "The fleet is ready. Fire on the Carthaginian fleet to begin.";
  }

  return (
    <div className={styles.game}>
      <p className={styles.turn} aria-live="polite" data-testid="turn-status" data-turn={phase}>
        {turnText}
      </p>

      <div className={styles.boards}>
        <PlayerFleet
          placements={romanShips}
          onPlacementsChange={setRomanShips}
          locked={battleStarted}
          shots={shotsAtRome}
          dispatch={romeDispatch}
          status={
            <>
              Carthage&apos;s shots: <span data-testid="enemy-shots">{shotsAtRome.size}</span>
              {" · "}
              Hits taken: <span data-testid="hits-taken">{countHits(shotsAtRome)}</span>
            </>
          }
        />
        <div className={styles.versus} aria-hidden="true">
          <span className={styles.versusLine} />
          <span className={styles.versusText}>contra</span>
          <span className={styles.versusLine} />
        </div>
        <Board
          side="carthage"
          title="Carthaginian Fleet"
          motto="Qart-ḥadašt"
          shots={shotsAtCarthage}
          onAttack={handleRomeAttack}
          attackDisabled={!fleetReady || turn !== "rome"}
          status={
            <>
              Shots fired: <span data-testid="shots-fired">{shotsAtCarthage.size}</span>
              {" · "}
              Hits: <span data-testid="hits">{countHits(shotsAtCarthage)}</span>
            </>
          }
          dispatch={carthageDispatch}
        >
          <p className={styles.note}>Five Carthaginian warships lie hidden in these waters.</p>
        </Board>
      </div>
    </div>
  );
}
