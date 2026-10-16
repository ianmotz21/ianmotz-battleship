export const BOARD_SIZE = 10;
export const COLUMN_LABELS = "ABCDEFGHIJ".split("");

export type Orientation = "horizontal" | "vertical";

export type ShipId = "quinquereme" | "quadrireme" | "trireme" | "bireme" | "liburna";

export type ShipType = {
  id: ShipId;
  name: string;
  size: number;
};

// Standard Battleship sizes (5, 4, 3, 3, 2), named after Roman-era warships.
export const FLEET: ShipType[] = [
  { id: "quinquereme", name: "Quinquereme", size: 5 },
  { id: "quadrireme", name: "Quadrireme", size: 4 },
  { id: "trireme", name: "Trireme", size: 3 },
  { id: "bireme", name: "Bireme", size: 3 },
  { id: "liburna", name: "Liburna", size: 2 },
];

export type PlacedShip = {
  cells: string[];
  orientation: Orientation;
};

export type Placements = Partial<Record<ShipId, PlacedShip>>;

export type PlacementCheck =
  | { ok: true; cells: string[] }
  | { ok: false; cells: string[]; reason: "off-board" }
  | { ok: false; cells: string[]; reason: "overlap"; blockedBy: ShipId };

export function toCoord(colIndex: number, rowIndex: number): string {
  return `${COLUMN_LABELS[colIndex]}${rowIndex + 1}`;
}

export function parseCoord(coord: string): { colIndex: number; rowIndex: number } {
  return {
    colIndex: COLUMN_LABELS.indexOf(coord[0]),
    rowIndex: Number(coord.slice(1)) - 1,
  };
}

export function getShip(id: ShipId): ShipType {
  return FLEET.find((ship) => ship.id === id)!;
}

/**
 * Works out which squares a ship would cover if its first square is `start`.
 * Horizontal ships extend to the right, vertical ships extend downward.
 * The ship being placed is ignored when checking overlaps, so it can be moved.
 */
export function checkPlacement(
  placements: Placements,
  ship: ShipType,
  start: string,
  orientation: Orientation,
): PlacementCheck {
  const { colIndex, rowIndex } = parseCoord(start);
  const cells: string[] = [];

  for (let i = 0; i < ship.size; i++) {
    const col = orientation === "horizontal" ? colIndex + i : colIndex;
    const row = orientation === "vertical" ? rowIndex + i : rowIndex;
    if (col >= BOARD_SIZE || row >= BOARD_SIZE) {
      return { ok: false, cells, reason: "off-board" };
    }
    cells.push(toCoord(col, row));
  }

  for (const other of FLEET) {
    if (other.id === ship.id) {
      continue;
    }
    const occupied = placements[other.id]?.cells ?? [];
    if (occupied.some((cell) => cells.includes(cell))) {
      return { ok: false, cells, reason: "overlap", blockedBy: other.id };
    }
  }

  return { ok: true, cells };
}

/**
 * Places every ship in the fleet at a random legal spot, using the same
 * rules as manual placement: keep picking a random starting square and
 * orientation until checkPlacement says the ship fits.
 */
export function randomPlacements(random: () => number = Math.random): Placements {
  const placements: Placements = {};
  for (const ship of FLEET) {
    while (!placements[ship.id]) {
      const start = toCoord(Math.floor(random() * BOARD_SIZE), Math.floor(random() * BOARD_SIZE));
      const orientation: Orientation = random() < 0.5 ? "horizontal" : "vertical";
      const result = checkPlacement(placements, ship, start, orientation);
      if (result.ok) {
        placements[ship.id] = { cells: result.cells, orientation };
      }
    }
  }
  return placements;
}

export function shipAt(placements: Placements, coord: string): ShipId | undefined {
  return FLEET.find((ship) => placements[ship.id]?.cells.includes(coord))?.id;
}
