import type { Side } from "@/components/Board";

export type ShotOutcome = "hit" | "miss";

// Keyed by the side that fired. Misses draw a jab from the enemy general;
// hits draw praise from your own.
const MESSAGES: Record<Side, Record<ShotOutcome, string[]>> = {
  rome: {
    miss: [
      "Hannibal Barca is disappointed with your aim.",
      "Hannibal crossed the Alps with elephants. You can't cross one square of sea.",
      "Hannibal reminds you Rome copied its first warship from a Carthaginian wreck. It shows.",
      "Hannibal didn't even look up from his wine in Capua.",
      "Hannibal suggests the legion return to farming.",
      "Hannibal has seen Roman consuls aim better at Cannae, and they lost.",
      "Hannibal thanks Rome for its generous donation of arrows to the sea.",
    ],
    hit: [
      "Scipio Africanus nods approvingly. A true Roman shot.",
      "Direct hit. Scipio orders an extra ration of wine for the crew.",
      "Scipio declares that shot worthy of a laurel wreath.",
      "The corvus drops and the legion boards. Scipio is pleased.",
      "Scipio is impressed. Hannibal, considerably less so.",
    ],
  },
  carthage: {
    miss: [
      "Scipio Africanus is displeased with your effort.",
      "Scipio is beginning to understand why Hannibal preferred fighting on land.",
      "Scipio suggests Carthage stick to selling purple dye.",
      "Cato says Carthage must be destroyed. Scipio says Carthage must practice.",
      "Scipio has already picked out a nickname for you. It isn't 'Admiral.'",
      "Scipio will be sure to mention this to Masinissa.",
    ],
    hit: [
      "Hannibal Barca smiles. Rome will remember that one.",
      "A clean strike. Hannibal raises his cup to the fleet.",
      "Melqart guides your hand. Hannibal is pleased.",
      "Hannibal approves. Somewhere in Iberia, an elephant trumpets.",
      "Tanit favors the bold, and so does Hannibal.",
    ],
  },
};

export function pickBattleMessage(attacker: Side, outcome: ShotOutcome, previous?: string): string {
  const pool = MESSAGES[attacker][outcome];
  const choices = pool.length > 1 ? pool.filter((line) => line !== previous) : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}
