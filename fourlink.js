// Port of python/fourlink.py. Coordinate system: see README.md.
// Convert the axle/frame inputs into one frame-bottom coordinate system. Adds
// cfg.brackets (all joint points in frame Z) and cfg.packaging (tub floor Z,
// bridge top in axle-local coordinates). Mirrors resolve() in python/fourlink.py.
export function resolve(cfg) {
  const { vehicle: v, axle: ax, frame: fr } = cfg;
  const zc = v.tire_radius - v.frame_height;
  const toFrame = ([x, y, h]) => [x, y, h + zc];
  const out = { ...cfg, brackets: { ua: toFrame(ax.ua), la: toFrame(ax.la), lf: fr.lf, uf_holes: fr.uf_holes } };
  if (ax.bridge_top && fr.tub_floor_z !== undefined) out.packaging = { tub_floor_z: fr.tub_floor_z, bridge_top: ax.bridge_top };
  return out;
}

// Bolt axis at ride height from a {axis, angle} entry (see examples/rear-4-link.yaml).
// sx: +1 if the link's other end is forward, -1 if rearward. inb: sign of inboard Y.
export function boltVector(b, sx, inb) {
  const a = (b.angle * Math.PI) / 180;
  if (b.axis === "vertical") return [sx * Math.sin(a), 0, Math.cos(a)];
  // Perpendicular (in plan) to the aim direction [sx cos a, inb sin a].
  if (b.axis === "horizontal") return [-inb * Math.sin(a), sx * Math.cos(a), 0];
  throw new Error(`unknown bolt axis "${b.axis}"`);
}

export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const dist = (a, b) => Math.hypot(...sub(a, b));
export const unit = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };
export const mirror = (p) => [p[0], -p[1], p[2]];
export const deg = (r) => (r * 180) / Math.PI;

export function sideIC(la, lf, ua, uf) {
  const ml = (lf[2] - la[2]) / (lf[0] - la[0]);
  const mu = (uf[2] - ua[2]) / (uf[0] - ua[0]);
  const x = (ua[2] - la[2] + ml * la[0] - mu * ua[0]) / (ml - mu);
  return [x, la[2] + ml * (x - la[0])];
}

export function planCross(a1, f1, a2, f2) {
  const d1 = sub(f1, a1), d2 = sub(f2, a2);
  const t = ((a2[0] - a1[0]) * d2[1] - (a2[1] - a1[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0]);
  return [a1[0] + t * d1[0], a1[2] + t * d1[2]];
}

export function antiSquat(la, lf, ua, uf, groundZ, axleX, cgZ, wheelbase) {
  const [icx, icz] = sideIC(la, lf, ua, uf);
  return { as: ((icz - groundZ) / (icx - axleX) / ((cgZ - groundZ) / wheelbase)) * 100, icx, icz };
}

export function rollAxis(uaL, uaR, ufL, ufR, laL, laR, lfL, lfR) {
  const [ux, uz] = planCross(uaL, ufL, uaR, ufR);
  const [lx, lz] = planCross(laL, lfL, laR, lfR);
  const slope = (lz - uz) / (lx - ux);
  return { angle: deg(Math.atan(slope)), rc: uz - slope * ux, upper: [ux, uz], lower: [lx, lz] };
}

export function rot(roll, pitch, yaw) {
  const [cr, sr, cp, sp, cy, sy] = [Math.cos(roll), Math.sin(roll), Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw)];
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ];
}
const apply = (m, v) => m.map((row) => dot(row, v));

function solve(a, b) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

// Rigid axle located by four links. Pose q = [dx, dy, dz, roll, pitch, yaw] about the
// ride-height axle center; wheel travel is measured at wheel center.
export class Axle {
  constructor(cfg, ufHole = "mid") {
    const v = cfg.vehicle, b = cfg.brackets;
    this.h = v.frame_height;
    this.halfTrack = v.track / 2;
    this.center = [0, 0, v.tire_radius - this.h];
    const uf = b.uf_holes[ufHole];
    this.links = [
      [sub(b.ua, this.center), uf, "ua", "uf"],
      [sub(mirror(b.ua), this.center), mirror(uf), "ua", "uf"],
      [sub(b.la, this.center), b.lf, "la", "lf"],
      [sub(mirror(b.la), this.center), mirror(b.lf), "la", "lf"],
    ];
    const q0 = [0, 0, 0, 0, 0, 0];
    this.length = this.links.map(([a, f]) => dist(this.world(q0, a), f));
    const bolt = cfg.joints.bolt;
    this.bolts = this.links.map(([a, , an, fn]) => {
      const inb = a[1] > 0 ? -1 : 1;
      return [boltVector(bolt[an], 1, inb), boltVector(bolt[fn], -1, inb)];
    });
  }

