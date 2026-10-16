import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pickCarthageTarget } from "./ai";
import { checkPlacement, FLEET, fireShot, getShip, randomPlacements, type Placements } from "./fleet";

// A fixed fleet, so every test knows exactly where the ships are.
// Rows 1, 3, 5, 7 and 9, each ship starting in column A.
const FIXED_FLEET: Placements = {
  quinquereme: { cells: ["A1", "B1", "C1", "D1", "E1"], orientation: "horizontal" },
  quadrireme: { cells: ["A3", "B3", "C3", "D3"], orientation: "horizontal" },
  trireme: { cells: ["A5", "B5", "C5"], orientation: "horizontal" },
  bireme: { cells: ["A7", "B7", "C7"], orientation: "horizontal" },
  liburna: { cells: ["A9", "B9"], orientation: "horizontal" },
};
const ALL_SHIP_CELLS = Object.values(FIXED_FLEET).flatMap((ship) => ship!.cells);

/** Fires a list of shots in order and returns the result of the last one. */
function fireAll(coords: string[]) {
  let shots = new Map<string, "hit" | "miss">();
  let last = null;
  for (const coord of coords) {
    last = fireShot(FIXED_FLEET, shots, coord);
    assert.ok(last, `${coord} should be a new shot`);
    shots = last.shots;
  }
  return last!;
}

describe("shots", () => {
  test("a shot on a ship square is a hit, a shot on open water is a miss", () => {
    assert.equal(fireShot(FIXED_FLEET, new Map(), "C1")?.outcome, "hit");
    assert.equal(fireShot(FIXED_FLEET, new Map(), "C2")?.outcome, "miss");
  });

  test("the same square cannot be fired at twice", () => {
    const first = fireShot(FIXED_FLEET, new Map(), "J10");
    assert.ok(first);
    assert.equal(fireShot(FIXED_FLEET, first.shots, "J10"), null);
    assert.equal(first.shots.size, 1);
  });

  test("firing never changes the previous list of shots", () => {
    const before = new Map<string, "hit" | "miss">();
    fireShot(FIXED_FLEET, before, "A1");
    assert.equal(before.size, 0);
  });
});

describe("sinking and winning", () => {
  test("a ship sinks only when its last square is hit", () => {
    assert.equal(fireAll(["A9"]).sunkShipId, undefined);
    assert.equal(fireAll(["A9", "B9"]).sunkShipId, "liburna");
  });

  test("the game is won only when every ship square has been hit", () => {
    const allButOne = fireAll(ALL_SHIP_CELLS.slice(0, -1));
    assert.equal(allButOne.allSunk, false);

    const everything = fireAll(ALL_SHIP_CELLS);
    assert.equal(everything.allSunk, true);
    assert.equal(ALL_SHIP_CELLS.length, 17);
  });

  test("misses never count towards sinking", () => {
    const result = fireAll(["J1", "J2", "J3", "J4", "J5"]);
    assert.equal(result.sunkShipId, undefined);
    assert.equal(result.allSunk, false);
  });
});

describe("ship placement", () => {
  test("ships cannot overlap or run off the board", () => {
    assert.equal(checkPlacement(FIXED_FLEET, getShip("trireme"), "B2", "vertical").ok, false);
    assert.equal(checkPlacement({}, getShip("quinquereme"), "H1", "horizontal").ok, false);
    assert.equal(checkPlacement({}, getShip("quinquereme"), "F1", "horizontal").ok, true);
  });

  test("the computer's random fleet always has 5 ships on 17 separate squares", () => {
    for (let i = 0; i < 200; i++) {
      const fleet = randomPlacements();
      const cells = FLEET.flatMap((ship) => fleet[ship.id]?.cells ?? []);
      assert.equal(cells.length, 17);
      assert.equal(new Set(cells).size, 17);
    }
  });
});

describe("Carthaginian AI", () => {
  test("never fires at the same square twice in a whole game", () => {
    let shots = new Map<string, "hit" | "miss">();
    for (let turn = 0; turn < 100; turn++) {
      const target = pickCarthageTarget(shots, new Set());
      assert.ok(target && !shots.has(target), `turn ${turn} picked a repeat or nothing`);
      shots = fireShot(FIXED_FLEET, shots, target)!.shots;
    }
    assert.equal(pickCarthageTarget(shots, new Set()), null);
  });

  test("after a hit, it fires at a neighbouring square", () => {
    const shots = new Map<string, "hit" | "miss">([["E5", "hit"]]);
    for (let i = 0; i < 50; i++) {
      assert.ok(["D5", "F5", "E4", "E6"].includes(pickCarthageTarget(shots, new Set())!));
    }
  });

  test("with two hits in a row, it continues along that line", () => {
    const shots = new Map<string, "hit" | "miss">([
      ["E5", "hit"],
      ["F5", "hit"],
    ]);
    for (let i = 0; i < 50; i++) {
      assert.ok(["D5", "G5"].includes(pickCarthageTarget(shots, new Set())!));
    }
  });
});
