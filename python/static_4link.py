"""Static ride-height 4-link analysis.

Usage: python python/static_4link.py examples/rear-4-link.yaml
"""
import math
import sys

from fourlink import anti_squat, load, mirror, roll_axis, side_ic


def main(path):
    cfg = load(path)
    v, b = cfg["vehicle"], cfg["brackets"]
    h, wb = v["frame_height"], v["wheelbase"]
    ua, la, lf = b["ua"], b["la"], b["lf"]
    cgs = v["cg_above_frame"]
    ground = -h

    print(f"H {h}  axle center Z {v['tire_radius'] - h:+.4f}  ground Z {ground:+.4f}")
    print(f"CG above ground: " + ", ".join(f"{c + h:.3f}" for c in cgs))
    print(f"Separation UAZ - LAZ: {ua[2] - la[2]:.4f}")
    lower_side = math.degrees(math.atan((lf[2] - la[2]) / (lf[0] - la[0])))
    lower_plan = math.degrees(math.atan((la[1] - lf[1]) / (lf[0] - la[0])))
    print(f"Lower: length {math.dist(la, lf):.2f}  side {lower_side:+.2f} deg  plan {lower_plan:.2f} deg")

    for name, uf in b["uf_holes"].items():
        upper_side = math.degrees(math.atan((uf[2] - ua[2]) / (uf[0] - ua[0])))
        upper_plan = math.degrees(math.atan((uf[1] - ua[1]) / (uf[0] - ua[0])))
        icx, icz = side_ic(la, lf, ua, uf)
        aset = [anti_squat(la, lf, ua, uf, ground, 0.0, c, wb)[0] for c in cgs]
        ra, rc = roll_axis(ua, mirror(ua), uf, mirror(uf), la, mirror(la), lf, mirror(lf))
        print(f"\nUF {name} {uf}")
        print(f"  Upper: length {math.dist(ua, uf):.2f}  side {upper_side:+.2f} deg  plan {upper_plan:.2f} deg")
        print(f"  Triangulation: {2 * upper_plan + 2 * lower_plan:.1f} deg")
        print(f"  IC: X {icx:.1f}  Z {icz:+.2f} ({icz - ground:.2f} above ground)")
        print("  Anti-squat: " + " / ".join(f"{a:.1f}%" for a in aset))
        print(f"  Roll axis {ra:+.2f} deg  roll center Z {rc:+.2f} ({rc - ground:.1f} above ground)")


if __name__ == "__main__":
    main(sys.argv[1])
