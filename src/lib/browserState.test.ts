import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addRecord, clearRecords, getRecords } from "./leaderboard";
import { playShot, setMuted } from "./sound";

// These modules talk to the browser, so give them a pretend one: a
// localStorage shared by every "tab", and a silent stand-in for Web Audio.
const storage = new Map<string, string>();

function fakeParam() {
  return {
    value: 0,
    targets: [] as number[],
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime(target: number) {
      this.targets.push(target);
    },
  };
}

function fakeNode() {
  return {
    gain: fakeParam(),
    frequency: fakeParam(),
    Q: fakeParam(),
    pan: fakeParam(),
    connect<T>(destination: T) {
      return destination;
    },
    start() {},
    stop() {},
  };
}

const gainNodes: ReturnType<typeof fakeNode>[] = [];
const fakeAudio = {
  currentTime: 0,
  state: "running",
  sampleRate: 8000,
  destination: fakeNode(),
  createGain() {
    const node = fakeNode();
    gainNodes.push(node);
    return node;
  },
  createDynamicsCompressor: fakeNode,
  createBufferSource: fakeNode,
  createBiquadFilter: fakeNode,
  createOscillator: fakeNode,
  createStereoPanner: fakeNode,
  createBuffer: () => ({ getChannelData: () => new Float32Array(16) }),
  resume: async () => {},
};

class FakeAudioContext {
  constructor() {
    return fakeAudio;
  }
}

(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  AudioContext: FakeAudioContext,
};

describe("leaderboard across tabs", () => {
  test("a result saved in another tab is kept when this tab saves one", () => {
    clearRecords();
    assert.equal(getRecords().length, 0); // this tab has now read (and remembered) the saved results

    // Meanwhile, another tab finishes a battle and saves it straight to storage.
    const otherTab = { id: "other", result: "victory", difficulty: "general", shots: 40, hits: 17, shipsLost: 1, playedAt: 1 };
    storage.set("bellum-punicum:leaderboard", JSON.stringify([otherTab]));

    addRecord({ result: "defeat", difficulty: "recruit", shots: 60, hits: 12, shipsLost: 5 });

    const saved = JSON.parse(storage.get("bellum-punicum:leaderboard") ?? "[]");
    assert.deepEqual(
      saved.map((r: { result: string }) => r.result),
      ["victory", "defeat"],
    );
  });
});

describe("sound", () => {
  test("muting silences sounds that are already playing, and unmuting restores them", () => {
    setMuted(false);
    playShot("rome", "hit"); // starts the audio engine and schedules a sound
    const master = gainNodes[0].gain;

    setMuted(true);
    assert.equal(master.targets.at(-1), 0);

    setMuted(false);
    assert.ok((master.targets.at(-1) ?? 0) > 0);
  });
});
