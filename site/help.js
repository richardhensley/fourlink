// Help text for the viewer. `hl` names the drawing group highlighted on hover.
// Data entry: keyed by YAML path. Calculations: keyed by row id.

const XY = "X from the axle centerline (+ forward), Y from the vehicle centerline (+ driver). Driver side; passenger is mirrored.";
const AXLE_PT = "Joint center (bolt center) on the axle. " + XY + " Height: up from the axle center (tube centerline), − below it.";
const FRAME_PT = "Joint center (bolt center) on the frame. " + XY + " Z: up from the bottom of the frame rail, − below it.";

// One-line reminder shown under each section heading in the form.
export const SECTION_NOTES = {
  axle: "Welded to the axle. [X, Y, height above axle center]. Moves with the axle when frame height changes.",
  frame: "Welded to the frame. [X, Y, Z above frame bottom]. Never moves.",
  driveline: "Rear driveshaft. pinion_ujoint is an axle point (height above axle center); tcase_ujoint is a frame point (Z above frame bottom). Angles + = front end up.",
};

export const DATA_HELP = {
  coords: {
    what: "All math runs in one coordinate system fixed to the frame: X from the rear axle centerline, Y from the vehicle centerline, Z from the bottom of the frame rail. Each point is entered against the part it's welded to, and the viewer converts it.",
    measure: "X: fore/aft from the rear axle centerline, + forward. Y: side to side from the vehicle centerline, + driver side. Vertical depends on the section: 'axle' points are height above the axle center (tube centerline); 'frame' points are Z above the frame rail bottom. Neither depends on ride height, so measure each on its own part.",
    impact: "The two sections are joined by frame height H and tire radius R: axle center Z = R − H. Changing H moves the axle and every axle point with it (links, anti-squat, IC, joint angles, tub gap all follow). The ground is at Z = −H. Passenger side is mirrored (Y negated).",
    hl: "joints",
  },
  vehicle: { impact: "Whole-vehicle inputs." },
  "vehicle.wheelbase": {
    measure: "Rear axle centerline to front axle centerline, both sides, averaged.",
    impact: "Anti-squat reference: the 100% line runs from the rear contact patch to CG height at the front axle. Longer wheelbase lowers anti-squat for the same links.",
    hl: "as",
  },
  "vehicle.frame_height": {
    measure: "H: ground to bottom of frame rail over the rear axle, at ride height. On an uneven floor use tire radius + (frame bottom to axle center).",
    impact: "Places the ground (Z = −H) and axle center (Z = R − H). Moves the axle and every 'axle' point relative to the frame, so it changes link angles, anti-squat, IC, roll center, joint angles and tub gap.",
    hl: "ground",
  },
  "vehicle.tire_radius": {
    measure: "Ground to axle center, loaded, at trail pressure.",
    impact: "Sets axle center Z = R − H, the point the axle rotates about through travel.",
    hl: "axle",
  },
  "driveline.pinion_angle": {
    measure: "Angle finder on the pinion yoke or flange face (converted to the shaft centerline), vehicle at ride height, + nose up. Subtract the frame's own rake if the frame isn't level.",
    impact: "Baseline for the pinion readouts, and the actual pinion angle compared with the ideal. Doesn't change the suspension math.",
    hl: "pinion",
  },
  "vehicle.track": {
    measure: "Tire center to tire center: wheel-mount-surface width plus 2 × wheel offset (0 for 0 mm offset).",
    impact: "Converts wheel travel into axle roll. Wider track means less axle roll for the same travel, so less roll steer and joint angle.",
    hl: "axle",
  },
  "vehicle.cg_above_frame": {
    measure: "CG height above frame bottom, low and high estimate. Rule of thumb: crank centerline and upper bellhousing bolt. Best: scale the rig.",
    impact: "Anti-squat denominator. Higher CG means lower anti-squat %. Two values give the band shown in the results.",
    hl: "as",
  },
  axle: { what: SECTION_NOTES.axle, impact: "Everything here rises, pitches and rolls with the axle through travel, and shifts with it when frame height changes." },
  "axle.ua": {
    measure: "Upper axle bracket. " + AXLE_PT,
    impact: "Upper link line: anti-squat, IC, roll axis, separation, pinion change.",
    hl: "ua",
  },
  "axle.la": {
    measure: "Lower axle bracket. " + AXLE_PT,
    impact: "Lower link line: lower link angle, anti-squat, roll axis, separation, ground clearance.",
    hl: "la",
  },
  "axle.bridge_top": {
    measure: "Highest point of the bridge over the diff. " + XY + " Height: up from the axle center.",
    impact: "Checked against the tub floor through travel. Forward of the axle, pinion rotation lowers it at bump; off center, axle roll raises one side in flex.",
    hl: "tub",
  },
  frame: { what: SECTION_NOTES.frame, impact: "Fixed to the frame; frame height doesn't move these." },
  "frame.lf": {
    measure: "Lower frame bracket. " + FRAME_PT,
    impact: "Lower link angle and length, where the lowers cross in the top view (roll axis, rear steer), triangulation.",
    hl: "lf",
  },
  "frame.uf_holes": {
    impact: "Upper frame bracket holes. Pick the active hole with 'UF hole' on the Calculations tab.",
    hl: "uf",
  },
  "frame.uf_holes.*": {
    measure: "Upper frame bracket hole. " + FRAME_PT,
    impact: "Main anti-squat tuning knob: a higher hole flattens the upper and lowers anti-squat. Also sets upper length and triangulation.",
    hl: "uf",
  },
  "frame.tub_floor_z": {
    measure: "Frame bottom up to the underside of the tub floor directly over the axle, between the rails.",
    impact: "Checked against the bridge top: 'Bridge top to tub floor' goes red if they touch.",
    hl: "tub",
  },
  joints: { impact: "Rod end / joint limits and bolt orientation." },
  "joints.misalignment_limit": {
    measure: "From the joint spec, degrees each way (Barnes Enduro 1-1/4: 13°).",
    impact: "Misalignment above this is flagged red (bind).",
  },
  "joints.bolt": {
    impact: "Which way the bolt runs through each bracket. Rotation about the bolt is free; tilting out of that plane uses misalignment.",
  },
  "joints.bolt.*": {
    measure: "Bolt type and angle for this bracket (driver side; passenger mirrored).",
    impact: "Sets the misalignment calculation for this joint end. Axle-end bolts rotate with the axle; frame-end bolts are fixed. The colored tick through each joint in the views is the bolt.",
  },
  "joints.bolt.*.axis": {
    measure: "horizontal: bolt lies flat (typical tab bracket). vertical: bolt points up.",
    impact: "horizontal: up/down link swing is free, side-to-side uses misalignment. vertical: side-to-side swing is free, up/down uses misalignment.",
  },
  "joints.bolt.*.angle": {
    measure: "horizontal: stand at the bracket, look along the link to its other end; the angle the bracket aims the link from straight fore/aft. + inboard, − outboard, 0 = square to the axle. vertical: tilt of the bolt top toward the link's other end, 0 = plumb.",
    impact: "The difference from the link's own angle is built-in misalignment at ride height, taken out of the joint's range before any travel.",
  },
  travel: { impact: "Wheel travel limits, at wheel center." },
  "travel.bump": {
    measure: "Wheel center rise from ride height to bumpstop contact.",
    impact: "Upper end of the travel sliders.",
    hl: "axle",
  },
  "travel.droop": {
    measure: "Wheel center drop from ride height to full extension (shock or limit strap).",
    impact: "Lower end of the travel sliders.",
    hl: "axle",
  },
  driveline: { what: SECTION_NOTES.driveline, impact: "Driveshaft length, U-joint angles and ideal pinion angle through travel.", hl: "shaft" },
  "driveline.type": {
    what: "double_cardan: CV (double cardan) at the t-case, single U-joint at the pinion. single_cardan: a single U-joint at each end.",
    impact: "Sets the ideal pinion angle. double_cardan: pinion points straight at the t-case. single_cardan: pinion parallel to the t-case output, so the two U-joint angles cancel.",
    hl: "shaft",
  },
  "driveline.pinion_ujoint": {
    what: "Center of the pinion yoke U-joint (the cross), on the axle.",
    measure: "X and height from the axle center, Y from the vehicle centerline (+ driver). Moves with the axle.",
    impact: "Rear end of the driveshaft.",
    hl: "shaft",
  },
  "driveline.tcase_ujoint": {
    what: "Center of the t-case output U-joint or CV, on the frame side.",
    measure: "X from the rear axle centerline, Y from the vehicle centerline, Z from the frame bottom (below = negative).",
    impact: "Front end of the driveshaft. Fixed to the frame.",
    hl: "shaft",
  },
  "driveline.tcase_angle": {
    what: "T-case output shaft angle, measured against the frame, + = front end up.",
    measure: "Angle finder on the output yoke face (then convert to the shaft angle), minus the frame rail angle at the same time.",
    impact: "T-case joint angle; the ideal pinion angle for a single-cardan shaft.",
    hl: "shaft",
  },
  "driveline.joint_limit": {
    what: "Largest operating angle allowed at either joint, from the driveshaft maker.",
    impact: "Joint angles over this turn red.",
    hl: "shaft",
  },
};

