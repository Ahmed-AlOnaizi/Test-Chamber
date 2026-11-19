// Test Chamber: shared palette and small building blocks for every part.
// Lab panels in a light or a dark mode, with blue/orange portal colors that keep fixed meanings
// in both: blue = focus and working, orange = needs you.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { home, panes, fonts, theme } from "herdr";

// The lab's own colors come in two modes. The theme decides which: themes/test-chamber.json
// (light canvas) or themes/test-chamber-dark.json (dark canvas); LIGHTS in the gun panel and
// the top bar switch between them with app.theme. slab = the dark blocks (active tab, chamber
// number), onAccent = text on blue/orange fills.
const LIGHT = {
  panel: "#e2e6e9", bar: "#e6e9ec", paper: "#f2f4f6", seam: "#b0b8bf", rule: "#c5cbd1",
  ink: "#1d2329", ink2: "#4b545c", label: "#5f6870", faint: "#7d868e", chip: "#cfd5da", hover: "#d5dade",
  blueInk: "#2a86cc", blueBg: "#d6e9f8", orangeInk: "#c8600a", orangeBg: "#f8e3cf", green: "#5d8a5d",
  slab: "#1d2329", slabText: "#f2f4f6", slabSub: "#9fb3c4", notePaper: "#f4f1ea", sticky: "#f7f0e0",
};
const DARK = {
  panel: "#1f252b", bar: "#1b2126", paper: "#262d34", seam: "#353e46", rule: "#2e363e",
  ink: "#e1e6ea", ink2: "#b3bcc4", label: "#8e98a1", faint: "#6f7a84", chip: "#2c343c", hover: "#2a3239",
  blueInk: "#6cc2ff", blueBg: "#16304a", orangeInk: "#ffa95c", orangeBg: "#3a2614", green: "#8fd18f",
  slab: "#0f1317", slabText: "#e1e6ea", slabSub: "#8095a8", notePaper: "#24221e", sticky: "#2a2620",
};

export const C = {
  ...LIGHT,
  // portals (the same in both modes)
  blue: "#2fa8ff", blueDeep: "#0b1a26", blueSoft: "#8fd0ff",
  orange: "#ff8a1f", orangeDeep: "#261405", orangeSoft: "#ffb26b",
  onAccent: "#1d2329", alarm: "#ff6a3a",
};

