// The portal gun's aim mode and the chooser after a blue shot.
//
// Aim (role "aim"): a see-through window over the whole app. A reticle follows the pointer (blue
// half left, orange half right). Over a pane it projects where a new pane would land, on the side
// of that pane nearest the pointer. Holding the left button projects a terminal, the right button
// a notepad; releasing fires: the pane splits there. Esc, or a click off the panes, holsters it.
//
// Pane boxes come from GEO (kit.js): each pane header's box, reported by the press on the gun.
// A box runs from its header down to the next header below it, else to the bottom of the gun
// panel (the work area's bottom edge). Event coordinates are window pixels; a mod's own px are
// scaled by the app's zoom (settings().zoom), so drawing divides by `scale` = that zoom.
//
// Chooser (role "chooser", props { terminal }): Claude Code, Codex or the plain shell. A pick
// types the agent's command into the new terminal (`hc send`); Esc or a click away keeps the shell.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, openOverlay, panes, focused, settings, knownAgents, hc, notify, checking } from "herdr";
import { C, SIGN, MONO, ICON, spaced, GEO } from "./kit.js";
import { place, placeNote } from "./portals.js";

const HEAD = 34;       // pane header height in layouts/test-chamber.json
const GAP = 12;        // pane gap there
const R = 30;          // reticle radius, px

const AIM_KEY = "chamber-aim";
// fromClick: the press on the gun just reported every header's box, so only boxes from around
// it count. From a key (test-chamber.aim) there was no press: the last known boxes are used.
export function startAim(fromClick = false) {
  if (checking()) return;
  if (fromClick) GEO.stamp = Date.now();
  openOverlay({ mod: "test-chamber", kind: "window", key: AIM_KEY, frame: "none", width: 1, height: 1, at: { x: 0, y: 0 }, props: { role: "aim" } });
}

export class Aim {
  init(cx) {
    const p = props() ?? {};
    this.overlay = p.overlay;
    this.mouse = null;     // window coordinates
    this.held = null;      // "left" | "right" while a button is down
    this.firing = null;    // the shot on its way
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.measure();
  }

  // The shown tab's pane boxes, from the header boxes reported around the click on the gun.
  measure() {
    const tab = focused()?.tab;
    const shown = panes().filter((p) => p.tab === tab);
    const zoomed = shown.find((p) => p.zoomed);
    const since = GEO.stamp ? GEO.stamp - 3000 : 0;
    const heads = (zoomed ? [zoomed] : shown)
      .map((p) => ({ pane: p.pane, b: GEO.heads[p.pane] }))
      .filter((h) => h.b && h.b.t >= since && h.b.width > 0);
    // Events come in window pixels; a mod's px are scaled by the app's zoom.
    const zoom = Number(settings()?.zoom) || 1;
    this.scale = zoom > 0.2 && zoom < 6 ? zoom : 1;
    // The gap between panes, measured where two sit side by side, else the layout's 12 px.
    const gaps = heads.flatMap((a) => heads.map((b) => b.b.x - (a.b.x + a.b.width))).filter((g) => g > 0 && g < 60);
    this.gap = gaps.length ? Math.min(...gaps) : GAP * this.scale;
    const floor = GEO.gun ? GEO.gun.y + GEO.gun.height : null;
    this.boxes = heads.map(({ pane, b }) => {
      const below = heads
        .filter((q) => q.b.y > b.y + 4 && q.b.x < b.x + b.width - 4 && q.b.x + q.b.width > b.x + 4)
        .map((q) => q.b.y);
      const bottom = below.length ? Math.min(...below) - this.gap : (floor ?? b.y + 480 * this.scale);
      return { pane, x: b.x, y: b.y, w: b.width, h: Math.max(bottom - b.y, b.height * 3) };
    });
  }

