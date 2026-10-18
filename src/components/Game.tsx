"use client";

import { useEffect, useRef, useState } from "react";
import Celebration from "@/components/Celebration";
import Board, { coordLabel, type Dispatch, type Shots, type Side } from "@/components/Board";
import HomeScreen from "@/components/HomeScreen";
import PlayerFleet from "@/components/PlayerFleet";
import { getDifficulty, pickTarget, type Difficulty } from "@/lib/ai";
import { addRecord } from "@/lib/leaderboard";
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
const CARTHAGE_DELAY_MS = 1500;

/**
 * On phones only one board shows at a time. After a shot, the view lingers on
 * the board that was hit so the result can be seen, then moves to where the
 * next shot will land.
 */
const FOLLOW_ROME_SHOT_MS = 700;
const FOLLOW_CARTHAGE_SHOT_MS = 900;
const FOLLOW_FLEET_READY_MS = 600;

type LastShot = {
  id: number;
  by: Side;
  coord: string;
  outcome: ShotOutcome;
  sunkName?: string;
};

function describeShot({ by, coord, outcome, sunkName }: LastShot): string {
  const at = coordLabel(coord);
  if (by === "rome") {
    return sunkName ? `${at}: you sank Carthage's ${sunkName}!` : `Your shot at ${at}: ${outcome === "hit" ? "hit!" : "miss."}`;
  }
  return sunkName ? `${at}: Carthage sank your ${sunkName}!` : `Carthage fired at ${at}: ${outcome === "hit" ? "hit!" : "miss."}`;
}

function nextShot(previous: LastShot | null, shot: Omit<LastShot, "id">): LastShot {
  return { id: (previous?.id ?? 0) + 1, ...shot };
}

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

/**
 * Shows the home screen, then the battle. Each "Play again" swaps in a
 * brand-new Battle, which starts from scratch.
 */
export default function Game() {
  const [screen, setScreen] = useState<"home" | "battle">("home");
  const [difficulty, setDifficulty] = useState<Difficulty>("strategist");
  const [gameNumber, setGameNumber] = useState(1);

  function startBattle() {
    setGameNumber((n) => n + 1);
    setScreen("battle");
  }

  if (screen === "home") {
    return <HomeScreen difficulty={difficulty} onDifficultyChange={setDifficulty} onStart={startBattle} />;
  }
  return (
    <Battle
      key={gameNumber}
      difficulty={difficulty}
      onPlayAgain={startBattle}
      onMainMenu={() => setScreen("home")}
    />
  );
}

type BattleProps = {
  difficulty: Difficulty;
  onPlayAgain: () => void;
  onMainMenu: () => void;
};