export const THEMES = { light: "test-chamber", dark: "test-chamber-dark" };
let dark = false;
const luminance = (hex) => {
  const n = parseInt(String(hex).slice(1, 7), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
// Follow the theme: a dark canvas means dark mode. Called before every render.
export function applyMode() {
  let next = dark;
  try { next = luminance(theme().canvas) < 0.4; } catch { /* keep the mode */ }
  if (next !== dark) { dark = next; Object.assign(C, dark ? DARK : LIGHT); }
  return dark;
}
export const isDark = () => dark;

// Signage font: Bahnschrift (a DIN-style face Windows ships) where installed, else the bundled
// Barlow Semi Condensed, which Herdr registers under the family name "Barlow".
// Set by pickFonts() from init (a host call doesn't belong in module scope); a live binding.
export let SIGN = "Barlow";
export const MONO = "Share Tech Mono";
export function pickFonts() {
  try { SIGN = fonts().includes("Bahnschrift") ? "Bahnschrift" : "Barlow"; } catch { /* keep Barlow */ }
}
export const ICON = (name) => `mods/test-chamber/icons/${name}.svg`;

// Where things are on screen, in window coordinates, learned from presses. Herdr doesn't tell a
// mod where panes are, but every pane header hears a press anywhere else (on_mouse_down_out) with
// its own box, so the click on the portal gun tells the aim overlay where each pane is.
// Shared by every copy (module scope); heads: pane id -> box, gun: the gun panel's box.
export const GEO = { heads: {}, gun: null, stamp: 0 };
export function learn(map, key, e) {
  if (!e?.position || !e.local_position || !e.bounds) return;
  map[key] = {
    x: e.position.x - e.local_position.x, y: e.position.y - e.local_position.y,
    width: e.bounds.width, height: e.bounds.height, t: Date.now(),
  };
}
export const PULSE = { from: 0.35, to: 1, period: 1100 };

export const two = (n) => String(n).padStart(2, "0");

// A small spaced-out caps label, like lab signage.
export const label = (text, color = C.label) =>
  div().flex_none().font_family(SIGN).font_weight(700).text_size(12).text_color(color).child(spaced(text));

// GPUI has no letter-spacing; thin spaces between letters give the signage look.
export const spaced = (text) => [...String(text)].join(" ");

export const icon = (name, size, color) => svg(ICON(name)).w(size).h(size).flex_none().text_color(color);

// A square outlined button with an icon or text. Stops the press so window_drag blocks don't drag.
export function button(id, content, onClick, opts = {}) {
  const { size = 32, on = false, color = C.ink, edge = C.seam } = opts;
  return h_flex().id(id).h(size).min_w(size).px(content.icon ? 0 : 10).flex_none().items_center().justify_center()
    .rounded(4).border(2).border_color(on ? C.blue : edge).bg(on ? C.blueBg : "#00000000")
    .text_color(color).font_family(SIGN).font_weight(700).text_size(13)
    .cursor_pointer().hover((s) => s.bg(C.hover))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => { cx.stop_propagation(); onClick(e, cx); })
    .child(content.icon ? icon(content.icon, size * 0.55, color) : content.text);
}

// "~/dev/x" for a folder under home, on this machine.
export function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  const norm = (s) => s.replace(/\\/g, "/");
  const c = norm(cwd), hh = norm(h);
  if (c.toLowerCase() === hh.toLowerCase()) return "~";
  if (c.toLowerCase().startsWith(hh.toLowerCase() + "/")) return "~" + c.slice(hh.length);
  return c;
}

export const basename = (p) => (p ? p.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() || p : "");

// A tab's label: its name, else what runs in it (an agent first).
export function tabName(tab, ps = panes()) {
  if (tab.named) return tab.name;
  const mine = ps.filter((p) => p.tab === tab.id);
  const prog = mine.find((p) => p.program?.agent)?.program ?? mine[0]?.program;
  return prog?.agent || prog?.shell ? prog.name : mine[0]?.title || prog?.name || "terminal";
}

// What an agent is called in lists: the program, plus a short title when there is one.
export const subjectName = (a) => (a.program?.name ?? a.app ?? "agent");

// Getters, so the colors follow the light/dark palette at render time.
export const STATUS = {
  working: { word: "WORKING", get color() { return C.blue; }, get ink() { return C.blueInk; } },
  blocked: { word: "NEEDS YOU", get color() { return C.orange; }, get ink() { return C.orangeInk; } },
  done: { word: "DONE", get color() { return C.green; }, get ink() { return C.green; } },
  idle: { word: "IDLE", get color() { return C.faint; }, get ink() { return C.faint; } },
};

// A status dot: blue ring pulse while working, orange pulse when it needs you.
export function dot(status, size = 12) {
  const core = div().w(size).h(size).rounded(size / 2).flex_none();
  if (status === "working") return div().relative().w(size + 8).h(size + 8).flex_none().items_center().justify_center().flex()
    .child(div().absolute().top(0).left(0).w(size + 8).h(size + 8).rounded((size + 8) / 2).border(3).border_color(C.blue).loop("opacity", { from: 0.15, to: 0.6, period: 1400 }))
    .child(core.bg(C.blue));
  if (status === "blocked") return div().w(size + 8).h(size + 8).flex().items_center().justify_center().flex_none().child(core.bg(C.orange).loop("opacity", PULSE));
  if (status === "done") return div().w(size + 8).h(size + 8).flex().items_center().justify_center().flex_none().child(core.bg(C.green));
  return div().w(size + 8).h(size + 8).flex().items_center().justify_center().flex_none().child(core.border(3).border_color(C.faint));
}

export function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}
