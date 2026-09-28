"""Shared 4-link geometry: loading, static metrics, and axle pose solving.

All points use the frame-bottom coordinate system described in README.md.
"""
import math

import yaml

def bolt_vector(b, sx, inb):
    """Bolt axis at ride height from a {axis, angle} entry (see examples/rear-4-link.yaml).
    sx: +1 if the link's other end is forward, -1 if rearward. inb: sign of inboard Y."""
    a = math.radians(b["angle"])
    if b["axis"] == "vertical":
        return [sx * math.sin(a), 0.0, math.cos(a)]
    if b["axis"] == "horizontal":
        # Perpendicular (in plan) to the aim direction [sx cos a, inb sin a].
        return [-inb * math.sin(a), sx * math.cos(a), 0.0]
    raise ValueError(f"unknown bolt axis {b['axis']!r}")


def load(path):
    with open(path) as f:
        return resolve(yaml.safe_load(f))


def resolve(cfg):
    """Convert the axle/frame inputs into one frame-bottom coordinate system.
    Adds cfg["brackets"] (all joint points in frame Z) and cfg["packaging"]
    (tub floor Z, bridge top in axle-local coordinates)."""
    v, ax, fr = cfg["vehicle"], cfg["axle"], cfg["frame"]
    zc = v["tire_radius"] - v["frame_height"]
    to_frame = lambda p: [p[0], p[1], p[2] + zc]
    out = dict(cfg)
    out["brackets"] = {"ua": to_frame(ax["ua"]), "la": to_frame(ax["la"]),
                       "lf": fr["lf"], "uf_holes": fr["uf_holes"]}
    if "bridge_top" in ax and "tub_floor_z" in fr:
        out["packaging"] = {"tub_floor_z": fr["tub_floor_z"], "bridge_top": ax["bridge_top"]}
    return out


def sub(a, b):
    return [a[i] - b[i] for i in range(3)]


def dot(a, b):
    return sum(a[i] * b[i] for i in range(3))


def unit(a):
    n = math.sqrt(dot(a, a))
    return [x / n for x in a]


def mirror(p):
    return [p[0], -p[1], p[2]]


def side_ic(la, lf, ua, uf):
    """Side-view instant center (X, Z) of the lower and upper link lines."""
    ml = (lf[2] - la[2]) / (lf[0] - la[0])
    mu = (uf[2] - ua[2]) / (uf[0] - ua[0])
    x = (ua[2] - la[2] + ml * la[0] - mu * ua[0]) / (ml - mu)
    return x, la[2] + ml * (x - la[0])


