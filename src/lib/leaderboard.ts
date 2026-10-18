import { DIFFICULTIES, type Difficulty } from "./ai";

export type GameRecord = {
  id: string;
  result: "victory" | "defeat";
  difficulty: Difficulty;
  /** Shots Rome fired. */
  shots: number;
  /** Rome's hits on the Carthaginian fleet. */
  hits: number;
  /** Roman ships sunk by Carthage. */
  shipsLost: number;
  playedAt: number;
};

const STORAGE_KEY = "bellum-punicum:leaderboard";
const MAX_RECORDS = 200;
const NO_RECORDS: GameRecord[] = [];

let records: GameRecord[] | null = null;
const listeners = new Set<() => void>();

function isRecord(value: unknown): value is GameRecord {
  const r = value as GameRecord;
  return (
    typeof r === "object" &&
    r !== null &&
    (r.result === "victory" || r.result === "defeat") &&
    DIFFICULTIES.some((d) => d.id === r.difficulty) &&
    [r.shots, r.hits, r.shipsLost, r.playedAt].every((n) => typeof n === "number")
  );
}

/** Every finished game saved in this browser, oldest first. */
export function getRecords(): GameRecord[] {
  if (records === null) {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      records = Array.isArray(saved) ? saved.filter(isRecord) : [];
    } catch {
      records = [];
    }
  }
  return records;
}

export function getServerRecords(): GameRecord[] {
  return NO_RECORDS;
}

function save(next: GameRecord[]) {
  records = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (e.g. private mode); results just won't persist.
  }
  listeners.forEach((listener) => listener());
}

export function addRecord(record: Omit<GameRecord, "id" | "playedAt">) {
  // Re-read storage first: another tab may have saved a result since this tab
  // last looked, and saving a stale copy would erase it.
  records = null;
  const playedAt = Date.now();
  const id = `${playedAt}-${Math.random().toString(36).slice(2, 8)}`;
  save([...getRecords(), { ...record, id, playedAt }].slice(-MAX_RECORDS));
}

export function clearRecords() {
  save([]);
}

export function subscribeRecords(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function accuracy(record: Pick<GameRecord, "shots" | "hits">): number {
  return record.shots ? Math.round((record.hits / record.shots) * 100) : 0;
}

/** Best victories first: fewest shots, then the earliest to set that mark. */
export function topVictories(all: GameRecord[], difficulty: Difficulty | "all", limit = 10): GameRecord[] {
  return all
    .filter((r) => r.result === "victory" && (difficulty === "all" || r.difficulty === difficulty))
    .sort((a, b) => a.shots - b.shots || a.playedAt - b.playedAt)
    .slice(0, limit);
}

export function winLossRecord(all: GameRecord[], difficulty: Difficulty | "all") {
  const games = all.filter((r) => difficulty === "all" || r.difficulty === difficulty);
  const wins = games.filter((r) => r.result === "victory").length;
  return { wins, losses: games.length - wins };
}
