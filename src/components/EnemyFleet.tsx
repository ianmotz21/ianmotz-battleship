"use client";

import { useEffect, useRef } from "react";
import Board from "@/components/Board";
import { FLEET, randomPlacements, type Placements } from "@/lib/fleet";
import styles from "./EnemyFleet.module.css";

export default function EnemyFleet() {
  // Carthage's hidden fleet, ready for hit detection. It's kept in a ref
  // rather than state because nothing on screen shows it.
  const shipsRef = useRef<Placements | null>(null);

  // Placed once in the browser after the page loads, so every visit gets a
  // new layout while the pre-built page stays the same.
  useEffect(() => {
    shipsRef.current = randomPlacements();
  }, []);

  function findShipAt(coord: string) {
    const ships = shipsRef.current ?? {};
    return FLEET.find((ship) => ships[ship.id]?.cells.includes(coord))?.id;
  }

  return (
    <Board side="carthage" title="Carthaginian Fleet" motto="Qart-ḥadašt" interactive findShipAt={findShipAt}>
      <p className={styles.note}>Five Carthaginian warships lie hidden in these waters.</p>
    </Board>
  );
}
