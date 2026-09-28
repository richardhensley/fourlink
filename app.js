import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import yaml from "js-yaml";
import { Axle, mirror, poseAnalysis, resolve, rot, staticAnalysis } from "./fourlink.js";
import { CALC_HELP, SECTION_NOTES, dataHelp } from "./help.js";

const $ = (id) => document.getElementById(id);
const DEFAULT = "examples/rear-4-link.yaml";
const TIRE_WIDTH = 12.5;
// raw = the YAML as entered (axle/frame sections); cfg = resolved into frame coordinates.
let raw, cfg, axle, fileName = "rear-4-link.yaml";

// ---------- config / UI ----------
function setConfig(next, name) {
  try {
    const resolved = resolve(next);
    axle = new Axle(resolved, holeName(resolved));
    raw = next;
    cfg = resolved;
    if (name) fileName = name;
    $("err").textContent = "";
    $("file").textContent = fileName;
    const holes = Object.keys(cfg.brackets.uf_holes);
    const keep = $("hole").value;
    $("hole").innerHTML = holes.map((h) => `<option>${h}</option>`).join("");
    $("hole").value = holes.includes(keep) ? keep : holes.includes("mid") ? "mid" : holes[0];
    axle = new Axle(cfg, $("hole").value);
    for (const id of ["zl", "zr"]) {
      const el = $(id), first = !el.dataset.init;
      Object.assign(el, { min: -cfg.travel.droop, max: cfg.travel.bump });
      if (first) { el.value = 0; el.dataset.init = "1"; }
    }
    // CG slider spans the provided low/high estimates; keep the current value if still in range.
    const [lo, hi] = [Math.min(...cfg.vehicle.cg_above_frame), Math.max(...cfg.vehicle.cg_above_frame)];
    const cgEl = $("cg"), prev = cgEl.dataset.init ? +cgEl.value : lo;
    Object.assign(cgEl, { min: lo, max: hi });
    cgEl.value = Math.min(hi, Math.max(lo, prev));
    cgEl.dataset.init = "1";
    renderForm(raw);
    buildScene();
    update();
  } catch (e) {
    $("err").textContent = String(e.message ?? e);
  }
}
const holeName = (c) => ($("hole").value in c.brackets.uf_holes ? $("hole").value : "mid" in c.brackets.uf_holes ? "mid" : Object.keys(c.brackets.uf_holes)[0]);

// ---------- data entry form (generated from the config structure) ----------
const BOLT_OPTIONS = ["horizontal", "vertical"];
const AXES = ["X", "Y", "Z above frame bottom"];
const AXLE_AXES = ["X", "Y", "height above axle center"];
const esc = (s) => String(s).replace(/"/g, "&quot;");
const isPoint = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number");
const isPairs = (v) => Array.isArray(v) && v.every((p) => Array.isArray(p));

// Used only by python/travel_4link.py tables; kept in the YAML, hidden in the viewer.
const HIDDEN = new Set(["travel.step", "travel.articulation"]);

function fieldHtml(key, value, path) {
  const p = path.join(".");
  if (HIDDEN.has(p)) return "";
  const h = dataHelp(p);
  const attrs = h ? ` data-help="data:${p}" data-hl="${h.hl ?? ""}"` : "";
  const mark = h ? `<span class="q">?</span>` : "";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const note = path.length === 1 && SECTION_NOTES[key] ? `<div class="note">${SECTION_NOTES[key]}</div>` : "";
    return `<fieldset><legend${attrs}>${key}${mark}</legend>${note}${Object.entries(value).map(([k, v]) => fieldHtml(k, v, [...path, k])).join("")}</fieldset>`;
  }
  let input;
  if (isPoint(value)) {
    const axes = path[0] === "axle" ? AXLE_AXES : AXES;
    input = value.map((n, i) => `<input type="number" step="any" data-path="${p}" data-i="${i}" value="${n}" title="${axes[i]}" placeholder="${axes[i]}">`).join("");
  } else if (isPairs(value)) {
    input = `<input type="text" data-path="${p}" data-kind="pairs" value="${esc(value.map((q) => q.join(", ")).join("; "))}" title="pairs: a, b; c, d">`;
  } else if (Array.isArray(value)) {
    input = value.map((n, i) => `<input type="number" step="any" data-path="${p}" data-i="${i}" value="${n}">`).join("");
  } else if (typeof value === "number") {
    input = `<input type="number" step="any" data-path="${p}" value="${value}">`;
  } else if (path[0] === "joints" && path[1] === "bolt" && key === "axis") {
    input = `<select data-path="${p}">${BOLT_OPTIONS.map((o) => `<option${o === value ? " selected" : ""}>${o}</option>`).join("")}</select>`;
  } else {
    input = `<input type="text" data-path="${p}" value="${esc(value)}">`;
  }
  return `<div class="field"${attrs}><span>${key}${mark}</span><span class="inputs">${input}</span></div>`;
}

