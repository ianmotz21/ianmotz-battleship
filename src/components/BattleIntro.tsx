"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/Insignia";
import styles from "./BattleIntro.module.css";

/**
 * A brief title card as a battle opens. It never blocks the board: taps pass
 * straight through, and any tap or key press ends it early.
 */
export default function BattleIntro({ adversary }: { adversary: string }) {
  const [stage, setStage] = useState<"playing" | "leaving" | "done">("playing");

  useEffect(() => {
    if (stage !== "playing") {
      return;
    }
    const skip = () => setStage("leaving");
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [stage]);

  if (stage === "done") {
    return null;
  }

  return (
    <div
      className={`${styles.intro} ${stage === "leaving" ? styles.leaving : ""}`}
      aria-hidden="true"
      data-testid="battle-intro"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          setStage("done");
        }
      }}
    >
      <div className={styles.sea}>
        <span className={styles.wave} />
        <span className={styles.wave} />
        <span className={styles.wave} />
      </div>
      <Banner side="rome" className={`${styles.banner} ${styles.rome}`} />
      <Banner side="carthage" className={`${styles.banner} ${styles.carthage}`} />
      <div className={styles.card}>
        <p className={styles.kicker}>
          Roma <span>contra</span> Carthago
        </p>
        <p className={styles.title}>The Battle Begins</p>
        <p className={styles.sub}>Against the {adversary}</p>
      </div>
    </div>
  );
}
