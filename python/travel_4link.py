"""4-link behavior through heave and articulation.

Solves the rigid-axle pose from the four link lengths plus the two wheel-center
heights, then reports pinion change, anti-squat, roll axis, roll steer, axle
shift, and joint misalignment.

Usage: python python/travel_4link.py examples/rear-4-link.yaml [uf_hole]
"""
import math
import sys

from fourlink import Axle, anti_squat, load, roll_axis


def main(path, hole="mid"):
    cfg = load(path)
    v, t = cfg["vehicle"], cfg["travel"]
    limit = cfg["joints"]["misalignment_limit"]
    axle = Axle(cfg, hole)
    cg = v["cg_above_frame"]
    print(f"UF hole: {hole}; travel at wheel center (+ = bump); pinion + = nose up; "
          f"yaw + = axle nose toward driver side; misalignment limit {limit} deg")
    print("Misalignment columns: UA/UF upper, LA/LF lower (worst of both sides)\n")

    print("HEAVE")
    print(f"{'travel':>6} {'dX':>6} {'pinion':>7} {'AS lo':>6} {'AS hi':>6} {'roll ax':>7} {'RC gnd':>6} {'tub':>5}  UA   UF   LA   LF")
    n = int(round((t["bump"] + t["droop"]) / t["step"]))
    for i in range(n + 1):
        z = -t["droop"] + i * t["step"]
        q = axle.pose(z, z)
        (ua_l, ua_r, la_l, la_r), (uf_l, uf_r, lf_l, lf_r) = axle.points(q)
        ground = -v["frame_height"] + z
        axle_x = axle.center[0] + q[0]
        aset = [anti_squat(la_l, lf_l, ua_l, uf_l, ground, axle_x, c, v["wheelbase"])[0] for c in cg]
        ra, rc = roll_axis(ua_l, ua_r, uf_l, uf_r, la_l, la_r, lf_l, lf_r)
        print(f"{z:+6.1f} {q[0]:+6.2f} {-math.degrees(q[4]):+7.2f} {aset[0]:6.1f} {aset[-1]:6.1f} "
              f"{ra:+7.2f} {rc - ground:6.1f} {axle.tub_gap(q, cfg):5.2f}  {misalign(axle, q)}")

    print("\nARTICULATION")
    print(f"{'drv/pas':>9} {'roll':>6} {'steer':>6} {'dY':>6} {'dX':>6} {'pinion':>7} {'tub':>5}  UA   UF   LA   LF")
    for zl, zr in t["articulation"]:
        q = axle.pose(zl, zr)
        print(f"{zl:+4.0f}/{zr:+4.0f} {math.degrees(q[3]):+6.2f} {math.degrees(q[5]):+6.2f} "
              f"{q[1]:+6.2f} {q[0]:+6.2f} {-math.degrees(q[4]):+7.2f} {axle.tub_gap(q, cfg):5.2f}  {misalign(axle, q)}")


def misalign(axle, q):
    m = axle.misalignment(q)
    upper, lower = m[:2], m[2:]
    cols = [max(a for a, _ in upper), max(f for _, f in upper), max(a for a, _ in lower), max(f for _, f in lower)]
    return " ".join(f"{c:4.1f}" for c in cols)


if __name__ == "__main__":
    main(*sys.argv[1:])
