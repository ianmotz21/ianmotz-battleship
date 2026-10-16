"use client";

import { useEffect, useRef, useState } from "react";
import Celebration from "@/components/Celebration";
import Board, { type Dispatch, type Shots, type Side } from "@/components/Board";
import PlayerFleet from "@/components/PlayerFleet";
import { pickCarthageTarget } from "@/lib/ai";
import { pickBattleMessage, type ShotOutcome } from "@/lib/battleMessages";
import { playGameOver, playShipSunk, playShot } from "@/lib/sound";
import {
  FLEET,
  fireShot,
  getShip,
  randomPlacements,
  sunkShipIds,
  type Placements,
  type ShipId,
} from "@/lib/fleet";
import styles from "./Game.module.css";

/** Pause before Carthage fires back, so each turn is easy to follow. */
const CARTHAGE_DELAY_MS = 900;

function countHits(shots: Shots): number {
  return [...shots.values()].filter((outcome) => outcome === "hit").length;
}

function nextDispatch(
  previous: Dispatch | null,
  attacker: Side,
  outcome: ShotOutcome,
  headline?: string,
): Dispatch {
  return {
    id: (previous?.id ?? 0) + 1,
    text: pickBattleMessage(attacker, outcome, previous?.text),
    outcome,
    headline,
  };
}

/** Only the ships that have been sunk, so the rest stay hidden. */
function onlyShips(ships: Placements, ids: ShipId[]): Placements {
  return Object.fromEntries(ids.map((id) => [id, ships[id]]));
}

/** Each "Play again" swaps in a brand-new Battle, which starts from scratch. */
export default function Game() {
  const [gameNumber, setGameNumber] = useState(1);
  return <Battle key={gameNumber} onPlayAgain={() => setGameNumber((n) => n + 1)} />;
}

