import type { CSSProperties } from "react";
import styles from "./Celebration.module.css";

const CONFETTI_COLORS = ["#d4b483", "#f3dca6", "#a8261c", "#c9974f", "#eadfca", "#8b1a1a"];
const ASH_COLORS = ["#6f6a73", "#4a4550", "#8a7d92", "#2f2b33"];

/** Repeatable "random" numbers, so the particles can be laid out during render. */
function scatter(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Falling confetti for a victory, or drifting ash and embers for a defeat. */
export default function Celebration({ result }: { result: "victory" | "defeat" }) {
  const victory = result === "victory";
  const count = victory ? 140 : 80;

  return (
    <div
      className={`${styles.overlay} ${victory ? styles.victory : styles.defeat}`}
      aria-hidden="true"
      data-testid="celebration"
      data-result={result}
    >
      {Array.from({ length: count }, (_, i) => {
        const ember = !victory && i % 9 === 0;
        const size = victory ? 6 + scatter(i, 1) * 5 : 2 + scatter(i, 1) * 4;
        const style = {
          left: `${scatter(i, 2) * 100}%`,
          width: `${size}px`,
          height: victory ? `${size * 1.6}px` : `${size}px`,
          background: ember
            ? "#f08a3c"
            : victory
              ? CONFETTI_COLORS[i % CONFETTI_COLORS.length]
              : ASH_COLORS[i % ASH_COLORS.length],
          animationDuration: `${victory ? 3.2 + scatter(i, 3) * 2.6 : 7 + scatter(i, 3) * 5}s`,
          animationDelay: `${scatter(i, 4) * (victory ? 2.4 : 7)}s`,
          "--drift": `${(scatter(i, 5) - 0.5) * (victory ? 220 : 120)}px`,
          "--spin": `${(scatter(i, 6) > 0.5 ? 1 : -1) * (360 + scatter(i, 7) * 720)}deg`,
        } as CSSProperties;
        return <span key={i} className={`${styles.piece} ${ember ? styles.ember : ""}`} style={style} />;
      })}
    </div>
  );
}