  world(q, p) {
    const r = apply(rot(q[3], q[4], q[5]), p);
    return [0, 1, 2].map((i) => this.center[i] + q[i] + r[i]);
  }

  residual(q, zl, zr) {
    const e = this.links.map(([a, f], i) => dist(this.world(q, a), f) - this.length[i]);
    e.push(this.world(q, [0, this.halfTrack, 0])[2] - this.center[2] - zl);
    e.push(this.world(q, [0, -this.halfTrack, 0])[2] - this.center[2] - zr);
    return e;
  }

  pose(zl, zr, q = [0, 0, 0, 0, 0, 0]) {
    q = [...q];
    for (let it = 0; it < 50; it++) {
      const e = this.residual(q, zl, zr);
      if (Math.max(...e.map(Math.abs)) < 1e-10) return q;
      const jac = Array.from({ length: 6 }, () => new Array(6).fill(0));
      for (let j = 0; j < 6; j++) {
        const qq = [...q];
        qq[j] += 1e-7;
        this.residual(qq, zl, zr).forEach((ei, i) => { jac[i][j] = (ei - e[i]) / 1e-7; });
      }
      const d = solve(jac, e.map((x) => -x));
      q = q.map((qi, i) => qi + d[i]);
    }
    throw new Error(`pose did not converge for travel ${zl}/${zr}`);
  }

  points(q) {
    return { axle: this.links.map(([a]) => this.world(q, a)), frame: this.links.map(([, f]) => f) };
  }

  // Top of the bridge above each UA joint, in world coordinates.
  bridgeTops(q, cfg) {
    const [x, y, h] = cfg.packaging.bridge_top;
    return [y, -y].map((yy) => this.world(q, [x, yy, h]));
  }

  tubGap(q, cfg) {
    if (!cfg.packaging) return null;
    return cfg.packaging.tub_floor_z - Math.max(...this.bridgeTops(q, cfg).map((p) => p[2]));
  }

  // World bolt axes per link: [axle end, frame end].
  boltAxes(q) {
    const m = rot(q[3], q[4], q[5]);
    return this.bolts.map(([ba, bf]) => [apply(m, ba), bf]);
  }

  misalignment(q) {
    const m = rot(q[3], q[4], q[5]);
    const { axle, frame } = this.points(q);
    return this.bolts.map(([ba, bf], i) => {
      const d = unit(sub(frame[i], axle[i]));
      return [apply(m, ba), bf].map((b) => deg(Math.asin(Math.min(1, Math.abs(dot(d, b))))));
    });
  }
}

// Static ride-height metrics for one UF hole.
export function staticAnalysis(cfg, hole = "mid") {
  const v = cfg.vehicle, b = cfg.brackets;
  const { ua, la, lf } = b;
  const uf = b.uf_holes[hole];
  const ground = -v.frame_height;
  const ic = sideIC(la, lf, ua, uf);
  return {
    separation: ua[2] - la[2],
    upperLength: dist(ua, uf),
    lowerLength: dist(la, lf),
    upperSide: deg(Math.atan((uf[2] - ua[2]) / (uf[0] - ua[0]))),
    lowerSide: deg(Math.atan((lf[2] - la[2]) / (lf[0] - la[0]))),
    upperPlan: deg(Math.atan((uf[1] - ua[1]) / (uf[0] - ua[0]))),
    lowerPlan: deg(Math.atan((la[1] - lf[1]) / (lf[0] - la[0]))),
    ic,
    antiSquat: v.cg_above_frame.map((c) => antiSquat(la, lf, ua, uf, ground, 0, c, v.wheelbase).as),
    roll: rollAxis(ua, mirror(ua), uf, mirror(uf), la, mirror(la), lf, mirror(lf)),
  };
}

// Metrics at a solved pose (travel at wheel center, driver/passenger).
export function poseAnalysis(cfg, axle, zl, zr, q) {
  const v = cfg.vehicle;
  const { axle: [uaL, uaR, laL, laR], frame: [ufL, ufR, lfL, lfR] } = axle.points(q);
  const ground = -v.frame_height + (zl + zr) / 2;
  const axleX = axle.center[0] + q[0];
  const as = v.cg_above_frame.map((c) => antiSquat(laL, lfL, uaL, ufL, ground, axleX, c, v.wheelbase));
  return {
    q, ground,
    antiSquat: as.map((a) => a.as),
    ic: [as[0].icx, as[0].icz],
    roll: rollAxis(uaL, uaR, ufL, ufR, laL, laR, lfL, lfR),
    axleRoll: deg(q[3]), pinion: -deg(q[4]), steer: deg(q[5]),
    misalignment: axle.misalignment(q),
    tubGap: axle.tubGap(q, cfg),
  };
}
