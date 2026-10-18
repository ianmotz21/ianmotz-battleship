import type { ShotOutcome } from "./battleMessages";
import { BOARD_SIZE, parseCoord, toCoord } from "./fleet";

type Shots = ReadonlyMap<string, ShotOutcome>;

export type Difficulty = "recruit" | "strategist" | "general";

export const DIFFICULTIES: { id: Difficulty; name: string; level: string; description: string }[] = [
  {
    id: "recruit",
    name: "Recruit",
    level: "Easy",
    description: "A green commander who fires mostly at random and rarely presses an advantage.",
  },
  {
    id: "strategist",
    name: "Strategist",
    level: "Medium",
    description: "Hunts at random, then closes in on every hit until the ship goes down.",
  },
  {
    id: "general",
    name: "General",
    level: "Hard",
    description: "Reads the sea, aims where your ships are most likely to hide, and never lets a wounded ship escape.",
  },
];

export function getDifficulty(id: Difficulty) {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id)!;
}

/** How often the Recruit follows up a hit instead of firing at random. */
const RECRUIT_FOLLOW_UP_CHANCE = 0.3;

const AXES = [
  [1, 0],
  [0, 1],
] as const;

/** The square `steps` away along a direction, or null if that is off the board. */
function step(coord: string, dCol: number, dRow: number): string | null {
  const { colIndex, rowIndex } = parseCoord(coord);
  const col = colIndex + dCol;
  const row = rowIndex + dRow;
  return col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE ? toCoord(col, row) : null;
}

function untriedSquares(shots: Shots): string[] {
  const open: string[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const coord = toCoord(col, row);
      if (!shots.has(coord)) {
        open.push(coord);
      }
    }
  }
  return open;
}

/** Hits on ships still afloat, oldest first. */
function openHitsOf(shots: Shots, sunkCells: ReadonlySet<string>): string[] {
  return [...shots.keys()].filter((coord) => shots.get(coord) === "hit" && !sunkCells.has(coord));
}

function neighboursOf(coord: string): string[] {
  return AXES.flatMap(([dCol, dRow]) => [step(coord, dCol, dRow), step(coord, -dCol, -dRow)]).filter(
    (next): next is string => next !== null,
  );
}

/**
 * Recruit (easy): fires at a random untried square. Now and then it remembers
 * a hit and tries a square next to it.
 */
export function pickRecruitTarget(
  shots: Shots,
  sunkCells: ReadonlySet<string>,
  random: () => number = Math.random,
): string | null {
  const pick = (options: string[]) => options[Math.floor(random() * options.length)];
  const openHits = openHitsOf(shots, sunkCells);
  if (openHits.length > 0 && random() < RECRUIT_FOLLOW_UP_CHANCE) {
    const neighbours = neighboursOf(pick(openHits)).filter((coord) => !shots.has(coord));
    if (neighbours.length > 0) {
      return pick(neighbours);
    }
  }
  const open = untriedSquares(shots);
  return open.length > 0 ? pick(open) : null;
}

/**
 * General (hard): imagines every way the ships still afloat could fit on the
 * board, given its misses, hits and sunk ships, and fires at the untried
 * square that the most of those layouts cover. While a ship is wounded it
 * only considers layouts through its open hits, strongly preferring ones that
 * pass through several hits, so it chases a hit ship down quickly.
 */
export function pickGeneralTarget(
  shots: Shots,
  sunkCells: ReadonlySet<string>,
  remainingShipSizes: readonly number[],
  random: () => number = Math.random,
): string | null {
  const openHits = new Set(openHitsOf(shots, sunkCells));
  const blocked = (coord: string) => shots.get(coord) === "miss" || sunkCells.has(coord);
  const scores = new Map<string, number>();

  for (const size of remainingShipSizes) {
    for (const [dCol, dRow] of AXES) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (col + dCol * (size - 1) >= BOARD_SIZE || row + dRow * (size - 1) >= BOARD_SIZE) {
            continue;
          }
          const cells = Array.from({ length: size }, (_, i) => toCoord(col + dCol * i, row + dRow * i));
          if (cells.some(blocked)) {
            continue;
          }
          const hitsCovered = cells.filter((coord) => openHits.has(coord)).length;
          if (openHits.size > 0 && hitsCovered === 0) {
            continue;
          }
          const weight = 10 ** hitsCovered;
          for (const coord of cells) {
            if (!shots.has(coord)) {
              scores.set(coord, (scores.get(coord) ?? 0) + weight);
            }
          }
        }
      }
    }
  }

  if (scores.size === 0) {
    return pickCarthageTarget(shots, sunkCells, random);
  }
  const best = Math.max(...scores.values());
  const top = [...scores.keys()].filter((coord) => scores.get(coord) === best);
  return top[Math.floor(random() * top.length)];
}

/** Carthage's next target for the chosen difficulty. */
export function pickTarget(
  difficulty: Difficulty,
  shots: Shots,
  sunkCells: ReadonlySet<string>,
  remainingShipSizes: readonly number[],
  random: () => number = Math.random,
): string | null {
  if (difficulty === "recruit") {
    return pickRecruitTarget(shots, sunkCells, random);
  }
  if (difficulty === "general") {
    return pickGeneralTarget(shots, sunkCells, remainingShipSizes, random);
  }
  return pickCarthageTarget(shots, sunkCells, random);
}

/**
 * Strategist (medium). Carthage's aim, using a simple hunt/target strategy. It only uses what a
 * human player could see: its own hits and misses, and which ships are sunk.
 *
 * - Target: if a ship has been hit but not sunk, and two or more hits line up,
 *   fire at either end of that line. Otherwise fire next to a hit.
 * - Hunt: with no unfinished hits, fire at a random untried square.
 */
export function pickCarthageTarget(
  shots: Shots,
  sunkCells: ReadonlySet<string>,
  random: () => number = Math.random,
): string | null {
  const untried = (coord: string | null): coord is string => coord !== null && !shots.has(coord);
  const isOpenHit = (coord: string | null): coord is string =>
    coord !== null && shots.get(coord) === "hit" && !sunkCells.has(coord);
  const pick = (options: string[]) => options[Math.floor(random() * options.length)];

  // Hits on ships still afloat, oldest first, so one ship is finished at a time.
  const openHits = [...shots.keys()].filter(isOpenHit);

  // Target mode, part 1: follow a line of hits to whichever end is still open.
  for (const hit of openHits) {
    for (const [dCol, dRow] of AXES) {
      if (!isOpenHit(step(hit, dCol, dRow)) && !isOpenHit(step(hit, -dCol, -dRow))) {
        continue;
      }
      const ends: string[] = [];
      for (const sign of [1, -1]) {
        let next = step(hit, dCol * sign, dRow * sign);
        while (isOpenHit(next)) {
          next = step(next, dCol * sign, dRow * sign);
        }
        if (untried(next)) {
          ends.push(next);
        }
      }
      if (ends.length > 0) {
        return pick(ends);
      }
    }
  }

  // Target mode, part 2: no line to follow, so try the squares around a hit.
  for (const hit of openHits) {
    const neighbours = AXES.flatMap(([dCol, dRow]) => [step(hit, dCol, dRow), step(hit, -dCol, -dRow)]).filter(
      untried,
    );
    if (neighbours.length > 0) {
      return pick(neighbours);
    }
  }

  // Hunt mode.
  const open = untriedSquares(shots);
  return open.length > 0 ? pick(open) : null;
}
