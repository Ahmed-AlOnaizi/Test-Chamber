// The notepad pane an orange shot places (role "fired"): a notepad bubble (paper, ring-bound top
// edge, a tail pointing back toward the pane it was split from), editable, saved to its file.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex, TextareaState, Textarea } from "gpui-base";
import { props, readTextFile, writeTextFile, checking } from "herdr";
import * as fs from "fs/promises";
import { C, SIGN, MONO, spaced, two, ICON } from "./kit.js";

class FilePad {
  constructor(path, placeholder, rows) {
    this.path = path;
    this.saved = null;      // what the file holds, as far as we know (null: no file yet)
    this.gen = 0;
    this.note = "";         // a short status line
    this.area = TextareaState.new({ placeholder, rows });
    this.area.set_soft_wrap(true);
  }

  start(cx) {
    this.area.on("change", (_e, cx) => this.schedule(cx));
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(this.path);
        if (text != null) { this.saved = text; this.area.set_value(text); }
      } catch (e) { this.note = `couldn't read: ${e?.message ?? e}`; }
      cx.notify();
    });
  }

  schedule(cx) {
    const g = ++this.gen;
    cx.timer.after(700, (cx) => { if (g === this.gen) this.save(cx); });
  }

  save(cx) {
    const text = this.area.value();
    if (text === (this.saved ?? "")) return;
    cx.spawn(async (cx) => {
      try {
        await fs.mkdir(this.path.slice(0, this.path.lastIndexOf("/")), { recursive: true });
        try { await writeTextFile(this.path, text, this.saved); }
        catch {
          // Someone else changed the file: take theirs as the base and write ours over it.
          const now = await readTextFile(this.path);
          await writeTextFile(this.path, text, now);
        }
        this.saved = text;
        this.note = "saved";
      } catch (e) { this.note = `couldn't save: ${e?.message ?? e}`; }
      cx.notify();
    });
  }

  // The pad keeps its presses (selecting text must not drag a window).
  view(id, bg) {
    return div().id(id).flex_1().min_h(0).on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(Textarea.new(this.area).size_full().font_family(MONO).text_size(14).text_color(C.ink).bg(bg));
  }
}


export class Fired {
  init(cx) {
    const p = props() ?? {};
    this.at = p.at ?? 0;
    this.pad = new FilePad(p.file ?? "", "Write here. It saves by itself.", 4);
    if (checking() || !p.file) return;
    this.pad.start(cx);
  }

  render() {
    const t = this.at ? new Date(this.at) : null;
    const when = t ? `${two(t.getHours())}:${two(t.getMinutes())}` : "";
    const note = this.pad.note;
    const rings = h_flex().flex_none().h(14).px(18).justify_between().items_center()
      .children(Array.from({ length: 9 }, () => div().w(10).h(10).rounded(5).bg(C.orange + "aa").border(2).border_color(C.orangeInk)));
    return h_flex().id(`fired-${this.at}`).size_full().py(10).pr(10).items_start()
      // the bubble's tail
      .child(svg(ICON("tail")).w(14).h(22).mt(26).flex_none().text_color(C.orange))
      .child(v_flex().flex_1().h_full().min_w(0).rounded(16).border(3).border_color(C.orange).bg(C.sticky).pt(6).pb(8).gap(6)
        .child(rings)
        .child(h_flex().flex_none().px(16).gap(8).items_center()
          .child(div().flex_none().font_family(SIGN).font_weight(700).text_size(12).text_color(C.orangeInk).child(spaced(when ? `NOTEPAD · ${when}` : "NOTEPAD")))
          .child(div().flex_1())
          .child(div().flex_none().font_family(MONO).text_size(12).text_color(C.faint).child(note === "saved" ? "saved" : "")))
        .child(div().h(2).mx(16).flex_none().bg(C.orange + "55"))
        .child(v_flex().flex_1().min_h(0).px(14).child(this.pad.view(`fp-${this.at}`, C.sticky)))
        .when(Boolean(note) && note !== "saved", (el) => el.child(div().px(16).flex_none().text_size(12).text_color(C.alarm).truncate().child(note))));
  }
}