// Joint bolt entries highlight their own joint.
for (const j of ["ua", "uf", "la", "lf"]) {
  DATA_HELP[`joints.bolt.${j}`] = { ...DATA_HELP["joints.bolt.*"], hl: j };
  for (const k of ["axis", "angle"]) DATA_HELP[`joints.bolt.${j}.${k}`] = { ...DATA_HELP[`joints.bolt.*.${k}`], hl: j };
}

export function dataHelp(path) {
  return DATA_HELP[path] ?? DATA_HELP[path.replace(/\.[^.]+$/, ".*")];
}

export const CALC_HELP = {
  hole: { what: "Which UF hole the calculations use.", impact: "Higher hole = less anti-squat.", hl: "uf" },
  cg: {
    what: "CG height used in the calculations, anywhere between the low and high estimates in the data (1/4\" steps).",
    impact: "Anti-squat only: a higher CG lowers anti-squat %. The grey bar at the front axle in the side view shows the full CG range.",
    hl: "as",
  },
  travel: { what: "Wheel travel at wheel center from ride height, + = bump.", impact: "Poses the axle; everything in 'At current travel' and the drawings follows.", hl: "axle" },
  as: {
    what: "Share of rear squat resisted by the links under power. Line from the rear contact patch through the IC, compared at the front axle with the line to the CG.",
    impact: "100% = neutral. Higher: rear lifts and can hop on climbs. Lower: rear squats. Target 100–110% at ride height.",
    hl: "as",
  },
  ic: {
    what: "Instant center: where the upper and lower link lines meet in side view. X forward of the axle, height above ground.",
    impact: "Drives anti-squat. A closer IC means more pinion change and more anti-squat change through travel.",
    hl: "ic",
  },
  roll: {
    what: "Roll axis: line through the points where the upper pair and the lower pair cross in the top view (marked 'roll axis: uppers cross' and 'roll axis: lowers cross' in the top view, with distance forward of the axle; → = off the drawing). + = roll oversteer.",
    impact: "Sets roll steer, meaning how much the axle steers when it articulates. As close to 0° as practical.",
    hl: "roll",
  },
  rc: {
    what: "Roll center: height of the roll axis above ground at the axle.",
    impact: "The farther below the CG, the more body roll.",
    hl: "rc",
  },
  sep: {
    what: "Separation: vertical distance between the UA and LA joint centers.",
    impact: "More separation means lower link loads and less axle wrap. Guideline ≥ 25% of tire diameter.",
    hl: "sep",
  },
  tri: {
    what: "Triangulation: sum of the top-view link angles from centerline (2 × upper + 2 × lower).",
    impact: "Locates the axle side to side without a track bar. Target ≥ 40°.",
    hl: "tri",
  },
  upper: {
    what: "Upper link: joint-to-joint length, side-view angle (− = downhill to frame), top-view angle from the vehicle centerline.",
    impact: "A long upper relative to the lower gives more pinion change. The upper angle is the main anti-squat lever.",
    hl: "upper",
  },
  lower: {
    what: "Lower link: joint-to-joint length, side-view angle (+ = uphill to frame), top-view angle from the vehicle centerline.",
    impact: "A steeper lower gives more anti-squat and hangs lower at the frame. Target < 10°.",
    hl: "lower",
  },
  ratio: {
    what: "Upper link length as a percentage of lower link length.",
    impact: "Near 100% (parallel, equal links) keeps pinion change small. Above 100% the pinion rotates more through travel; well below 100% the axle rotates the other way.",
    hl: "upper lower",
  },
  pinion: {
    what: "Axle housing rotation from ride height, + = pinion nose up.",
    impact: "The driveshaft and CV joint must handle this swing.",
    hl: "pinion",
  },
  axle_roll: { what: "Axle rotation seen from behind, from unequal wheel travel.", impact: "Drives roll steer, lateral shift and joint angles.", hl: "axle" },
  steer: { what: "Axle yaw (rear steer) from ride height, + = axle nose toward driver side.", impact: "The rear tracks off line when crossed up. Set by the roll axis.", hl: "axle" },
  shift: { what: "Axle center movement fore/aft (+ forward) and lateral (+ driver) from ride height.", impact: "Tire-to-tub, shock, and driveshaft clearance. Lateral shift comes from the roll center sitting above the axle.", hl: "axle" },
  tub: { what: "Gap from the top of the bridge to the tub floor.", impact: "Negative = contact. Leave margin for bumpstop crush and flex.", hl: "tub" },
  mis: {
    what: "How far the rod end is cocked at one link end. UA = upper link at the axle, UF = upper link at the frame, LA = lower link at the axle, LF = lower link at the frame. A rod end swings freely around its bolt; any tilt of the link away from square to the bolt has to be taken by the ball swiveling in its housing, and that tilt is the misalignment. Shown as driver side / passenger side, at the current wheel travel. Matches the numbers on the link labels in the drawings.",
    impact: "Every rod end has a rated swivel limit (set in the data). At the limit the housing hits the ball and the joint binds, loading the bracket and link. Ride-height misalignment comes from bracket angle not matching the link and eats into the range before the suspension moves. Red = over the limit. Reduce it by aiming the bracket along the link, or with high-misalignment joints or spacers.",
    hl: "joints",
  },
  mis_worst: {
    what: "Largest misalignment for this joint (UA/UF/LA/LF, see the travel rows) anywhere in the travel range, and the driver/passenger wheel travel where it happens. Checked on a 1\" grid of every driver/passenger combination from full droop to full bump, so it includes crossed-up articulation.",
    impact: "Under the limit: this joint never binds within the modeled travel. Red: it binds somewhere; move the sliders to the listed travel to see it.",
    hl: "joints",
  },
  ds_len: {
    what: "Driveshaft length, U-joint center to U-joint center, with change from ride height.",
    impact: "The slip spline must cover the change from shortest to longest (see Driveshaft slip range).",
    hl: "shaft",
  },
  ds_angle: { what: "Driveshaft side-view angle, + = front end up.", impact: "Together with the t-case and pinion angles, sets the joint angles.", hl: "shaft" },
  ds_pinion: {
    what: "Actual pinion angle vs the ideal for this shaft type, and the difference (actual − ideal). Side view, + = nose up. Ideal: double cardan = pointing at the t-case; single cardan = parallel to the t-case output.",
    impact: "Near 0 = smooth. A few degrees of error means vibration on the street.",
    hl: "shaft",
  },
  ds_joints: {
    what: "True 3D operating angle at the t-case joint (CV for double cardan) and at the pinion U-joint. Includes axle roll and yaw.",
    impact: "Red = over the joint limit. Single cardan: the two should be equal. Double cardan: pinion joint should be small (about 0–2°).",
    hl: "shaft",
  },
  ds_slip: {
    what: "Shortest and longest driveshaft length over the full travel grid (1\" steps, including crossed-up articulation).",
    impact: "Required slip travel = longest − shortest, plus margin. Size the collapsed and extended lengths to this.",
    hl: "shaft",
  },
  ds_worst: {
    what: "Largest t-case and pinion joint angles over the full travel grid, and where each happens (driver/passenger travel).",
    impact: "Red = over the joint limit somewhere in travel.",
    hl: "shaft",
  },
};
