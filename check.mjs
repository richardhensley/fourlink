// Cross-check the JS solver against python/travel_4link.py.
// Usage: python -c "import json,yaml;print(json.dumps(yaml.safe_load(open('examples/rear-4-link.yaml'))))" | node check.mjs
import { Axle, poseAnalysis, resolve, staticAnalysis } from "./site/fourlink.js";

const cfg = resolve(JSON.parse(await new Promise((r) => { let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => r(s)); })));
const s = staticAnalysis(cfg);
console.log(`static AS ${s.antiSquat.map((a) => a.toFixed(1)).join("/")} roll ${s.roll.angle.toFixed(2)} RC ${(s.roll.rc + cfg.vehicle.frame_height).toFixed(1)}`);
const axle = new Axle(cfg);
for (const [zl, zr] of [[-8, -8], [6, 6], [6, -8], [0, -8]]) {
  const p = poseAnalysis(cfg, axle, zl, zr, axle.pose(zl, zr));
  const m = p.misalignment, w = (i, j) => Math.max(m[i][j], m[i + 1][j]).toFixed(1);
  console.log(`${zl}/${zr} pinion ${p.pinion.toFixed(2)} steer ${p.steer.toFixed(2)} dY ${p.q[1].toFixed(2)} AS ${p.antiSquat[0].toFixed(1)} roll ${p.roll.angle.toFixed(2)} UA/UF/LA/LF ${w(0, 0)} ${w(0, 1)} ${w(2, 0)} ${w(2, 1)} tub ${p.tubGap.toFixed(2)}`);
  const d = p.driveline;
  if (d) console.log(`  shaft ${d.length.toFixed(2)} ${d.shaftSide.toFixed(1)} pinion ${d.pinionSide.toFixed(1)} err ${d.error.toFixed(1)} joints ${d.tcaseJoint.toFixed(1)} ${d.pinionJoint.toFixed(1)}`);
}
