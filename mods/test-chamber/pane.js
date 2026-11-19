// Pane header: the program on a dark chip (blue when focused), the folder, the status,
// and zoom / close. Props from the app: { pane, terminal }.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, shared } from "herdr";
import { C, SIGN, MONO, PULSE, folder, spaced, GEO, learn } from "./kit.js";

export class PaneHead {
  init() { this.width = 0; this.pane = props()?.pane; }

  render() {
    const p = panes().find((x) => x.pane === this.pane);
    if (!p) return div();
    const pane = p.pane;
    const lit = p.focused;
    const still = Boolean(shared("chamber.still"));
    const note = p.mod === "test-chamber"; // a notepad pane (orange shot)
    const name = note ? "NOTEPAD" : ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const roomy = this.width === 0 || this.width > 420;
    const key = (id, text, cmd) => h_flex().id(id).w(26).h(22).flex_none().items_center().justify_center().rounded(3)
      .text_size(14).text_color(C.label).cursor_pointer().hover((s) => s.bg(C.hover).text_color(C.ink))
      .on_click((_e, cx) => { cx.stop_propagation(); run(cmd, { pane }); }).child(text);

    const status = (() => {
      if (p.status === "blocked") return h_flex().h(20).px(8).flex_none().items_center().rounded(2).bg(C.orange)
        .font_family(SIGN).font_weight(700).text_size(12).text_color(C.onAccent).when(!still, (el) => el.loop("opacity", PULSE)).child(spaced("NEEDS YOU"));
      if (p.status === "working") return h_flex().flex_none().gap(6).items_center()
        .child(div().w(8).h(8).rounded(4).bg(C.blue).when(!still, (el) => el.loop("opacity", { from: 0.3, to: 1, period: 800 })))
        .child(div().font_family(SIGN).font_weight(700).text_size(12).text_color(C.blueInk).child(spaced("WORKING")));
      if (p.status === "done") return div().flex_none().font_family(SIGN).font_weight(700).text_size(12).text_color(C.green).child(spaced("DONE ✓"));
      return null;
    })();

    return h_flex().id(`ph-${pane}`).size_full().px(8).gap(10).items_center().bg(lit ? C.paper : C.panel)
      .border_b(2).border_color(lit ? C.blue : C.seam)
      .on_size_change((size, cx) => { if (Math.abs(size.width - this.width) > 1) { this.width = size.width; cx.notify(); } })
      // Where this pane is: every press, here or anywhere else, reports this header's box
      // (the portal gun's aim overlay uses it to know which pane the crosshair is on).
      .on_mouse_down_out((e) => learn(GEO.heads, pane, e))
      .on_mouse_down("left", (e) => learn(GEO.heads, pane, e))
      .on_click(() => run("pane.focus", { pane }))
      .child(h_flex().h(20).px(8).flex_none().items_center().rounded(2).bg(note ? C.orange : lit ? C.blue : C.slab)
        .font_family(SIGN).font_weight(700).text_size(12).text_color(note ? C.onAccent : lit ? C.blueDeep : C.slabText)
        .child(div().max_w(180).truncate().child(spaced(name.toUpperCase()))))
      .child(div().flex_shrink(1).min_w(0).font_family(MONO).text_size(13).text_color(C.ink2).truncate().child(note ? "" : folder(p.cwd)))
      .child(div().flex_1().min_w(6))
      .when(Boolean(status), (el) => el.child(status))
      .when(roomy, (el) => el.child(key(`ph-z-${pane}`, p.zoomed ? "⤡" : "⤢", "pane.zoom")))
      .when(this.width === 0 || this.width > 200, (el) => el.child(key(`ph-x-${pane}`, "×", "pane.close")));
  }
}