function renderForm(c) {
  $("form").innerHTML = `<div class="coords" data-help="data:coords" data-hl="joints" data-title="Coordinate system">X from rear axle centerline, Y from vehicle centerline. Vertical: <b>axle</b> points from axle center, <b>frame</b> points from frame bottom. Frame height joins them.<span class="q">?</span></div>` +
    Object.entries(c).map(([k, v]) => fieldHtml(k, v, [k])).join("");
}

function readForm() {
  const next = structuredClone(raw);
  for (const el of $("form").querySelectorAll("[data-path]")) {
    const keys = el.dataset.path.split(".");
    const last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], next);
    if (el.dataset.kind === "pairs") {
      obj[last] = el.value.split(";").map((s) => s.trim()).filter(Boolean).map((s) => s.split(",").map(Number));
    } else if (el.dataset.i !== undefined) {
      obj[last][+el.dataset.i] = Number(el.value);
    } else {
      obj[last] = el.type === "number" ? Number(el.value) : el.value;
    }
  }
  return next;
}

document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== b.dataset.tab));
}));

$("load").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { setConfig(yaml.load(await file.text()), file.name); } catch (err) { $("err").textContent = String(err.message ?? err); }
  e.target.value = "";
};
$("apply").onclick = () => setConfig(readForm());
$("save").onclick = () => {
  const blob = new Blob([yaml.dump(readForm(), { flowLevel: 2, lineWidth: -1 })], { type: "text/yaml" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName });
  a.click();
  URL.revokeObjectURL(a.href);
};
$("hole").onchange = () => { axle = new Axle(cfg, $("hole").value); update(); };
$("zl").oninput = () => { if ($("lock").checked) $("zr").value = $("zl").value; update(); };
$("zr").oninput = () => { if ($("lock").checked) $("zl").value = $("zr").value; update(); };
$("cg").oninput = () => update();
$("reset").onclick = () => { $("zl").value = $("zr").value = 0; update(); };

const f = (v, d = 2) => (v >= 0 ? "+" : "") + v.toFixed(d);
// Angle as "base (delta total)", e.g. "-2.5° (+1.2° -1.3°)".
const angText = (base, delta) => `${f(base, 1)}° (${f(delta, 1)}° ${f(base + delta, 1)}°)`;
// Row: [label, value, bad, help id, highlight override]
const rows = (list) => list.map(([k, v, bad, id, hl]) =>
  `<tr data-help="calc:${id}" data-hl="${hl ?? CALC_HELP[id]?.hl ?? ""}"><td>${k}<span class="q">?</span></td><td class="${bad ? "bad" : ""}">${v}</td></tr>`).join("");