def plan_cross(a1, f1, a2, f2):
    """Plan-view crossing of two links; returns (X, Z on link 1)."""
    d1, d2 = sub(f1, a1), sub(f2, a2)
    t = ((a2[0] - a1[0]) * d2[1] - (a2[1] - a1[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0])
    return a1[0] + t * d1[0], a1[2] + t * d1[2]


def anti_squat(la, lf, ua, uf, ground_z, axle_x, cg_z, wheelbase):
    icx, icz = side_ic(la, lf, ua, uf)
    return (icz - ground_z) / (icx - axle_x) / ((cg_z - ground_z) / wheelbase) * 100, icx, icz


def roll_axis(ua_l, ua_r, uf_l, uf_r, la_l, la_r, lf_l, lf_r):
    """Roll axis angle (deg, + = roll oversteer) and its Z at X = 0."""
    ux, uz = plan_cross(ua_l, uf_l, ua_r, uf_r)
    lx, lz = plan_cross(la_l, lf_l, la_r, lf_r)
    slope = (lz - uz) / (lx - ux)
    return math.degrees(math.atan(slope)), uz - slope * ux


def rot(roll, pitch, yaw):
    cr, sr, cp, sp, cy, sy = (math.cos(roll), math.sin(roll), math.cos(pitch),
                              math.sin(pitch), math.cos(yaw), math.sin(yaw))
    return [[cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
            [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
            [-sp, cp * sr, cp * cr]]


def apply(m, v):
    return [dot(m[i], v) for i in range(3)]


class Axle:
    """Rigid axle located by four links. Pose q = [dx, dy, dz, roll, pitch, yaw]
    about the ride-height axle center; wheel travel is measured at wheel center."""

    def __init__(self, cfg, uf_hole="mid"):
        v, b = cfg["vehicle"], cfg["brackets"]
        self.h, self.half_track = v["frame_height"], v["track"] / 2
        self.center = [0.0, 0.0, v["tire_radius"] - self.h]
        uf = b["uf_holes"][uf_hole]
        ua, la, lf = b["ua"], b["la"], b["lf"]
        # (axle point in axle-local coords, frame point, name)
        self.links = [(sub(ua, self.center), uf, "ua", "uf"),
                      (sub(mirror(ua), self.center), mirror(uf), "ua", "uf"),
                      (sub(la, self.center), lf, "la", "lf"),
                      (sub(mirror(la), self.center), mirror(lf), "la", "lf")]
        self.length = [math.dist(self.world([0] * 6, a), f) for a, f, _, _ in self.links]
        bolt = cfg["joints"]["bolt"]
        # (sx, sy): direction toward the link's other end (+1 forward for axle ends) and
        # inboard sign (-1 on the driver side).
        self.bolts = [(bolt_vector(bolt[an], 1, -1 if a[1] > 0 else 1),
                       bolt_vector(bolt[fn], -1, -1 if a[1] > 0 else 1))
                      for a, f, an, fn in self.links]

    def world(self, q, p):
        return [c + dq + r for c, dq, r in zip(self.center, q[:3], apply(rot(*q[3:]), p))]

    def residual(self, q, zl, zr):
        e = [math.dist(self.world(q, a), f) - self.length[i] for i, (a, f, _, _) in enumerate(self.links)]
        e.append(self.world(q, [0, self.half_track, 0])[2] - self.center[2] - zl)
        e.append(self.world(q, [0, -self.half_track, 0])[2] - self.center[2] - zr)
        return e

    def pose(self, zl, zr):
        q = [0.0] * 6
        for _ in range(50):
            e = self.residual(q, zl, zr)
            if max(map(abs, e)) < 1e-10:
                return q
            jac = [[0.0] * 6 for _ in range(6)]
            for j in range(6):
                qq = q[:]
                qq[j] += 1e-7
                for i, ei in enumerate(self.residual(qq, zl, zr)):
                    jac[i][j] = (ei - e[i]) / 1e-7
            q = [qi + di for qi, di in zip(q, solve(jac, [-x for x in e]))]
        raise RuntimeError(f"pose did not converge for travel {zl}/{zr}")

    def points(self, q):
        """World positions: (axle points, frame points) per link."""
        return [self.world(q, a) for a, _, _, _ in self.links], [f for _, f, _, _ in self.links]

    def tub_gap(self, q, cfg):
        """Smallest gap from the top of the bridge (both sides) to the tub floor."""
        pk = cfg["packaging"]
        x, y, h = pk["bridge_top"]
        tops = [self.world(q, [x, yy, h]) for yy in (y, -y)]
        return pk["tub_floor_z"] - max(p[2] for p in tops)

    def misalignment(self, q):
        """Per link: (axle end, frame end) joint misalignment in degrees."""
        m = rot(*q[3:])
        axle_pts, frame_pts = self.points(q)
        out = []
        for (ba, bf), a, f in zip(self.bolts, axle_pts, frame_pts):
            d = unit(sub(f, a))
            out.append(tuple(math.degrees(math.asin(min(1.0, abs(dot(d, b))))) for b in (apply(m, ba), bf)))
        return out


def solve(a, b):
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c:
                f = m[r][c] / m[c][c]
                m[r] = [m[r][k] - f * m[c][k] for k in range(n + 1)]
    return [m[i][n] / m[i][i] for i in range(n)]