  // What the reticle is on: the pane, the side nearest the pointer, and the half it would take.
  target() {
    const m = this.mouse;
    if (!m) return null;
    const box = this.boxes.find((b) => m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h);
    if (!box) return null;
    const fx = (m.x - box.x) / box.w, fy = (m.y - box.y) / box.h;
    const d = { left: fx, right: 1 - fx, top: fy, bottom: 1 - fy };
    const side = Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a), "left");
    const g = this.gap / 2;
    const half = {
      left: { x: box.x, y: box.y, w: box.w / 2 - g, h: box.h },
      right: { x: box.x + box.w / 2 + g, y: box.y, w: box.w / 2 - g, h: box.h },
      top: { x: box.x, y: box.y, w: box.w, h: box.h / 2 - g },
      bottom: { x: box.x, y: box.y + box.h / 2 + g, w: box.w, h: box.h / 2 - g },
    }[side];
    return { box, side, half };
  }

  holster() { closeOverlay(this.overlay); }

  press(button, e, cx) {
    cx.stop_propagation();
    if (this.firing) return;
    this.mouse = e.position;
    this.held = button;
    cx.notify();
  }

  release(button, e, cx) {
    cx.stop_propagation();
    if (this.held !== button || this.firing) return;
    this.held = null;
    this.mouse = e.position;
    const t = this.target();
    if (!t) { this.holster(); return; }
    this.firing = { button, t };
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        if (button === "left") {
          const made = await place(cx, t.box.pane, t.side);
          const s = this.scale, c = { x: (t.half.x + t.half.w / 2) / s, y: (t.half.y + t.half.h / 2) / s };
          openOverlay({ mod: "test-chamber", kind: "popup", frame: "none", width: 320, height: 236,
            at: { x: Math.max(8, c.x - 160), y: Math.max(8, c.y - 118) }, props: { role: "chooser", terminal: made.terminal } });
        } else {
          await placeNote(cx, t.box.pane, t.side);
        }
      } catch (err) {
        notify({ title: "Portal misfired", body: String(err?.message ?? err), level: "error" });
      }
      this.holster();
    });
  }

  reticle() {
    const m = this.mouse, s = this.scale;
    const dimL = this.held === "right", dimR = this.held === "left";
    const ring = (name, color, dim) => svg(ICON(name)).absolute().top(0).left(0).w(R * 2).h(R * 2).text_color(color).opacity(dim ? 0.2 : 1);
    return div().absolute().left(m.x / s - R).top(m.y / s - R).w(R * 2).h(R * 2)
      .child(ring("reticle-left", C.blue, dimL))
      .child(ring("reticle-right", C.orange, dimR));
  }

  // The projection: an outline while aiming, a ghost terminal or notepad while a button is held.
  projection(t) {
    const s = this.scale, r = t.half;
    const kind = this.firing?.button ?? this.held;
    const at = (el) => el.absolute().left(r.x / s).top(r.y / s).w(r.w / s).h(r.h / s).overflow_hidden();
    const chip = (text, color) => h_flex().h(28).px(12).flex_none().items_center().rounded(14).bg("#0b1a26cc").border(2).border_color(color)
      .font_family(SIGN).font_weight(700).text_size(13).text_color(color === C.blue ? C.blueSoft : C.orangeSoft).child(spaced(text));
    if (kind === "left") {
      const line = (text, color = "#c9d1d8") => div().font_family(MONO).text_size(14).text_color(color).child(text);
      return at(v_flex()).rounded(6).border(3).border_color(C.blue).bg("#0e1419e6").gap(0)
        .child(h_flex().h(HEAD).flex_none().px(10).gap(8).items_center().bg(C.blueBg).border_b(2).border_color(C.blue)
          .child(h_flex().h(20).px(8).items_center().rounded(2).bg(C.blue).font_family(SIGN).font_weight(700).text_size(12).text_color(C.blueDeep).child(spaced("TERMINAL")))
          .child(div().font_family(MONO).text_size(13).text_color(C.blueInk).child(this.firing ? "opening…" : "release to open")))
        .child(v_flex().p(14).gap(4).opacity(0.85)
          .child(line("PS ~> claude  |  codex  |  shell", C.blueSoft))
          .child(line("choose who goes in after it opens", "#7c8791"))
          .child(h_flex().child(line("PS ~> ")).child(div().w(9).h(17).bg(C.blue).loop("opacity", { from: 0.2, to: 1, period: 700 }))));
    }
    if (kind === "right") {
      return at(v_flex()).rounded(14).border(3).border_color(C.orange).bg(C.sticky + "ee").pt(8).gap(8)
        .child(h_flex().h(14).px(18).flex_none().justify_between()
          .children(Array.from({ length: 8 }, () => div().w(10).h(10).rounded(5).bg(C.orange + "aa").border(2).border_color(C.orangeInk))))
        .child(div().px(16).font_family(SIGN).font_weight(700).text_size(13).text_color(C.orangeInk).child(spaced(this.firing ? "NOTEPAD · OPENING" : "NOTEPAD · RELEASE TO PLACE")))
        .child(v_flex().px(16).gap(10).pt(6)
          .children([0.9, 0.75, 0.82, 0.5].map((f) => div().h(2).w(Math.max(40, (r.w / s - 32) * f)).bg(C.orange + "55"))));
    }
    return at(v_flex()).rounded(6).border(2).border_color("#ffffffcc").bg("#0b1a2666").items_center().justify_center().gap(10)
      .child(chip("LEFT · TERMINAL", C.blue))
      .child(chip("RIGHT · NOTEPAD", C.orange));
  }

  render() {
    const t = this.firing?.t ?? this.target();
    const s = this.scale;
    return div().id("chamber-aim").size_full().relative().bg("#0000001a").cursor_crosshair()
      .track_focus(this.handle)
      .on_key_down((e, cx) => { if (e.key === "escape") { cx.stop_propagation(); this.holster(); } })
      .on_mouse_move((e, cx) => {
        if (this.firing) return;
        const m = this.mouse;
        if (m && Math.abs(m.x - e.position.x) < 1 && Math.abs(m.y - e.position.y) < 1) return;
        this.mouse = e.position;
        cx.notify();
      })
      .on_mouse_down("left", (e, cx) => this.press("left", e, cx))
      .on_mouse_up("left", (e, cx) => this.release("left", e, cx))
      .on_mouse_down("right", (e, cx) => this.press("right", e, cx))
      .on_mouse_up("right", (e, cx) => this.release("right", e, cx))
      // the pane under the reticle
      .when(Boolean(t), (el) => el.child(div().absolute().left(t.box.x / s).top(t.box.y / s).w(t.box.w / s).h(t.box.h / s)
        .rounded(6).border(2).border_color("#ffffff55")))
      .when(Boolean(t), (el) => el.child(this.projection(t)))
      .when(this.boxes.length === 0, (el) => el.child(div().absolute().top(0).left(0).size_full().flex().items_center().justify_center()
        .child(div().px(18).py(12).rounded(8).bg("#0b1a26ee").text_color(C.blueSoft).font_family(SIGN).font_weight(700).text_size(15)
          .child("Can't see the panes yet: press Esc, click a pane, then the gun again."))))
      // the banner
      .child(div().absolute().bottom(112).left(0).w_full().flex().justify_center()
        .child(h_flex().h(36).px(16).gap(16).items_center().rounded(18).bg("#0b1a26ee").border(2).border_color("#ffffff33")
          .child(div().font_family(SIGN).font_weight(700).text_size(13).text_color("#e1e6ea").child(spaced("PORTAL GUN ARMED")))
          .child(div().w(2).h(18).bg("#ffffff33"))
          .child(div().font_family(SIGN).font_weight(700).text_size(13).text_color(C.blueSoft).child("LEFT CLICK  terminal"))
          .child(div().font_family(SIGN).font_weight(700).text_size(13).text_color(C.orangeSoft).child("RIGHT CLICK  notepad"))
          .child(div().font_family(SIGN).font_weight(700).text_size(13).text_color("#aab4bd").child("ESC  holster"))))
      .when(Boolean(this.mouse) && !this.firing, (el) => el.child(this.reticle()));
  }
}