// ---------- help panel and drawing highlight ----------
let hlKey = null;
function applyHighlight() {
  for (const el of document.querySelectorAll("svg .glow")) el.classList.remove("glow");
  if (hlKey) for (const el of document.querySelectorAll(`svg .hl-${hlKey}`)) el.classList.add("glow");
}
let helpEl = null;
function showHelp(el) {
  if (el === helpEl) return;
  helpEl = el;
  const [kind, id] = (el?.dataset.help ?? ":").split(/:(.*)/);
  const h = kind === "data" ? dataHelp(id) : CALC_HELP[id];
  hlKey = el?.dataset.hl || null;
  applyHighlight();
  const box = $("help");
  if (!h) { box.hidden = true; return; }
  const clean = (s) => s.replace(/\?$/, "").trim();
  const title = el.dataset.title ?? (clean((el.querySelector("td, span, legend") ?? el).textContent) || clean(el.textContent));
  box.innerHTML = `<div class="help-title">${title}</div>` + [
    h.what && `<b>What</b>${h.what}`,
    h.measure && `<b>How to measure</b>${h.measure}`,
    h.impact && `<b>What it affects</b>${h.impact}`,
  ].filter(Boolean).map((s) => `<div class="help-row">${s}</div>`).join("");
  box.hidden = false;
  // Float the card just right of the panel, level with the hovered row, kept on screen.
  const r = el.getBoundingClientRect();
  const left = $("panel").getBoundingClientRect().right + 14;
  const top = Math.max(8, Math.min(r.top + r.height / 2 - 24, innerHeight - box.offsetHeight - 8));
  Object.assign(box.style, { left: `${left}px`, top: `${top}px` });
  box.style.setProperty("--arrow", `${Math.max(12, Math.min(box.offsetHeight - 12, r.top + r.height / 2 - top))}px`);
}
$("panel").addEventListener("mouseover", (e) => showHelp(e.target.closest("[data-help]")));
$("panel").addEventListener("focusin", (e) => showHelp(e.target.closest("[data-help]")));
$("panel").addEventListener("mouseleave", () => showHelp(null));
$("panel").addEventListener("scroll", () => showHelp(null));

// ---------- update ----------
const JOINT_IDX = [["UA", 0, 0], ["UF", 0, 1], ["LA", 2, 0], ["LF", 2, 1]];
// Worst misalignment per joint over a 1" grid of driver/passenger travel; cached per axle.
let worstCache = null;
function worstMisalignment() {
  if (worstCache?.axle === axle) return worstCache.w;
  const w = Object.fromEntries(JOINT_IDX.map(([n]) => [n, [0, [0, 0]]]));
  const { bump, droop } = cfg.travel;
  for (let zl = -droop; zl <= bump; zl++) {
    let q = [0, 0, 0, 0, 0, 0];
    for (let zr = -droop; zr <= bump; zr++) {
      q = axle.pose(zl, zr, q);
      const m = axle.misalignment(q);
      for (const [n, i, j] of JOINT_IDX) {
        const d = Math.max(m[i][j], m[i + 1][j]);
        if (d > w[n][0]) w[n] = [d, [zl, zr]];
      }
    }
  }
  worstCache = { axle, w };
  return w;
}

