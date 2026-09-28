// Built-in default data, loaded when the app starts. Same format as a saved YAML file.
// Keep in sync with examples/rear-4-link.yaml (used by the Python solvers).
export const DEFAULT_YAML = `# Rear 4-link geometry. See README.md for the coordinate system.
# Inches. X forward from the rear axle centerline, Y toward the driver side from
# the vehicle centerline. Points are driver side (+Y); passenger side is mirrored.
#
# Every point is measured on the part it is welded to:
#   axle:  vertical = height above the axle center (tube centerline)
#   frame: vertical = Z above the bottom of the frame rail
# vehicle.frame_height (H) and vehicle.tire_radius (R) connect the two: the axle
# center sits at Z = R - H below the frame. Changing H moves the axle and every
# axle point with it; nothing else needs re-measuring.
vehicle:
  wheelbase: 101.0
  frame_height: 22.875        # H: ground to frame bottom at ride height
  tire_radius: 18.5           # R: ground to axle center, loaded
  track: 65.5                 # tire center to tire center (JK WMS, 0 mm offset)
  cg_above_frame: [12.5, 15.125]   # crank centerline, upper bellhousing bolt

axle:                         # [X, Y, height above axle center]
  ua: [1.0, 2.25, 8.4375]
  la: [3.375, 24.625, -1.0625]
  bridge_top: [1.0, 2.25, 10.0625]   # highest point of the bridge (tub check)

frame:                        # [X, Y, Z above frame bottom]
  lf: [34.0, 19.75, -2.0]
  uf_holes:
    top: [31.375, 16.125, 3.75]
    mid: [31.375, 16.125, 2.75]
    bottom: [31.375, 16.125, 1.75]
  tub_floor_z: 12.6875        # underside of the tub over the axle

joints:
  misalignment_limit: 13.0    # deg each way, Barnes Enduro 1-1/4
  # Bolt per bracket (driver side; passenger mirrored), angle in deg:
  #   horizontal: horizontal bolt (tab bracket). angle = top-view direction
  #               the bracket aims the link, from straight fore/aft, looking from
  #               the bracket toward the link's other end; + inboard, - outboard.
  #   vertical:   vertical bolt. angle = tilt of the bolt top toward the link's
  #               other end; 0 = plumb.
  # Axle-end bolts rotate with the axle; frame-end bolts are fixed.
  bolt:
    ua: {axis: vertical, angle: 0}
    uf: {axis: horizontal, angle: 20}
    la: {axis: horizontal, angle: 10}
    lf: {axis: horizontal, angle: -5}

driveline:                    # rear driveshaft; angles + = front end up
  type: double_cardan         # double_cardan (CV at t-case) or single_cardan
  pinion_angle: 16.0          # pinion centerline at ride height vs frame, deg, + nose up
  pinion_ujoint: [9.61, 0.0, 2.76]   # axle point: [X, Y, height above axle center]
  tcase_ujoint: [50.0, 0.0, 8.0]     # frame point: [X, Y, Z above frame bottom]. PLACEHOLDER, measure
  tcase_angle: 0.0            # t-case output shaft vs frame, deg. PLACEHOLDER, measure
  joint_limit: 20.0           # max U-joint / CV angle, deg. PLACEHOLDER, from shaft spec

travel:
  bump: 6.0                   # at wheel center
  droop: 8.0
  step: 1.0
  articulation:               # [driver, passenger] wheel center travel
    - [6, -8]
    - [6, -6]
    - [3, -3]
    - [0, -8]
    - [6, 0]
    - [3, -8]
`;
