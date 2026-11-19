// Bottom HUD, in the lab's own colors: big counters (blue while working, orange when needed), the lab announcer's
// line, and a clock. The announcer's lines are original and only describe real agent states.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, shared } from "herdr";
import { C, SIGN, MONO, PULSE, two, spaced, subjectName } from "./kit.js";

export function announce(ags) {
  const by = (st) => ags.filter((a) => a.status === st);
  const blocked = by("blocked"), done = by("done"), working = by("working");
  if (blocked.length === 1) return `Subject ${subjectName(blocked[0])} (${blocked[0].address}) is requesting assistance. Please remain calm.`;
  if (blocked.length > 1) return `${blocked.length} subjects are requesting assistance. The lab thanks you for your continued cooperation.`;
  if (done.length === 1) return `Test complete. Subject ${subjectName(done[0])} (${done[0].address}) awaits your inspection.`;
  if (done.length > 1) return `${done.length} tests complete. Results are waiting to be looked at by a qualified human.`;
  if (working.length === 1) return `Subject ${subjectName(working[0])} is testing. Please do not tap on the glass.`;
  if (working.length > 1) return `${working.length} subjects are testing. Productivity is within acceptable parameters.`;
  if (ags.length) return "All subjects idle. The lab is quiet. Suspiciously quiet.";
  return "No subjects in the chamber. Fire a blue portal or press + to begin testing.";
}

const clock = () => {
  const d = new Date();
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};

export class Hud {
  init(cx) {
    this.time = clock();
    // The clock only changes once a minute; checking every 10 s keeps it within a few seconds.
    cx.timer.every(10000, (cx) => { const t = clock(); if (t !== this.time) { this.time = t; cx.notify(); } });
  }

  counter(name, value, color = C.ink, pulse = false) {
    return v_flex().flex_none().gap(0)
      .child(div().font_family(SIGN).font_weight(700).text_size(12).text_color(C.label).child(spaced(name)))
      .child(div().font_family(SIGN).font_weight(700).text_size(44).line_height(1).text_color(color)
        .when(pulse, (el) => el.loop("opacity", PULSE)).child(two(value)));
  }

  render() {
    const ags = agents();
    const n = (st) => ags.filter((a) => a.status === st).length;
    const working = n("working"), blocked = n("blocked");
    const still = Boolean(shared("chamber.still"));
    const share = ags.length ? working / ags.length : 0;
    return h_flex().id("chamber-hud").size_full().px(28).gap(34).items_center().bg(C.bar)
      .border_t(2).border_color(C.seam)
      .child(h_flex().flex_none().gap(14).items_end()
        .child(this.counter("SUBJECTS", ags.length))
        .child(div().relative().w(90).h(10).mb(10).flex_none().rounded(2).bg(C.chip)
          .child(div().absolute().top(0).left(0).h(10).rounded(2).w(Math.round(90 * share)).bg(C.blue).transition("width", { duration: 400, easing: "ease-out" }))))
      .child(this.counter("WORKING", working, working ? C.blueInk : C.ink))
      .child(this.counter("NEEDS YOU", blocked, blocked ? C.orange : C.ink, blocked > 0 && !still))
      .child(this.counter("CHAMBERS", spaces().length))
      .child(div().w(2).h(62).flex_none().bg(C.rule))
      .child(v_flex().flex_1().min_w(0).gap(4)
        .child(div().font_family(SIGN).font_weight(700).text_size(12).text_color(C.label).child(spaced("LAB ANNOUNCER")))
        .child(h_flex().min_w(0).gap(0).font_family(MONO).text_size(17).text_color(C.ink2)
          .child(div().flex_shrink(1).min_w(0).truncate().child(`› ${announce(ags)}`))
          .child(div().flex_none().text_color(C.blue).when(!still, (el) => el.frames(["▌", " "], 600)).child(still ? "" : "▌"))))
      .child(div().flex_none().font_family(MONO).text_size(30).text_color(C.ink).child(this.time));
  }
}