function update() {
  const zl = +$("zl").value, zr = +$("zr").value;
  $("zlv").textContent = f(zl, 2);
  $("zrv").textContent = f(zr, 2);
  const cgSel = +$("cg").value;
  const h = cfg.vehicle.frame_height;
  $("cgv").textContent = `+${cgSel.toFixed(2)} above frame (${(cgSel + h).toFixed(2)} above ground)`;
  // Calculations use the single CG selected on the slider.
  const c = { ...cfg, vehicle: { ...cfg.vehicle, cg_above_frame: [cgSel] } };
  const hole = $("hole").value;
  const s = staticAnalysis(c, hole);
  $("static").innerHTML = rows([
    ["Anti-squat", s.antiSquat[0].toFixed(1) + "%", false, "as"],
    ["IC X / height above ground", `${s.ic[0].toFixed(1)} / ${(s.ic[1] + h).toFixed(1)}`, false, "ic"],
    ["Roll axis", f(s.roll.angle) + "°", false, "roll"],
    ["Roll center above ground", (s.roll.rc + h).toFixed(1), false, "rc"],
    ["Separation", s.separation.toFixed(3), false, "sep"],
    ["Triangulation (2U + 2L)", (2 * s.upperPlan + 2 * s.lowerPlan).toFixed(1) + "°", false, "tri"],
    ["Upper length / side angle / top angle", `${s.upperLength.toFixed(2)} / ${f(s.upperSide, 1)}° / ${s.upperPlan.toFixed(1)}°`, false, "upper"],
    ["Lower length / side angle / top angle", `${s.lowerLength.toFixed(2)} / ${f(s.lowerSide, 1)}° / ${s.lowerPlan.toFixed(1)}°`, false, "lower"],
    ["Upper / lower length", `${(100 * s.upperLength / s.lowerLength).toFixed(0)}%`, false, "ratio"],
  ]);

  let p;
  try {
    p = poseAnalysis(c, axle, zl, zr, axle.pose(zl, zr));
  } catch (e) {
    $("err").textContent = String(e.message ?? e);
    return;
  }
  const limit = cfg.joints.misalignment_limit;
  const m = p.misalignment, m0 = axle.misalignment([0, 0, 0, 0, 0, 0]);
  const mis = (i, j, mm = m) => Math.max(mm[i][j], mm[i + 1][j]);
  const heave = zl === zr;
  const w = worstMisalignment();
  $("static").innerHTML += rows(JOINT_IDX.map(([n, i, j]) => {
    const [deg, at] = w[n];
    return [`${n} misalignment worst over travel`, `${deg.toFixed(1)}° at ${f(at[0], 0)}/${f(at[1], 0)}`, deg > limit, "mis_worst", n.toLowerCase()];
  }));
  $("pose").innerHTML = rows([
    [heave ? "Anti-squat" : "Anti-squat, driver side", p.antiSquat[0].toFixed(1) + "%", false, "as"],
    ["Roll axis", f(p.roll.angle) + "°", false, "roll"],
    ["Roll center above ground", (p.roll.rc - p.ground).toFixed(1), false, "rc"],
    ["Pinion (+ nose up)", angText(c.vehicle.pinion_angle ?? 0, p.pinion), false, "pinion"],
    ["Axle roll", f(p.axleRoll) + "°", false, "axle_roll"],
    ["Roll steer (+ nose to driver)", f(p.steer) + "°", false, "steer"],
    ["Axle fore/aft / lateral", `${f(p.q[0])} / ${f(p.q[1])}`, false, "shift"],
    ["Bridge top to tub floor", p.tubGap === null ? "no packaging data" : p.tubGap.toFixed(2) + '"', p.tubGap < 0, "tub"],
    ...JOINT_IDX.map(([n, i, j]) => {
      const r = mis(i, j, m0), cur = mis(i, j);
      return [`${n} misalignment (limit ${limit}°)`, `${r.toFixed(1)}° (${f(cur - r, 1)}° ${cur.toFixed(1)}°)`, cur > limit, "mis", n.toLowerCase()];
    }),
  ]);
  drawViews(p, cgSel);
  lastViews = [p, cgSel];
  applyHighlight();
  updateScene(p);
}

// ---------- 2D views ----------
// Fixed bounds [x0, x1, y0, y1] in vehicle inches so the view doesn't rescale with travel.
// Label size in screen pixels, converted to drawing units so both views read the same.
const LABEL_PX = 11;
function svgView(el, [x0, x1, y0, y1], draw) {
  const r = el.getBoundingClientRect();
  const fs = LABEL_PX / (Math.min(r.width / (x1 - x0), r.height / (y1 - y0)) || 4);
  // Flip Y so +up in the drawing; front of vehicle to the left.
  el.setAttribute("viewBox", `${-x1} ${-y1} ${x1 - x0} ${y1 - y0}`);
  const P = ([x, y]) => `${-x},${-y}`;
  const out = [];
  const line = (a, b, c, w = 0.5, dash = "") => out.push(`<line x1="${-a[0]}" y1="${-a[1]}" x2="${-b[0]}" y2="${-b[1]}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`);
  const dot = (a, c, r = 1) => out.push(`<circle cx="${-a[0]}" cy="${-a[1]}" r="${r}" fill="${c}"/>`);
  const circle = (a, r, c) => out.push(`<circle cx="${-a[0]}" cy="${-a[1]}" r="${r}" fill="none" stroke="${c}" stroke-width="0.4"/>`);
  const poly = (list, c) => out.push(`<polygon points="${list.map(P).join(" ")}" fill="none" stroke="${c}" stroke-width="0.4"/>`);
  const text = (a, s, c = "#333", anchor = "start") => out.push(`<text x="${-a[0]}" y="${-a[1]}" font-size="${fs}" fill="${c}" text-anchor="${anchor}">${s}</text>`);
  // Group drawing under highlight keys, e.g. g("ic upper", () => ...).
  const g = (keys, fn) => { out.push(`<g class="${keys.split(" ").map((k) => "hl-" + k).join(" ")}">`); fn(); out.push("</g>"); };
  draw({ line, dot, circle, poly, text, g });
  el.innerHTML = out.join("");
}