function Battle({ difficulty, onPlayAgain, onMainMenu }: BattleProps) {
  const [romanShips, setRomanShips] = useState<Placements>({});
  const [shotsAtCarthage, setShotsAtCarthage] = useState<Shots>(() => new Map());
  const [shotsAtRome, setShotsAtRome] = useState<Shots>(() => new Map());
  const [turn, setTurn] = useState<Side>("rome");
  const [winner, setWinner] = useState<Side | null>(null);
  const [carthageDispatch, setCarthageDispatch] = useState<Dispatch | null>(null);
  const [romeDispatch, setRomeDispatch] = useState<Dispatch | null>(null);
  // Carthaginian ships the player is allowed to see: sunk ones, or all once the game ends.
  const [revealedCarthage, setRevealedCarthage] = useState<Placements>({});
  const [lastShot, setLastShot] = useState<LastShot | null>(null);
  // Phone layout: the board the game is following, plus a board the player
  // picked by hand, which holds until the game moves the view on again.
  const [autoView, setAutoView] = useState<Side>("rome");
  const [chosenView, setChosenView] = useState<{ view: Side; during: Side } | null>(null);

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
  const view = chosenView && chosenView.during === autoView ? chosenView.view : autoView;

  useEffect(() => {
    if (winner) {
      return;
    }
    let next: Side = "carthage";
    let delay = battleStarted ? FOLLOW_CARTHAGE_SHOT_MS : FOLLOW_FLEET_READY_MS;
    if (!fleetReady) {
      next = "rome";
      delay = 0;
    } else if (turn === "carthage") {
      next = "rome";
      delay = FOLLOW_ROME_SHOT_MS;
    }
    const timer = setTimeout(() => setAutoView(next), delay);
    return () => clearTimeout(timer);
  }, [fleetReady, turn, winner, battleStarted]);

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
    setLastShot((previous) =>
      nextShot(previous, { by: "rome", coord, outcome, sunkName: sunkId ? getShip(sunkId).name : undefined }),
    );

    setShotsAtCarthage(shots);
    setCarthageDispatch(
      nextDispatch(carthageDispatch, "rome", outcome, sunkId && `You sank Carthage's ${getShip(sunkId).name}!`),
    );
    if (allSunk) {
      playGameOver("victory");
      addRecord({
        result: "victory",
        difficulty,
        shots: shots.size,
        hits: countHits(shots),
        shipsLost: sunkShipIds(romanShips, shotsAtRome).length,
      });
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
      const afloat = FLEET.filter((ship) => !sunkShipIds(romanShips, shotsAtRome).includes(ship.id));
      const target = pickTarget(
        difficulty,
        shotsAtRome,
        sunkCells,
        afloat.map((ship) => ship.size),
      );
      const result = target ? fireShot(romanShips, shotsAtRome, target) : null;
      if (result && target) {
        const { outcome, shots, sunkShipId: sunkId, allSunk } = result;
        playShot("carthage", outcome);
        setLastShot((previous) =>
          nextShot(previous, {
            by: "carthage",
            coord: target,
            outcome,
            sunkName: sunkId ? getShip(sunkId).name : undefined,
          }),
        );
        setShotsAtRome(shots);
        setRomeDispatch(
          nextDispatch(romeDispatch, "carthage", outcome, sunkId && `Carthage sank your ${getShip(sunkId).name}!`),
        );
        if (sunkId && !allSunk) {
          playShipSunk("rome");
        }
        if (allSunk) {
          playGameOver("defeat");
          addRecord({
            result: "defeat",
            difficulty,
            shots: shotsAtCarthage.size,
            hits: countHits(shotsAtCarthage),
            shipsLost: FLEET.length,
          });
          setRevealedCarthage(carthageShipsRef.current);
          setWinner("carthage");
          return;
        }
      }
      romeMayFireRef.current = true;
      setTurn("rome");
    }, CARTHAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [turn, winner, shotsAtRome, romanShips, romeDispatch, difficulty, shotsAtCarthage]);

  function handleMainMenu() {
    if (battleStarted && !winner && !window.confirm("Abandon this battle and return to the main menu?")) {
      return;
    }
    onMainMenu();
  }

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

  const adversary = getDifficulty(difficulty);

  let attention: Side | null = null;
  if (!winner && !fleetReady && view !== "rome") {
    attention = "rome";
  } else if (!winner && fleetReady && turn === "rome" && view !== "carthage") {
    attention = "carthage";
  }

  return (
    <div className={styles.game}>
      <div className={styles.bar}>
        <p className={styles.adversary} data-testid="adversary" data-difficulty={difficulty}>
          Adversary: <strong>{adversary.name}</strong> <span>({adversary.level})</span>
        </p>
        {!winner && (
          <button type="button" className={styles.menuButton} onClick={handleMainMenu}>
            Main menu
          </button>
        )}
      </div>
      {winner && <Celebration result={winner === "rome" ? "victory" : "defeat"} />}
      {winner && (
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
            {FLEET.length} Carthaginian ships sunk · vs. {adversary.name}
          </p>
          <div className={styles.resultActions}>
            <button ref={playAgainRef} type="button" className={styles.playAgain} onClick={onPlayAgain}>
              Play again
            </button>
            <button type="button" className={styles.menuButton} onClick={onMainMenu}>
              Main menu
            </button>
          </div>
        </section>
      )}
      <div className={styles.hud} data-testid="battle-hud">
        {!winner && (
          <p className={styles.turn} aria-live="polite" data-testid="turn-status" data-turn={phase}>
            {turnText}
          </p>
        )}
        <div className={styles.tabs} role="group" aria-label="Board to show">
          {(["rome", "carthage"] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={styles.tab}
              aria-pressed={view === side}
              data-side={side}
              data-testid={`board-tab-${side}`}
              data-attention={attention === side || undefined}
              onClick={() => setChosenView({ view: side, during: autoView })}
            >
              <span className={styles.tabName}>{side === "rome" ? "Roman Fleet" : "Carthaginian Fleet"}</span>
              <span className={styles.tabBadge}>
                {side === "rome"
                  ? `Lost ${romeSunk.length}/${FLEET.length}`
                  : `Sunk ${carthageSunk.length}/${FLEET.length} · ${shotsAtCarthage.size} shots`}
              </span>
            </button>
          ))}
        </div>
        {lastShot && (
          <p
            className={styles.feedback}
            aria-live="polite"
            data-testid="latest-feedback"
            data-by={lastShot.by}
            data-outcome={lastShot.outcome}
            data-sunk={lastShot.sunkName ? true : undefined}
          >
            <span key={lastShot.id}>{describeShot(lastShot)}</span>
          </p>
        )}
      </div>

      <div className={styles.boards} data-view={view} data-testid="boards">
        <div className={styles.slot} data-side="rome">
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
        </div>
        <div className={styles.versus} aria-hidden="true">
          <span className={styles.versusLine} />
          <span className={styles.versusText}>contra</span>
          <span className={styles.versusLine} />
        </div>
        <div className={styles.slot} data-side="carthage">
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
    </div>
  );
}
