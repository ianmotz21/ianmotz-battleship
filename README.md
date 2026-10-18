# Bellum Punicum · Battleship

A Punic Wars-themed Battleship game built with Next.js and TypeScript. You command the Roman fleet against an AI-controlled Carthaginian navy, in a single-page browser game.

## Features

- **Home screen:** a themed main menu with Start Battle, a difficulty picker, a Leaderboard and How to Play.
- **Three difficulty levels:** Recruit (easy), Strategist (medium) and General (hard). See [AI behavior](#ai-behavior).
- **Leaderboard:** finished games are saved in the browser (`localStorage`). It ranks your best victories by fewest shots, can filter by difficulty, and shows your win/loss record.
- **Ship placement:** place five ships horizontally or vertically (button or `R` key), with a live preview that shows valid and invalid squares. Overlapping and off-board placements are blocked.
- **Hidden enemy fleet:** Carthage's ships are placed randomly using the same rules, and stay hidden until sunk.
- **Turn-based combat:** turns strictly alternate between Rome and Carthage. The game tracks hits and misses, announces sunk ships, shows a Victory or Defeat screen with stats, and offers Play again.
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
| `npm test` | Core game logic tests |
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
    Game.tsx           Home/battle screens, game state and turn flow (single source of truth)
    HomeScreen.tsx     Main menu: difficulty, Start Battle, Leaderboard, How to Play
    Board.tsx          Presentational 10x10 board used for both fleets
    PlayerFleet.tsx    Ship selection and placement controls
    Celebration.tsx    Victory confetti and defeat ash overlay
    SoundToggle.tsx    Mute button, saved in localStorage
  lib/
    fleet.ts           Fleet definitions and placement/hit/sunk rules (pure functions)
    ai.ts              Carthage's targeting for each difficulty level
    leaderboard.ts     Saved game results and leaderboard ranking (localStorage)
    sound.ts           Synthesized sound effects
    battleMessages.ts  Themed hit and miss commentary
    gameLogic.test.ts  Tests for shots, sinking, winning, placement and the AI
```

## Game logic

- **Fleet:** each side has five ships with the standard sizes 5, 4, 3, 3 and 2. `fleet.ts` holds the rules as pure functions that don't touch React: `checkPlacement`, `randomPlacements`, `shipAt`, `sunkShipIds`, and `fireShot`, which resolves a single shot. Both the player's placement and the AI's placement use the same rules.
- **Screens:** `Game.tsx` shows the home screen first. Start Battle opens a fresh battle against the chosen difficulty. Main menu returns home, and asks for confirmation if a battle is under way. Every finished game is saved to the leaderboard; abandoned games are not.
- **State:** `Game.tsx` owns all game state: both fleets, both sets of shots (`Map<coord, "hit" | "miss">`), whose turn it is, and the winner. The boards only display what they're given.
- **Turn flow:** firing unlocks once all five Roman ships are placed, and the Roman fleet locks after the first shot. Rome fires, then Carthage replies after about 1.5 seconds. An already-attacked square can't be fired at again: its button is disabled, and `fireShot` also rejects a repeat shot.
- **Sinking and winning:** a ship is sunk when every one of its squares has been hit. When all five ships on one side are sunk, the winner is recorded, both boards lock and the full Carthaginian fleet is revealed.
- **Hidden fleet:** Carthage's layout is generated in the browser after the page loads. This is because Next.js pre-renders the page ahead of time with `cacheComponents`, and doesn't allow random values during that step. The layout is kept in a React ref, so it doesn't appear in the page until a ship is sunk.

## AI behavior

All three levels live in `src/lib/ai.ts`, and `pickTarget(difficulty, ...)` picks the right one. None of them peek at the Roman fleet. Each works out its move fresh before every shot, from information a human player would also have: its own hits and misses, and which ships are sunk.

- **Recruit (easy):** `pickRecruitTarget` fires at a random untried square. After a hit it follows up on a neighbouring square only about 30% of the time.
- **Strategist (medium):** `pickCarthageTarget` uses hunt/target:
  1. **Target (line):** if two or more unresolved hits line up, fire at an open end of that line. When one end is blocked by a miss or the board edge, use the other end.
  2. **Target (adjacent):** otherwise, fire at an untried square next to the oldest unresolved hit.
  3. **Hunt:** with no unresolved hits, fire at a random untried square.
- **General (hard):** `pickGeneralTarget` counts every way the ships still afloat could fit on the board without crossing a miss or a sunk ship. It then fires at the untried square covered by the most of those layouts. While a ship is wounded, it only counts layouts through the unresolved hits, and strongly prefers layouts that pass through several of them, so it chases a hit ship down quickly.

Hits on sunk ships no longer count as unresolved, so every level goes back to searching after a sinking.

Average shots needed to sink a full random fleet, from 2,000 simulated games per level:

| Level | Average shots | Fastest | Slowest |
| --- | --- | --- | --- |
| Pure random (for comparison) | ~95 | | |
| Recruit | ~79 | 41 | 100 |
| Strategist | ~60 | 23 | 100 |
| General | ~45 | 24 | 71 |

## Tests

`npm test` runs `src/lib/gameLogic.test.ts` with Node's built-in test runner, using [`tsx`](https://github.com/privatenumber/tsx) to run TypeScript directly. The tests use a fixed fleet, so results are repeatable, and check that:

- shots on ship squares are hits and shots on open water are misses;
- the same square can't be fired at twice;
- a ship sinks only when its last square is hit, and the game is won only when all 17 ship squares are hit;
- placements can't overlap or run off the board, and random fleets are always legal;
- the AI never repeats a square, and it follows up hits on neighbouring squares and along lines;
- every difficulty level can finish a game without repeating a square; the Recruit mostly ignores hits, while the General follows lines of hits and never aims where no remaining ship could fit;
- the leaderboard ranks victories by fewest shots and leaves out defeats.

## Built with Devin

This project was built and debugged with [Devin](https://devin.ai), the AI software engineer from Cognition. Features were added one small step at a time, from the starter project through the theme, ship placement, combat, the AI and the cinematic layer.

During development, each step was checked with type checks, linting, production builds and automated Playwright browser tests at desktop and mobile sizes. The browser tests aren't included in this repository; the core logic tests above are. Bugs found and fixed this way included:

- player shots never being checked against the hidden enemy fleet;
- boards overflowing the screen on mobile;
- a production build failure caused by random values during pre-rendering.