// Bolt axis through a joint, projected onto view axes (ax, ay); colored green→red by misalignment.
const BOLT_HALF = 2.5;
function boltTick(line, pt, b, deg, ax, ay) {
  if (Math.hypot(b[ax], b[ay]) < 0.2) return;
  const hue = Math.max(0, 120 * (1 - deg / cfg.joints.misalignment_limit));
  const e = (s) => [pt[ax] + s * BOLT_HALF * b[ax], pt[ay] + s * BOLT_HALF * b[ay]];
  line(e(-1), e(1), `hsl(${hue},80%,40%)`, 0.8);
}
let lastViews = null;
addEventListener("resize", () => lastViews && drawViews(...lastViews));
function drawViews(p, cgSel) {
  const v = cfg.vehicle;
  const { axle: A, frame: F } = axle.points(p.q);
  const center = axle.world(p.q, [0, 0, 0]);
  const wb = v.wheelbase;
  const cg = [Math.min(...v.cg_above_frame), Math.max(...v.cg_above_frame)];
  const clamp = (x) => Math.max(-30, Math.min(wb + 20, x));
  const [icx, icz] = p.ic;
  const { upper: ru, lower: rl } = p.roll;
  const B = axle.boltAxes(p.q);
  const R = axle.points([0, 0, 0, 0, 0, 0]);
  const deg = (dy, dx) => Math.atan2(dy, dx) * 180 / Math.PI;
  const plan = (P, i) => deg(Math.abs(P.frame[i][1] - P.axle[i][1]), P.frame[i][0] - P.axle[i][0]);
  const side = (P, i) => deg(P.frame[i][2] - P.axle[i][2], P.frame[i][0] - P.axle[i][0]);
  const angLabel = (fn, i) => { const r = fn(R, i); return angText(r, fn({ axle: A, frame: F }, i) - r); };

  // Side view (X, Z): driver side links.
  const top = Math.max(cg[1], cfg.packaging?.tub_floor_z ?? 0) + 6;
  const sideBounds = [-v.tire_radius - 6, wb + 22, -v.frame_height - cfg.travel.droop - 3, top];
  const JOINTS = ["ua", "ua", "la", "la"], FJOINTS = ["uf", "uf", "lf", "lf"];
  svgView($("side"), sideBounds, ({ line, dot, circle, text, g }) => {
    const gx = [-40, wb + 30];
    g("ground", () => line([gx[0], p.ground], [gx[1], p.ground], "#888", 0.4));
    line([gx[0], 0], [gx[1], 0], "#bbb", 0.4, "2,1");
    text([gx[1] - 16, 0.8], "frame bottom Z=0", "#999");
    g("axle", () => { circle([center[0], center[2]], v.tire_radius, "#999"); dot([center[0], center[2]], "#555", 0.8); });
    // Tub floor and bridge top.
    if (cfg.packaging) g("tub", () => {
      const tub = cfg.packaging.tub_floor_z;
      line([-15, tub], [45, tub], "#795548", 0.6);
      text([46, tub + 1], `tub ${f(p.tubGap)}"`, p.tubGap < 0 ? "#c00" : "#795548");
      const bt = axle.bridgeTops(p.q, cfg)[0];
      line([center[0], center[2]], [bt[0], bt[2]], "#555", 1.5);
      dot([bt[0], bt[2]], "#795548", 0.8);
    });
    // Pinion centerline (rotates with the housing) and ride-height reference.
    g("pinion", () => {
      const pin = axle.world(p.q, [14, 0, 0]);
      line([center[0], center[2]], [center[0] + 14, center[2]], "#bbb", 0.3, "1,1");
      line([center[0], center[2]], [pin[0], pin[2]], "#ef6c00", 0.9);
      text([center[0] - 1, center[2] - 0.5], `pinion ${angText(v.pinion_angle ?? 0, p.pinion)}`, "#ef6c00");
    });
    // Separation between UA and LA joint centers.
    g("sep", () => {
      const sx = Math.min(A[0][0], A[2][0]) - 3;
      line([sx, A[2][2]], [sx, A[0][2]], "#bbb", 0.3);
      line([sx - 1, A[0][2]], [A[0][0], A[0][2]], "#bbb", 0.2);
      line([sx - 1, A[2][2]], [A[2][0], A[2][2]], "#bbb", 0.2);
      text([sx - 1, 1], `sep ${(R.axle[0][2] - R.axle[2][2]).toFixed(2)}`, "#999");
    });
    const cp = [center[0], p.ground];
    // Link lines extended to IC.
    g("upper ic as", () => {
      line([A[0][0], A[0][2]], [F[0][0], F[0][2]], "#1565c0", 1.2);
      line([F[0][0], F[0][2]], [icx, icz], "#1565c0", 0.3, "1,1");
      text([F[0][0] + 1, F[0][2] + 1], angLabel(side, 0), "#1565c0", "end");
    });
    g("lower ic as", () => {
      line([A[2][0], A[2][2]], [F[2][0], F[2][2]], "#2e7d32", 1.2);
      line([F[2][0], F[2][2]], [icx, icz], "#2e7d32", 0.3, "1,1");
      text([F[2][0] + 1, F[2][2] - 2.5], angLabel(side, 2), "#2e7d32", "end");
    });
    g("ic as", () => {
      dot([icx, icz], "#d32f2f", 1.2);
      text([icx, icz + 2], "IC");
      if (icx < sideBounds[0] || icx > sideBounds[1] || icz < sideBounds[2] || icz > sideBounds[3])
        text([sideBounds[1] - 2, sideBounds[3] - 4], `IC off view: X ${icx.toFixed(0)}, Z ${f(icz, 1)}`, "#d32f2f");
    });
    // Anti-squat line and 100% reference.
    g("as", () => {
      const asZ = p.ground + ((icz - p.ground) / (icx - cp[0])) * (wb - cp[0]);
      line(cp, [wb, asZ], "#d32f2f", 0.4);
      text([wb + 2, asZ - 1], `anti-squat ${p.antiSquat[0].toFixed(1)}%`, "#d32f2f", "end");
      line(cp, [wb, cgSel], "#999", 0.3, "2,1");
      line([wb, cg[0]], [wb, cg[1]], "#bbb", 1.2);
      dot([wb, cgSel], "#000", 1);
      text([wb + 2, cgSel - 1], `CG ${(cgSel - p.ground).toFixed(1)}`, "#333", "end");
    });
    line([wb, p.ground], [wb, cg[1] + 4], "#ccc", 0.3);
    text([wb - 3, p.ground - 3], "front axle");
    // Roll axis.
    g("roll rc", () => line(ru, [clamp(rl[0]), ru[1] + ((rl[1] - ru[1]) / (rl[0] - ru[0])) * (clamp(rl[0]) - ru[0])], "#8e24aa", 0.5, "3,1"));
    g("rc", () => { dot([0, p.roll.rc], "#8e24aa", 1); text([2, p.roll.rc + 3], `roll center ${(p.roll.rc - p.ground).toFixed(1)}`, "#8e24aa"); });
    [0, 2].forEach((i) => {
      g(`joints ${JOINTS[i]}`, () => { boltTick(line, A[i], B[i][0], p.misalignment[i][0], 0, 2); dot([A[i][0], A[i][2]], "#000", 0.7); });
      g(`joints ${FJOINTS[i]}`, () => { boltTick(line, F[i], B[i][1], p.misalignment[i][1], 0, 2); dot([F[i][0], F[i][2]], "#000", 0.7); });
    });
    text([gx[1] - 16, p.ground - 3], "SIDE  (front ←)");
  });

  // Top view (X, Y): both sides.
  const ht = axle.halfTrack;
  const wheel = (s) => [-1, 1].flatMap((dx) => [-1, 1].map((dy) => axle.world(p.q, [dx * v.tire_radius, s * ht + dy * TIRE_WIDTH / 2, 0])));
  const topBounds = [-v.tire_radius - 6, wb + 22, -ht - TIRE_WIDTH / 2 - 6, ht + TIRE_WIDTH / 2 + 12];
  svgView($("top"), topBounds, ({ line, dot, poly, text, g }) => {
    line([-30, 0], [clamp(rl[0]) + 5, 0], "#bbb", 0.3, "2,1");
    line([0, topBounds[2] + 2], [0, topBounds[3] - 2], "#bbb", 0.3, "2,1");
    text([wb + 20, 0.8], "Y=0 vehicle centerline", "#999");
    text([-1, topBounds[3] - 3], "X=0 axle centerline", "#999");
    g("axle", () => {
      const tl = axle.world(p.q, [0, ht, 0]), tr = axle.world(p.q, [0, -ht, 0]);
      line([tl[0], tl[1]], [tr[0], tr[1]], "#555", 1.5);
      for (const s of [1, -1]) {
        const w = wheel(s);
        poly([w[0], w[1], w[3], w[2]].map((q) => [q[0], q[1]]), "#999");
      }
    });
    for (let i = 0; i < 4; i++) {
      const c = i < 2 ? "#1565c0" : "#2e7d32";
      g(`tri ${i < 2 ? "upper" : "lower"}`, () => {
        line([A[i][0], A[i][1]], [F[i][0], F[i][1]], c, 1.2);
        const dx = F[i][0] - A[i][0], dy = F[i][1] - A[i][1];
        const len = Math.hypot(dx, dy, F[i][2] - A[i][2]);
        // At the front joint: uppers labelled inboard, lowers outboard.
        const dir = Math.sign(A[i][1] || 1) * (i < 2 ? -1 : 1);
        const m = [F[i][0] + 1, F[i][1] + (dir > 0 ? 1.5 : -3.5)];
        text(m, `${angLabel(plan, i)} ${len.toFixed(1)}"`, c, "end");
      });
      g("roll", () => {
        const x = i < 2 ? ru[0] : clamp(rl[0]);
        const t = (x - A[i][0]) / (F[i][0] - A[i][0]);
        line([F[i][0], F[i][1]], [x, A[i][1] + t * (F[i][1] - A[i][1])], c, 0.3, "1,1");
      });
      g(`joints ${JOINTS[i]}`, () => { boltTick(line, A[i], B[i][0], p.misalignment[i][0], 0, 1); dot([A[i][0], A[i][1]], "#000", 0.7); });
      g(`joints ${FJOINTS[i]}`, () => { boltTick(line, F[i], B[i][1], p.misalignment[i][1], 0, 1); dot([F[i][0], F[i][1]], "#000", 0.7); });
    }
    g("roll", () => {
      dot([ru[0], 0], "#1565c0", 1.2);
      text([ru[0] + 2, -3], "upper X");
      if (rl[0] < wb + 20) { dot([rl[0], 0], "#2e7d32", 1.2); text([rl[0] + 2, -3], `lower X ${rl[0].toFixed(0)}`); }
      else text([wb + 10, -3], `lower X ${rl[0].toFixed(0)} →`, "#2e7d32");
    });
    const pa = (i) => Math.atan2(Math.abs(F[i][1] - A[i][1]), F[i][0] - A[i][0]) * 180 / Math.PI;
    g("tri", () => text([wb + 20, -ht - TIRE_WIDTH / 2 + 1], `triangulation ${(pa(0) + pa(1) + pa(2) + pa(3)).toFixed(1)}° (2U ${(pa(0) + pa(1)).toFixed(1)}° + 2L ${(pa(2) + pa(3)).toFixed(1)}°)`));
    text([wb + 20, -ht - TIRE_WIDTH / 2 - 3], "TOP  (front ←, driver ↑)");
  });
}