function Battle({ onPlayAgain }: { onPlayAgain: () => void }) {
  const [romanShips, setRomanShips] = useState<Placements>({});
  const [shotsAtCarthage, setShotsAtCarthage] = useState<Shots>(() => new Map());
  const [shotsAtRome, setShotsAtRome] = useState<Shots>(() => new Map());
  const [turn, setTurn] = useState<Side>("rome");
  const [winner, setWinner] = useState<Side | null>(null);
  const [carthageDispatch, setCarthageDispatch] = useState<Dispatch | null>(null);
  const [romeDispatch, setRomeDispatch] = useState<Dispatch | null>(null);
  // Carthaginian ships the player is allowed to see: sunk ones, or all once the game ends.
  const [revealedCarthage, setRevealedCarthage] = useState<Placements>({});

  // Carthage's hidden fleet. Kept in a ref because nothing on screen shows it.
  const carthageShipsRef = useRef<Placements>({});
  // Flips instantly on click, so two very fast clicks can't both fire in one turn.
  const romeMayFireRef = useRef(true);
  const playAgainRef = useRef<HTMLButtonElement>(null);

  // Placed in the browser after the page loads, so each game gets a new layout.
  useEffect(() => {
    carthageShipsRef.current = randomPlacements();
  }, []);

  useEffect(() => {
    if (winner) {
      playAgainRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      playAgainRef.current?.focus({ preventScroll: true });
    }
  }, [winner]);

  const fleetReady = FLEET.every((ship) => romanShips[ship.id]);
  const battleStarted = shotsAtCarthage.size > 0;
  const carthageSunk = sunkShipIds(revealedCarthage, shotsAtCarthage);
  const romeSunk = sunkShipIds(romanShips, shotsAtRome);

  function handleRomeAttack(coord: string) {
    if (!fleetReady || winner || turn !== "rome" || !romeMayFireRef.current) {
      return;
    }
    const carthageShips = carthageShipsRef.current;
    const result = fireShot(carthageShips, shotsAtCarthage, coord);
    if (!result) {
      return;
    }
    romeMayFireRef.current = false;

    const { outcome, shots, sunkShipId: sunkId, allSunk } = result;
    playShot("rome", outcome);

    setShotsAtCarthage(shots);
    setCarthageDispatch(
      nextDispatch(carthageDispatch, "rome", outcome, sunkId && `You sank Carthage's ${getShip(sunkId).name}!`),
    );
    if (allSunk) {
      playGameOver("victory");
      setRevealedCarthage(carthageShips);
      setWinner("rome");
    } else {
      if (sunkId) {
        playShipSunk("carthage");
        setRevealedCarthage(onlyShips(carthageShips, sunkShipIds(carthageShips, shots)));
      }
      setTurn("carthage");
    }
  }

  // Carthage's turn: after a short pause it fires once at the Roman fleet,
  // using the same hit check, then hands the turn back to Rome.
  useEffect(() => {
    if (turn !== "carthage" || winner) {
      return;
    }
    const timer = setTimeout(() => {
      const sunkCells = new Set(
        sunkShipIds(romanShips, shotsAtRome).flatMap((id) => romanShips[id]?.cells ?? []),
      );
      const target = pickCarthageTarget(shotsAtRome, sunkCells);
      const result = target ? fireShot(romanShips, shotsAtRome, target) : null;
      if (result) {
        const { outcome, shots, sunkShipId: sunkId, allSunk } = result;
        playShot("carthage", outcome);
        setShotsAtRome(shots);
        setRomeDispatch(
          nextDispatch(romeDispatch, "carthage", outcome, sunkId && `Carthage sank your ${getShip(sunkId).name}!`),
        );
        if (sunkId && !allSunk) {
          playShipSunk("rome");
        }
        if (allSunk) {
          playGameOver("defeat");
          setRevealedCarthage(carthageShipsRef.current);
          setWinner("carthage");
          return;
        }
      }
      romeMayFireRef.current = true;
      setTurn("rome");
    }, CARTHAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [turn, winner, shotsAtRome, romanShips, romeDispatch]);

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

  const romeHits = countHits(shotsAtCarthage);
  const accuracy = shotsAtCarthage.size ? Math.round((romeHits / shotsAtCarthage.size) * 100) : 0;

  return (
    <div className={styles.game}>
      {winner && <Celebration result={winner === "rome" ? "victory" : "defeat"} />}
      {winner ? (
        <section
          className={`${styles.result} ${winner === "rome" ? styles.victory : styles.defeat}`}
          aria-live="assertive"
          data-testid="game-result"
          data-result={winner === "rome" ? "victory" : "defeat"}
        >
          <p className={styles.resultEyebrow}>{winner === "rome" ? "Roma Victrix" : "Vae Victis"}</p>
          <h2 className={styles.resultTitle}>{winner === "rome" ? "Victory" : "Defeat"}</h2>
          <p className={styles.resultText}>
            {winner === "rome"
              ? "Carthage's fleet lies at the bottom of the Mediterranean. Scipio salutes you, Admiral."
              : "Hannibal's ships have sent the Roman fleet to the depths. Carthage rules the sea today."}
          </p>
          <p className={styles.resultStats}>
            {shotsAtCarthage.size} shots · {romeHits} hits · {accuracy}% accuracy · {carthageSunk.length} of{" "}
            {FLEET.length} Carthaginian ships sunk
          </p>
          <button ref={playAgainRef} type="button" className={styles.playAgain} onClick={onPlayAgain}>
            Play again
          </button>
        </section>
      ) : (
        <p className={styles.turn} aria-live="polite" data-testid="turn-status" data-turn={phase}>
          {turnText}
        </p>
      )}

      <div className={styles.boards}>
        <PlayerFleet
          placements={romanShips}
          onPlacementsChange={setRomanShips}
          locked={battleStarted}
          shots={shotsAtRome}
          sunk={romeSunk}
          dispatch={romeDispatch}
          status={
            <>
              Carthage&apos;s shots: <span data-testid="enemy-shots">{shotsAtRome.size}</span>
              {" · "}
              Hits taken: <span data-testid="hits-taken">{countHits(shotsAtRome)}</span>
              {" · "}
              Ships lost: <span data-testid="ships-lost">{romeSunk.length}</span>
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
          ships={revealedCarthage}
          sunk={carthageSunk}
          shots={shotsAtCarthage}
          onAttack={handleRomeAttack}
          attackDisabled={!fleetReady || winner !== null || turn !== "rome"}
          status={
            <>
              Shots fired: <span data-testid="shots-fired">{shotsAtCarthage.size}</span>
              {" · "}
              Hits: <span data-testid="hits">{romeHits}</span>
              {" · "}
              Sunk: <span data-testid="sunk-count">{carthageSunk.length}</span>
            </>
          }
          dispatch={carthageDispatch}
        >
          <p className={styles.note}>
            {winner ? "The Carthaginian fleet, revealed." : "Five Carthaginian warships lie hidden in these waters."}
          </p>
        </Board>
      </div>
    </div>
  );
}
