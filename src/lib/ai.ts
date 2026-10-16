import type { ShotOutcome } from "./battleMessages";
import { BOARD_SIZE, parseCoord, toCoord } from "./fleet";

type Shots = ReadonlyMap<string, ShotOutcome>;

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

/**
 * Carthage's aim, using a simple hunt/target strategy. It only uses what a
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
  const open: string[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const coord = toCoord(col, row);
      if (!shots.has(coord)) {
        open.push(coord);
      }
    }
  }
  return open.length > 0 ? pick(open) : null;
}
