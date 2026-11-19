// Test Chamber: one mod, placed in several roles by layouts/test-chamber.json (props.role):
//   bar         top bar: chamber sign, tests (tabs), status pictograms, buttons
//   side        left panel: chambers (spaces) and subjects (agents)
//   pane        pane header (the tab block's pane.header)
//   gun         right panel: the portal gun (click to aim), FILES / CHANGES, LIGHTS, MOTION
//   hud         bottom HUD: counters, lab announcer, clock
//   fired       a notepad pane an orange shot placed (a notepad bubble)
//   aim         the gun's aim mode: a see-through window over the app with the reticle
//   chooser     after a blue shot: Claude Code, Codex or the plain shell
// A pane header gets no role, only { pane, terminal }, so a `pane` prop means "pane".

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { Bar } from "./bar.js";
import { Side } from "./side.js";
import { PaneHead } from "./pane.js";
import { Gun } from "./gun.js";
import { Hud } from "./hud.js";
import { Fired } from "./note.js";
import { Aim, Chooser } from "./aim.js";
import { pickFonts, applyMode } from "./kit.js";

const PARTS = { bar: Bar, side: Side, pane: PaneHead, gun: Gun, hud: Hud, fired: Fired, aim: Aim, chooser: Chooser };

export default class TestChamber extends View {
  init(_props, cx) {
    pickFonts();
    applyMode();
    const p = props() ?? {};
    const role = p.role ?? (p.pane ? "pane" : null);
    const Part = PARTS[role];
    this.part = Part ? new Part() : null;
    this.part?.init?.(cx);
  }

  render(cx) {
    applyMode();
    return this.part ? this.part.render(cx) : div();
  }

  async close(cx) {
    await this.part?.close?.(cx);
  }
}