const CHOICES = [
  { key: "claude", name: "CLAUDE CODE", sub: "Anthropic's coding agent", run: ["claude"] },
  { key: "codex", name: "CODEX", sub: "OpenAI's coding agent", run: ["codex", "--no-daemon"] },
  { key: "shell", name: "SHELL", sub: "keep the plain terminal", run: null },
];

export class Chooser {
  init(cx) {
    const p = props() ?? {};
    this.overlay = p.overlay;
    this.terminal = p.terminal;
    this.runs = Object.fromEntries(CHOICES.map((c) => [c.key, c.run]));
    this.handle = cx.focus_handle();
    this.handle.focus();
    if (checking()) return;
    // The run commands as Herdr knows them (programs.json can change them).
    cx.spawn(async () => {
      try {
        for (const a of await knownAgents()) if (a.key in this.runs && a.key !== "shell" && a.run?.length) this.runs[a.key] = a.run;
      } catch { /* keep the defaults */ }
    });
  }

  pick(key) {
    closeOverlay(this.overlay);
    const argv = this.runs[key];
    if (!argv || !this.terminal) return;
    hc(["send", this.terminal, argv.join(" ")]).catch(() => {});
  }

  render() {
    const row = (c, i) => h_flex().id(`pick-${c.key}`).h(50).flex_none().gap(12).px(12).items_center().rounded(8).border(2)
      .border_color(c.run ? C.blue : C.seam).bg(c.run ? C.blueBg : "#00000000").cursor_pointer()
      .hover((s) => s.border_color(c.run ? C.blueSoft : C.blue))
      .on_click(() => this.pick(c.key))
      .child(h_flex().w(26).h(26).flex_none().items_center().justify_center().rounded(4).bg(c.run ? C.blue : C.chip)
        .font_family(SIGN).font_weight(700).text_size(14).text_color(c.run ? C.blueDeep : C.ink2).child(String(i + 1)))
      .child(v_flex().flex_1().min_w(0)
        .child(div().font_family(SIGN).font_weight(700).text_size(15).text_color(C.ink).child(spaced(c.name)))
        .child(div().text_size(12).text_color(C.label).child(c.sub)));
    return v_flex().id("chamber-chooser").size_full().p(14).gap(8).rounded(14).border(3).border_color(C.blue).bg(C.panel)
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        const i = ["1", "2", "3"].indexOf(e.key);
        if (i >= 0) { cx.stop_propagation(); this.pick(CHOICES[i].key); }
        else if (e.key === "escape") { cx.stop_propagation(); this.pick("shell"); }
      })
      .child(div().font_family(SIGN).font_weight(700).text_size(12).text_color(C.blueInk).child(spaced("BLUE PORTAL OPEN · WHO GOES IN?")))
      .children(CHOICES.map(row));
  }
}
