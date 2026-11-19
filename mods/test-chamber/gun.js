// Right panel: the portal gun. Click it to aim (aim.js): left click places a terminal, right
// click a notepad, Esc holsters. Under it: FILES / CHANGES, LIGHTS and MOTION.
// The press on this panel also records its box (GEO.gun): its bottom edge is the work area's.

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, layout, shared, setShared, checking, nextCommand } from "herdr";
import { C, SIGN, label, find, spaced, isDark, THEMES, GEO, learn } from "./kit.js";
import { startAim } from "./aim.js";

// LIGHTS: switch the layout between its light and dark theme (the palette follows the theme).
export const toggleLights = () => run("app.theme", { name: isDark() ? THEMES.light : THEMES.dark });

export class Gun {
  init(cx) {
    if (checking()) return;
    // Key commands: keys.json can bind "test-chamber.aim" and "test-chamber.lights".
    cx.spawn(async () => {
      for (;;) {
        const c = await nextCommand();
        if (c === "aim") startAim();
        else if (c === "lights") toggleLights();
      }
    });
  }

  panelKey(id, text, panel, body) {
    const on = panel && !panel.hidden && body?.active === id;
    return h_flex().id(`pk-${id}`).flex_1().h(30).items_center().justify_center().rounded(4).border(2)
      .border_color(on ? C.blue : C.seam).bg(on ? C.blueBg : "#00000000")
      .font_family(SIGN).font_weight(700).text_size(13).text_color(on ? C.blueInk : C.ink2)
      .cursor_pointer().hover((s) => s.border_color(C.blue))
      .on_click(() => {
        if (on) run("layout.hide", { id: "panel" });
        else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
      })
      .child(spaced(text));
  }

  toggle(id, text, onClick) {
    return h_flex().id(id).flex_1().h(30).items_center().justify_center().rounded(4).border(2).border_color(C.seam)
      .font_family(SIGN).font_weight(700).text_size(12).text_color(C.ink2).cursor_pointer().hover((s) => s.border_color(C.blue))
      .on_click(() => onClick()).child(spaced(text));
  }

  hint(color, button, what) {
    return h_flex().flex_none().gap(8).items_center()
      .child(div().w(10).h(10).flex_none().rounded(5).bg(color))
      .child(div().flex_none().font_family(SIGN).font_weight(700).text_size(12).text_color(C.ink2).child(spaced(button)))
      .child(div().flex_1().min_w(0).text_size(13).text_color(C.label).truncate().child(what));
  }

  render() {
    const still = Boolean(shared("chamber.still"));
    const root = layout();
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const glow = div().absolute().top(0).left(0).size_full().rounded(12).border(3).border_color(C.blue + "55");

    return v_flex().id("chamber-gun").size_full().p(14).gap(12).rounded(6).border(2).border_color(C.seam).bg(C.panel)
      .on_mouse_down("left", (e) => learn(GEO, "gun", e))
      .child(label("PORTAL GUN"))
      .child(v_flex().id("gun-fire").relative().flex_1().min_h(0).items_center().justify_center().gap(14).rounded(12)
        .cursor_pointer().hover((s) => s.bg(C.hover)).on_click(() => startAim(true))
        .child(still ? glow : glow.loop("opacity", { from: 0.15, to: 0.9, period: 2200 }))
        .child(image("mods/test-chamber/gun.svg").w(196).h(114).flex_none())
        .child(div().font_family(SIGN).font_weight(700).text_size(17).text_color(C.ink).child(spaced("CLICK TO AIM"))))
      .child(v_flex().flex_none().gap(6)
        .child(this.hint(C.blue, "LEFT", "terminal: Claude, Codex or shell"))
        .child(this.hint(C.orange, "RIGHT", "notepad pane"))
        .child(this.hint(C.faint, "ESC", "holster")))
      .child(div().h(2).flex_none().bg(C.rule))
      .child(h_flex().flex_none().gap(8)
        .child(this.panelKey("files", "FILES", panel, body))
        .child(this.panelKey("changes", "CHANGES", panel, body)))
      .child(h_flex().flex_none().gap(8)
        .child(this.toggle("lights", isDark() ? "LIGHTS OFF" : "LIGHTS ON", () => toggleLights()))
        .child(this.toggle("motion", still ? "MOTION OFF" : "MOTION ON", () => setShared("chamber.still", !still))));
  }
}
