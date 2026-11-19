// Top bar: chamber sign (space number + name), the tests (tabs) as tiles, status pictograms,
// portal-gun / layout / settings buttons and, where the system draws none, window buttons.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, agents, run, openOverlay, window, layout, shared, keys } from "herdr";
import { C, SIGN, ICON, PULSE, two, label, icon, button, tabName, find } from "./kit.js";

// The layout button: a layout-switcher mod where keys.json opens one (a personal mod, not
// shipped with Herdr), else Herdr's own cycle to the next layout.
function switchLayout() {
  const picker = keys().find((k) => /^mod\.open:/.test(k.action) && /switch/i.test(k.action));
  if (picker) run("mod.open", { name: picker.action.slice("mod.open:".length) });
  else run("layout.switch");
}

export class Bar {
  init() { this.pressed = null; }

  tile(space, tab, i, ps) {
    const blocked = tab.status === "blocked";
    const on = tab.active;
    const name = tabName(tab, ps);
    return h_flex().id(`tab-${tab.id}`).h(34).px(12).gap(8).flex_none().items_center().rounded(4)
      .border(2).border_color(blocked ? C.orange : on ? C.slab : C.seam)
      .bg(on ? C.slab : C.paper).text_color(on ? C.slabText : C.ink)
      .when(on && !blocked, (el) => el.border_b(4).border_color(C.blue))
      .font_family(SIGN).font_weight(700).text_size(15).cursor_pointer()
      .hover((s) => s.border_color(blocked ? C.orange : C.blue))
      .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: tab.id }); })
      .on_mouse_up("left", () => {
        const from = this.pressed; this.pressed = null;
        if (from !== null && from !== i) run("tab.move", { id: space.tabs[from].id, index: i + 1 });
        else run("tab.select", { id: tab.id });
      })
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: tab.id, space: space.id } } }); })
      .child(div().max_w(200).truncate().child(`${i + 1} · ${tab.zoomed ? name + " (zoom)" : name}`))
      .when(tab.status === "working", (el) => el.child(svg(ICON("working")).w(14).h(14).flex_none().text_color(C.blue).spin(900)))
      .when(tab.status === "done", (el) => el.child(icon("done", 14, C.green)))
      .when(blocked, (el) => el.child(div().w(9).h(9).rounded(5).bg(C.orange).flex_none().loop("opacity", PULSE)));
  }

  // One pictogram per agent status, lit while any agent has it, with the count.
  picto(status, count, still) {
    const lit = count > 0;
    const look = {
      working: { bg: C.slab, fg: lit ? C.blue : C.faint },
      blocked: { bg: lit ? C.orange : C.chip, fg: lit ? C.onAccent : C.faint },
      done: { bg: C.chip, fg: lit ? C.green : C.faint },
      idle: { bg: C.slab, fg: lit ? C.slabText : C.faint },
    }[status];
    let glyph = svg(ICON(status)).w(18).h(18).flex_none().text_color(look.fg);
    if (status === "working" && lit && !still) glyph = glyph.spin(1100);
    return h_flex().id(`picto-${status}`).h(36).px(9).gap(6).flex_none().items_center().rounded(3).bg(look.bg)
      .when(status === "blocked" && lit && !still, (el) => el.loop("opacity", PULSE))
      .child(glyph)
      .child(div().font_family(SIGN).font_weight(700).text_size(15).text_color(look.fg).child(String(count)));
  }

  render() {
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const ps = panes();
    const w = window();
    const ags = agents();
    const count = (st) => ags.filter((a) => a.status === st).length;
    const still = Boolean(shared("chamber.still"));
    const gun = find(layout(), "gun");
    const winBtn = (id, name, cmd, danger) => h_flex().id(id).w(42).h(32).flex_none().items_center().justify_center().rounded(4)
      .cursor_pointer().hover((s) => s.bg(danger ? "#e5484d" : C.hover))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run(cmd)).child(icon(name, 16, C.ink2));

    return h_flex().id("chamber-bar").size_full().pl(w?.platform === "macos" ? 84 : 14).pr(10).gap(14).items_center()
      .bg(C.bar).border_b(2).border_color(C.seam)
      .on_mouse_up("left", () => { this.pressed = null; })
      // Chamber sign
      .child(h_flex().w(52).h(52).flex_none().items_center().justify_center().rounded(4).bg(C.slab)
        .font_family(SIGN).font_weight(700).text_size(30).text_color(C.slabText).child(space ? two(space.index) : "--"))
      .child(v_flex().flex_none().max_w(230).gap(0)
        .child(label("CHAMBER"))
        .child(div().id("chamber-name").font_family(SIGN).font_weight(700).text_size(22).text_color(C.ink).truncate()
          .on_mouse_down("left", (e, cx) => { if (e.click_count === 2) { cx.stop_propagation(); run("space.rename", { id: space?.id }); } })
          .child(space?.name ?? "no chamber")))
      .child(div().w(2).h(40).flex_none().bg(C.rule))
      // Tests (tabs)
      .child(label("TEST"))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().gap(8).items_center().overflow_x_scrollbar()
        .on_scroll_wheel((e) => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
        .children(tabs.map((t, i) => this.tile(space, t, i, ps)))
        .child(button("tab-new", { text: "+" }, () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }), { size: 34, color: C.label })))
      // Status pictograms
      .child(h_flex().flex_none().gap(6)
        .child(this.picto("working", count("working"), still))
        .child(this.picto("blocked", count("blocked"), still))
        .child(this.picto("done", count("done"), still))
        .child(this.picto("idle", count("idle"), still)))
      .child(div().w(2).h(40).flex_none().bg(C.rule))
      .child(h_flex().flex_none().gap(8)
        .child(button("gun-toggle", { icon: "portal" }, () => run("layout.toggle", { id: "gun" }), { on: gun ? !gun.hidden : false }))
        .child(button("layouts", { icon: "switch" }, () => switchLayout()))
        .child(button("settings", { icon: "settings" }, () => run("app.settings"))))
      .when(Boolean(w?.buttons), (el) => el.child(h_flex().flex_none().gap(2).ml(4)
        .child(winBtn("win-min", "win-min", "window.minimize"))
        .child(winBtn("win-max", w.maximized ? "win-restore" : "win-max", "window.maximize"))
        .child(winBtn("win-close", "win-close", "window.close", true))));
  }
}
