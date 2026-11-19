// Portal placements: the gun's two shots, each split into the pane it was aimed at.
//   blue   = a terminal (then the chooser: Claude Code, Codex or the plain shell)
//   orange = a notepad pane (role "fired"), saved to data/test-chamber/fired/note-<ms>.md
// A shot lands on one side of the target pane. Right and bottom split straight there; left and
// top split right/down and then swap the two, so the new pane ends up on the aimed side.

import { panes, run, appHome, writeTextFile } from "herdr";
import * as fs from "fs/promises";

export const firedDir = () => `${appHome()}/data/test-chamber/fired`;

const DIRECTION = { left: "right", right: "right", top: "down", bottom: "down" };
const wait = (cx, ms) => new Promise((done) => cx.timer.after(ms, () => done()));

// Split `target` toward `side`; resolves with the new pane once it shows up (run() answers
// nothing, so it's found as the pane that wasn't in the tab before).
export async function place(cx, target, side, extra = {}) {
  const t = panes().find((p) => p.pane === target);
  if (!t) throw new Error("that pane is gone");
  const before = new Set(panes().filter((p) => p.tab === t.tab).map((p) => p.pane));
  run("pane.split", { direction: DIRECTION[side], pane: target, ...extra });
  let made = null;
  for (let i = 0; i < 40 && !(made && (extra.mod || made.terminal)); i++) {
    await wait(cx, 50);
    made = panes().find((p) => p.tab === t.tab && !before.has(p.pane)) ?? null;
  }
  if (!made) throw new Error("the new pane didn't appear");
  if (side === "left" || side === "top") run("pane.swap", { pane: made.pane, target });
  return made;
}

export async function placeNote(cx, target, side) {
  const at = Date.now();
  const file = `${firedDir()}/note-${at}.md`;
  await fs.mkdir(firedDir(), { recursive: true });
  await writeTextFile(file, "", null);
  return place(cx, target, side, { mod: "test-chamber", props: { role: "fired", file, at } });
}
