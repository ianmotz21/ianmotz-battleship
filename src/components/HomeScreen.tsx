"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DIFFICULTIES, getDifficulty, type Difficulty } from "@/lib/ai";
import { FLEET } from "@/lib/fleet";
import {
  accuracy,
  clearRecords,
  getRecords,
  getServerRecords,
  subscribeRecords,
  topVictories,
  winLossRecord,
} from "@/lib/leaderboard";
import styles from "./HomeScreen.module.css";

type View = "menu" | "leaderboard" | "howto";

type HomeScreenProps = {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStart: () => void;
};

const RANKS: Record<Difficulty, number> = { recruit: 1, strategist: 2, general: 3 };

export default function HomeScreen({ difficulty, onDifficultyChange, onStart }: HomeScreenProps) {
  const [view, setView] = useState<View>("menu");

  return (
    <section className={styles.home} data-testid="home-screen" data-view={view}>
      {view === "menu" && (
        <div className={styles.card}>
          <fieldset className={styles.difficulty}>
            <legend className={styles.legend}>Choose your adversary</legend>
            <div className={styles.options}>
              {DIFFICULTIES.map((option) => (
                <label key={option.id} className={styles.option} data-difficulty={option.id}>
                  <input
                    type="radio"
                    name="difficulty"
                    value={option.id}
                    checked={difficulty === option.id}
                    onChange={() => onDifficultyChange(option.id)}
                    className={styles.radio}
                  />
                  <span className={styles.optionLevel}>{option.level}</span>
                  <span className={styles.optionName}>{option.name}</span>
                  <span className={styles.rank} aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={n <= RANKS[option.id] ? styles.pipOn : styles.pip} />
                    ))}
                  </span>
                  <span className={styles.optionText}>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" className={styles.start} onClick={onStart} data-testid="start-battle">
            Start Battle
          </button>
          <p className={styles.startNote}>
            Facing the Carthaginian <strong>{getDifficulty(difficulty).name}</strong>
          </p>

          <div className={styles.secondary}>
            <button type="button" className={styles.link} onClick={() => setView("leaderboard")}>
              Leaderboard
            </button>
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <button type="button" className={styles.link} onClick={() => setView("howto")}>
              How to Play
            </button>
          </div>
        </div>
      )}

      {view === "leaderboard" && (
        <Panel title="Leaderboard" subtitle="Tabula Victoriarum" onBack={() => setView("menu")}>
          <Leaderboard />
        </Panel>
      )}

      {view === "howto" && (
        <Panel title="How to Play" subtitle="Ars Navalis" onBack={() => setView("menu")}>
          <HowToPlay />
        </Panel>
      )}
    </section>
  );
}

function Panel({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.card}>
      <p className={styles.panelEyebrow}>{subtitle}</p>
      <h2 ref={headingRef} tabIndex={-1} className={styles.panelTitle}>
        {title}
      </h2>
      <div className={styles.panelBody}>{children}</div>
      <button type="button" className={styles.back} onClick={onBack}>
        ← Back to menu
      </button>
    </div>
  );
}

function Leaderboard() {
  const records = useSyncExternalStore(subscribeRecords, getRecords, getServerRecords);
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const best = topVictories(records, filter);
  const { wins, losses } = winLossRecord(records, filter);

  function handleClear() {
    if (window.confirm("Erase every result saved in this browser?")) {
      clearRecords();
    }
  }

  return (
    <>
      <div className={styles.tabs} role="group" aria-label="Filter by difficulty">
        {(["all", ...DIFFICULTIES.map((d) => d.id)] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tab}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {id === "all" ? "All" : getDifficulty(id).name}
          </button>
        ))}
      </div>

      <p className={styles.record} data-testid="win-loss">
        <span className={styles.wins}>{wins}</span> {wins === 1 ? "victory" : "victories"} ·{" "}
        <span className={styles.losses}>{losses}</span> {losses === 1 ? "defeat" : "defeats"}
      </p>

      {best.length === 0 ? (
        <p className={styles.empty}>
          No victories recorded yet. Sink the Carthaginian fleet to carve your name here.
        </p>
      ) : (
        <table className={styles.table} data-testid="leaderboard-table">
          <caption className={styles.caption}>Best victories, fewest shots first</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Shots</th>
              <th scope="col">Accuracy</th>
              <th scope="col">Adversary</th>
              <th scope="col">Ships lost</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {best.map((r, i) => (
              <tr key={r.id}>
                <td>{toRoman(i + 1)}</td>
                <td>{r.shots}</td>
                <td>{accuracy(r)}%</td>
                <td>{getDifficulty(r.difficulty).name}</td>
                <td>
                  {r.shipsLost} / {FLEET.length}
                </td>
                <td>{new Date(r.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={styles.footnote}>
        Results are saved in this browser only.
        {records.length > 0 && (
          <>
            {" "}
            <button type="button" className={styles.clear} onClick={handleClear}>
              Clear results
            </button>
          </>
        )}
      </p>
    </>
  );
}

function HowToPlay() {
  return (
    <ol className={styles.rules}>
      <li>
        <strong>Choose your adversary.</strong> Pick Recruit, Strategist or General on the main menu, then press
        Start Battle.
      </li>
      <li>
        <strong>Deploy the Roman fleet.</strong> Choose a ship, set it Horizontal or Vertical (or press R), then click a
        square on your board. Your five ships ({FLEET.map((s) => `${s.name} ${s.size}`).join(", ")}) may not overlap or
        leave the board.
      </li>
      <li>
        <strong>Fire on Carthage.</strong> Click a square on the Carthaginian board. A burning marker means a hit; a
        splash means a miss. You can never fire at the same square twice.
      </li>
      <li>
        <strong>Take turns.</strong> After each of your shots, Carthage fires back at your fleet.
      </li>
      <li>
        <strong>Sink their ships.</strong> A ship sinks once every one of its squares is hit, and the battle announces
        it.
      </li>
      <li>
        <strong>Win the war.</strong> Sink all five enemy ships before Carthage sinks yours. The fewer shots you need,
        the higher you rank on the leaderboard.
      </li>
    </ol>
  );
}

function toRoman(n: number): string {
  const numerals: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [value, numeral] of numerals) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}
