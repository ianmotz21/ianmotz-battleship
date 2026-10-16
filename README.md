# Bellum Punicum · Battleship

A Punic Wars-themed Battleship game built with Next.js and TypeScript. You command the Roman fleet against an AI-controlled Carthaginian navy, in a single-page browser game.

## Features

- **Ship placement:** place five ships horizontally or vertically (button or `R` key), with a live preview that shows valid and invalid squares. Overlapping and off-board placements are blocked.
- **Hidden enemy fleet:** Carthage's ships are placed randomly using the same rules, and stay hidden until sunk.
- **Turn-based combat:** turns strictly alternate between Rome and Carthage. The game tracks hits and misses, announces sunk ships, shows a Victory or Defeat screen with stats, and offers Play again.
- **Hunt/target AI:** Carthage follows up on its hits instead of firing at random.
- **Cinematic layer:** animated ocean, synthesized sound effects (cannon fire, splashes, impacts, crowd reactions, fanfare), and victory confetti or defeat ash. There's a saved mute toggle, and the app respects the system's reduced-motion setting.
- **Responsive and accessible:** works on screens down to 320px wide, and the boards can be played with the keyboard and have screen-reader labels.

## Running locally

Requires Node.js 20.9 or later.

```bash
git clone https://github.com/ianmotz21/ianmotz-battleship.git
cd ianmotz-battleship
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` then `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

## Tech stack

- **Next.js 16** (App Router) with **React 19**
- **TypeScript** (strict mode)
- **CSS Modules** for styling, with no UI framework
- **Web Audio API** for all sound, generated in code with no audio files
- **ESLint** (`eslint-config-next`)

## Project structure

```
src/
  app/
    page.tsx           Page layout: title, sound toggle, game
    globals.css        Theme colours and fonts
  components/
    Game.tsx           Game state and turn flow (single source of truth)
    Board.tsx          Presentational 10x10 board used for both fleets
    PlayerFleet.tsx    Ship selection and placement controls
    Celebration.tsx    Victory confetti and defeat ash overlay
    SoundToggle.tsx    Mute button, saved in localStorage
  lib/
    fleet.ts           Fleet definitions and placement/hit/sunk rules (pure functions)
    ai.ts              Carthage's hunt/target targeting
    sound.ts           Synthesized sound effects
    battleMessages.ts  Themed hit and miss commentary
```

## Game logic

- **Fleet:** each side has five ships with the standard sizes 5, 4, 3, 3 and 2. `fleet.ts` holds the rules as pure functions that don't touch React: `checkPlacement`, `randomPlacements`, `shipAt` and `sunkShipIds`. Both the player's placement and the AI's placement use the same rules.
- **State:** `Game.tsx` owns all game state: both fleets, both sets of shots (`Map<coord, "hit" | "miss">`), whose turn it is, and the winner. The boards only display what they're given.
- **Turn flow:** firing unlocks once all five Roman ships are placed, and the Roman fleet locks after the first shot. Rome fires, then Carthage replies after a short delay. An already-attacked square can't be fired at again: its button is disabled, and the game's state also rejects a repeat shot.
- **Sinking and winning:** a ship is sunk when every one of its squares has been hit. When all five ships on one side are sunk, the winner is recorded, both boards lock and the full Carthaginian fleet is revealed.
- **Hidden fleet:** Carthage's layout is generated in the browser after the page loads. This is because Next.js pre-renders the page ahead of time with `cacheComponents`, and doesn't allow random values during that step. The layout is kept in a React ref, so it doesn't appear in the page until a ship is sunk.

## AI behavior

`pickCarthageTarget` in `src/lib/ai.ts` uses a simple hunt/target strategy. It keeps no memory between turns: before each shot, it works out its move from information a human player would also have, namely its own hits and misses and which ships are sunk.

1. **Target (line):** if two or more unresolved hits line up, fire at an open end of that line. When one end is blocked by a miss or the board edge, use the other end.
2. **Target (adjacent):** otherwise, fire at an untried square next to the oldest unresolved hit.
3. **Hunt:** with no unresolved hits, fire at a random untried square.

Hits on sunk ships no longer count as unresolved, so the AI returns to hunting after each sinking. In 5,000 simulated games, it needed about 59 shots on average to sink a full fleet, compared with about 95 for random firing. That makes it a real challenge, but still beatable.

## Built with Devin

This project was built and debugged with [Devin](https://devin.ai), the AI software engineer from Cognition. Features were added one small step at a time, from the starter project through the theme, ship placement, combat, the AI and the cinematic layer.

During development, each step was checked with type checks, linting, production builds and automated Playwright browser tests at desktop and mobile sizes. Those tests aren't included in this repository. Bugs found and fixed this way included:

- player shots never being checked against the hidden enemy fleet;
- boards overflowing the screen on mobile;
- a production build failure caused by random values during pre-rendering.