// ---------- 3D ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
$("three").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef1f5);
const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
camera.up.set(0, 0, 1);
camera.position.set(-90, 110, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(15, 0, -5);
scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-50, 80, 120);
scene.add(sun);

let world = new THREE.Group();
scene.add(world);
const parts = {};
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, ...opts });

function cylinderBetween(mesh, a, b) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  mesh.position.copy(va).add(vb).multiplyScalar(0.5);
  mesh.scale.set(1, dir.length(), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function buildScene() {
  scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  const v = cfg.vehicle;
  const ht = v.track / 2;
  const R = v.tire_radius;

  // Frame bottom plane (Z = 0) and ground grid.
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), mat(0x607d8b, { transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
  plane.position.set(25, 0, 0);
  world.add(plane);
  const grid = new THREE.GridHelper(200, 20, 0x999999, 0xcccccc);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(25, 0, -v.frame_height);
  world.add(grid);
  parts.grid = grid;

  // Axle assembly in axle-local coordinates; pose applied as a matrix.
  const ax = new THREE.Group();
  ax.matrixAutoUpdate = false;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, v.track - TIRE_WIDTH, 16), mat(0x444444));
  ax.add(tube);
  const diff = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), mat(0x555555));
  ax.add(diff);
  const pinion = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 12), mat(0xef6c00));
  pinion.rotation.z = Math.PI / 2;
  pinion.position.x = 10;
  ax.add(pinion);
  parts.tub = null;
  if (cfg.packaging) {
    // Bridge: post from the tube up to the bridge top.
    const [bx, by, postH] = cfg.packaging.bridge_top;
    const post = new THREE.Mesh(new THREE.BoxGeometry(3, 2 * by + 3, postH), mat(0x666666));
    post.position.set(bx, 0, postH / 2);
    ax.add(post);

    // Tub floor (frame-fixed).
    parts.tub = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat(0x795548, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    parts.tub.position.set(5, 0, cfg.packaging.tub_floor_z);
    world.add(parts.tub);
  }
  for (const s of [1, -1]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TIRE_WIDTH, 40, 1, true), mat(0x222222, { side: THREE.DoubleSide }));
    tire.position.y = s * ht;
    ax.add(tire);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(R * 0.55, 24), mat(0x999999, { side: THREE.DoubleSide }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = s * (ht + TIRE_WIDTH / 2);
    ax.add(rim);
  }
  world.add(ax);
  parts.axle = ax;

  // Links, joints, frame brackets.
  const linkGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const jointGeo = new THREE.SphereGeometry(1.5, 16, 12);
  parts.links = axle.links.map(() => { const m = new THREE.Mesh(linkGeo, mat(0x1565c0)); world.add(m); return m; });
  parts.joints = axle.links.flatMap(() => [0, 1].map(() => { const m = new THREE.Mesh(jointGeo, mat(0x2e7d32)); world.add(m); return m; }));

  // Roll axis line.
  parts.rollAxis = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x8e24aa, dashSize: 3, gapSize: 1.5 }));
  world.add(parts.rollAxis);
  resize();
}

