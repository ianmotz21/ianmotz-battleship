import { useId } from "react";
import type { Side } from "@/components/Board";

type SvgProps = { className?: string };

const GOLD = ["#f3dca6", "#9a6f35"];

/** A hanging standard: the Roman vexillum, or Carthage's banner with the Sign of Tanit. */
export function Banner({ side, className }: SvgProps & { side: Side }) {
  const id = useId();
  const rome = side === "rome";
  const gold = `url(#${id}-gold)`;
  return (
    <svg className={className} viewBox="0 0 60 96" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cloth`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={rome ? "#a82424" : "#5e2a63"} />
          <stop offset="1" stopColor={rome ? "#5e1010" : "#1d2547"} />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD[0]} />
          <stop offset="1" stopColor={GOLD[1]} />
        </linearGradient>
      </defs>
      <path d="M6 8H54V78L30 92L6 78Z" fill={`url(#${id}-cloth)`} stroke={gold} strokeWidth="1.5" />
      <path d="M10 13H50V75.5L30 87L10 75.5Z" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.6" />
      <rect x="1" y="4" width="58" height="4.5" rx="2.25" fill={gold} />
      {rome ? (
        <>
          <circle cx="30" cy="31" r="8.5" fill="none" stroke={gold} strokeWidth="1.8" strokeDasharray="3 1.6" />
          <text
            x="30"
            y="58"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            letterSpacing="1.2"
            fill={gold}
            style={{ fontFamily: "var(--font-display-stack)" }}
          >
            SPQR
          </text>
        </>
      ) : (
        <g fill="none" stroke={gold} strokeWidth="2" strokeLinejoin="round">
          <circle cx="30" cy="27" r="5" />
          <path d="M19 36H41" />
          <path d="M30 34L20 60H40Z" />
        </g>
      )}
    </svg>
  );
}

// Leaf centres along the stem, from the base upwards.
const LEAVES = [
  [27, 70],
  [21, 61],
  [16.5, 51],
  [14.5, 41],
  [15, 31],
  [17.5, 21.5],
];

/** A laurel branch; `flip` mirrors it for the right-hand side of a wreath. */
export function Laurel({ className, flip = false }: SvgProps & { flip?: boolean }) {
  const id = useId();
  const fill = `url(#${id}-leaf)`;
  return (
    <svg className={className} viewBox="0 0 40 80" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <defs>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD[0]} />
          <stop offset="1" stopColor={GOLD[1]} />
        </linearGradient>
      </defs>
      <path d="M31 77C14 64 9 38 22 8" fill="none" stroke={fill} strokeWidth="1.6" strokeLinecap="round" />
      {LEAVES.map(([x, y]) => (
        <g key={y} fill={fill}>
          <ellipse cx={x - 5} cy={y - 2} rx="6" ry="2.4" transform={`rotate(50 ${x - 5} ${y - 2})`} />
          <ellipse cx={x + 4.5} cy={y - 3} rx="5.5" ry="2.2" transform={`rotate(-55 ${x + 4.5} ${y - 3})`} />
        </g>
      ))}
      <ellipse cx="22.5" cy="7" rx="5" ry="2.2" transform="rotate(-80 22.5 7)" fill={fill} />
    </svg>
  );
}

export type General = "scipio" | "hannibal";

// A classical bust in profile, facing right.
const PROFILE =
  "M17 40L18 33C12 28 12 15 22 11C28 9 33 12 34 17L34 19L36.6 23.6L34 24.6L34.6 26.6L33.6 27.3L34.2 28.7L33 30C33 32 31.5 33 29.5 33L27 34L28 40L35 43.5L13 43.5Z";

/** A coin-like medallion bearing the commander's bust: laurelled Scipio, helmeted Hannibal. */
export function Medallion({ general, className }: SvgProps & { general: General }) {
  const id = useId();
  const scipio = general === "scipio";
  // Roman bronze for Scipio; Carthaginian silver for Hannibal.
  const metal = scipio ? ["#f0d49a", "#b8863f", "#6e4a1e"] : ["#eeeae2", "#a9a196", "#57514a"];
  const relief = scipio ? "rgba(58, 36, 12, 0.6)" : "rgba(40, 36, 44, 0.6)";
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" data-general={general}>
      <defs>
        <radialGradient id={`${id}-metal`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={metal[0]} />
          <stop offset="0.55" stopColor={metal[1]} />
          <stop offset="1" stopColor={metal[2]} />
        </radialGradient>
        <linearGradient id={`${id}-bust`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={metal[0]} />
          <stop offset="1" stopColor={metal[1]} />
        </linearGradient>
        <clipPath id={`${id}-face`}>
          <circle cx="24" cy="24" r="19" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${id}-metal)`} stroke={relief} strokeWidth="1" />
      <circle cx="24" cy="24" r="20.2" fill="none" stroke={relief} strokeWidth="0.9" strokeDasharray="1.1 1.5" />
      <circle cx="24" cy="24" r="19.4" fill={relief} opacity="0.3" />
      <g clipPath={`url(#${id}-face)`}>
        <path d={PROFILE} fill={relief} transform="translate(0.9 0.9)" />
        <path d={PROFILE} fill={`url(#${id}-bust)`} stroke={relief} strokeWidth="0.7" />
        {scipio ? (
          <g fill={relief}>
            <path
              d="M14.6 26.5C12.8 18.5 17.6 11.6 25.6 10.4C28.8 10 31.2 10.8 32.8 12.4"
              fill="none"
              stroke={relief}
              strokeWidth="1"
            />
            {[
              [14.2, 24, 75],
              [14, 19.6, 60],
              [15.8, 15.6, 42],
              [18.8, 12.6, 25],
              [22.6, 10.8, 10],
              [26.6, 10.1, -2],
              [30.4, 10.8, -18],
            ].map(([x, y, angle]) => (
              <g key={x}>
                <ellipse cx={x - 1.3} cy={y - 0.6} rx="3" ry="1.25" transform={`rotate(${angle - 35} ${x - 1.3} ${y - 0.6})`} />
                <ellipse cx={x + 1} cy={y + 0.9} rx="2.8" ry="1.15" transform={`rotate(${angle + 30} ${x + 1} ${y + 0.9})`} />
              </g>
            ))}
            <path d="M14.4 26.4l-3.4 4.6M14.4 26.4l-1.4 5.4" fill="none" stroke={relief} strokeWidth="1.1" strokeLinecap="round" />
          </g>
        ) : (
          <g fill={relief} stroke={relief} strokeLinejoin="round">
            <path d="M13.4 24C11 14 18 8.4 26 8.5C31.6 8.6 35.4 12.6 35.6 17.6L31 18.2L29.6 21.4L17.4 24.2Z" strokeWidth="0.6" />
            <path d="M15.2 15.4C16 6 26.4 2.4 35.6 6.6L34 9.2C26.4 6.6 19.4 9.2 17 16.2Z" strokeWidth="0.6" />
            <path d="M26.8 21.2L30.4 27.2L27 29.6L24.4 22.4Z" strokeWidth="0.6" />
            <path d="M16 20.5C20 19.6 26 18.6 31.2 18.4" fill="none" stroke={metal[0]} strokeWidth="0.7" opacity="0.7" />
          </g>
        )}
      </g>
    </svg>
  );
}
