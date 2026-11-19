// Left panel: CHAMBERS (spaces as numbered cards) and SUBJECTS (agents with their status).

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, run, openOverlay, setAgentOrder } from "herdr";
import { C, SIGN, two, label, dot, STATUS, basename, subjectName } from "./kit.js";

export class Side {
  chamber(s) {
    const on = s.active;
    const tests = s.tabs.length;
    const where = [s.machine, s.branch ?? (basename(s.folder) || "~")].filter(Boolean).join(" · ");
    return h_flex().id(`sp-${s.id}`).h(50).flex_none().gap(10).px(8).items_center().rounded(4).relative()
      .bg(on ? C.slab : "#00000000").cursor_pointer().hover((st) => st.bg(on ? C.slab : C.hover))
      .on_click((e) => { if (e.click_count === 2) run("space.rename", { id: s.id }); else run("space.select", { id: s.id }); })
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: s.id } } }); })
      .when(on, (el) => el.child(div().absolute().left(0).top(0).w(5).h(50).bg(C.blue)))
      .child(h_flex().w(30).h(30).flex_none().items_center().justify_center().rounded(3).bg(on ? C.blue : C.chip)
        .font_family(SIGN).font_weight(700).text_size(16).text_color(on ? C.blueDeep : C.ink2).child(two(s.index)))
      .child(v_flex().flex_1().min_w(0)
        .child(div().font_family(SIGN).font_weight(600).text_size(16).text_color(on ? C.slabText : C.ink).truncate().child(s.name))
        .child(div().text_size(12).text_color(on ? C.slabSub : C.faint).truncate().child(`${where} · ${tests} test${tests === 1 ? "" : "s"}`)))
      .when(s.status === "blocked" || s.status === "working" || s.status === "done", (el) => el.child(dot(s.status, 9)));
  }

  subject(a) {
    const st = STATUS[a.status] ?? STATUS.idle;
    const blocked = a.status === "blocked";
    return v_flex().id(`ag-${a.address}`).flex_none().px(8).py(6).rounded(4).border(2)
      .border_color(blocked ? C.orange : a.focused ? C.blue : "#00000000")
      .bg(blocked ? C.orangeBg : a.focused ? C.blueBg : "#00000000")
      .cursor_pointer().hover((s) => s.bg(blocked ? C.orangeBg : C.hover))
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .child(h_flex().gap(6).items_center()
        .child(dot(a.status, 10))
        .child(div().flex_1().min_w(0).font_family(SIGN).font_weight(600).text_size(16).text_color(C.ink).truncate().child(subjectName(a)))
        .child(div().flex_none().font_family(SIGN).font_weight(700).text_size(12).text_color(st.ink).child(st.word)))
      .child(div().pl(24).text_size(12).text_color(C.faint).truncate()
        .child(`${a.address} · ${a.space_name} · test ${a.tab_index}${a.title ? " · " + a.title : ""}`));
  }

  render() {
    const sp = spaces();
    const ags = agents();
    setAgentOrder(ags.map((a) => a.address));
    return v_flex().id("chamber-side").size_full().p(14).gap(10).rounded(6).border(2).border_color(C.seam).bg(C.panel)
      .child(h_flex().flex_none().items_center()
        .child(label(`CHAMBERS · ${two(sp.length)}`)).child(div().flex_1())
        .child(div().id("space-new").px(6).rounded(3).font_family(SIGN).font_weight(700).text_size(20).text_color(C.label)
          .cursor_pointer().hover((s) => s.bg(C.hover).text_color(C.ink)).on_click(() => run("space.new")).child("+")))
      .child(v_flex().id("chambers").flex_1().min_h(0).gap(2).overflow_y_scrollbar()
        .children(sp.map((s) => this.chamber(s))))
      .child(div().h(2).flex_none().bg(C.rule))
      .child(h_flex().flex_none().items_center().child(label(`SUBJECTS · ${two(ags.length)}`)))
      .child(v_flex().id("subjects").flex_1().min_h(0).gap(4).overflow_y_scrollbar()
        .when(ags.length === 0, (el) => el.child(div().pt(4).text_size(13).text_color(C.faint)
          .child("No subjects in testing. Start an agent with + or a blue portal.")))
        .children(ags.map((a) => this.subject(a))));
  }
}