function updateScene(p) {
  const r = rot(p.q[3], p.q[4], p.q[5]);
  const c = axle.world(p.q, [0, 0, 0]);
  parts.axle.matrix.set(r[0][0], r[0][1], r[0][2], c[0], r[1][0], r[1][1], r[1][2], c[1], r[2][0], r[2][1], r[2][2], c[2], 0, 0, 0, 1);
  parts.grid.position.z = p.ground;
  parts.tub?.material.color.set(p.tubGap < 0 ? 0xc62828 : 0x795548);
  const { axle: A, frame: F } = axle.points(p.q);
  const limit = cfg.joints.misalignment_limit;
  const color = (deg) => new THREE.Color().setHSL(Math.max(0, 0.33 * (1 - deg / limit)), 0.8, 0.45);
  parts.links.forEach((m, i) => {
    cylinderBetween(m, A[i], F[i]);
    m.material.color.set(i < 2 ? 0x1565c0 : 0x0d47a1);
  });
  p.misalignment.forEach(([ma, mf], i) => {
    parts.joints[2 * i].position.set(...A[i]);
    parts.joints[2 * i].material.color.copy(color(ma));
    parts.joints[2 * i + 1].position.set(...F[i]);
    parts.joints[2 * i + 1].material.color.copy(color(mf));
  });
  const { upper: u, lower: l } = p.roll;
  const x1 = Math.min(l[0], cfg.vehicle.wheelbase + 20);
  const z1 = u[1] + ((l[1] - u[1]) / (l[0] - u[0])) * (x1 - u[0]);
  parts.rollAxis.geometry.setFromPoints([new THREE.Vector3(u[0] - 20, 0, u[1] - ((l[1] - u[1]) / (l[0] - u[0])) * 20), new THREE.Vector3(x1, 0, z1)]);
  parts.rollAxis.computeLineDistances();
}

function resize() {
  const el = $("three");
  renderer.setSize(el.clientWidth, el.clientHeight);
  camera.aspect = el.clientWidth / el.clientHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

// ---------- boot ----------
fetch(DEFAULT, { cache: "no-store" })
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${DEFAULT}: ${r.status}`))))
  .then((t) => setConfig(yaml.load(t), "rear-4-link.yaml"))
  .catch((e) => { $("err").textContent = `Load a YAML file (${e.message})`; });
