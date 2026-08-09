// mm → three.js units (metres). The engine speaks mm everywhere; only the
// viewer converts, so no scale factor ever leaks into the calculations.
export const MM = 0.001;
export const mm = (v) => Number(v) * MM;

// Zero designer flourishes — a workshop tool: white walls, neutral board tones.
//
// What a PANEL is made of moved to profile.appearance in turn 4 and is resolved
// by 3d/materials.js: the furniture is a project decision (broken white, light
// grey, a wood decor), while the room and the annotations below are the tool's
// own chrome and stay here.
export const COLORS = {
  wall: '#ffffff',
  wallEdge: '#e4e4e0',
  floor: '#f2f0ec',
  rail: '#8d8d92',
  gold: '#AA8E68',
  goldSoft: '#C8A678',
  dim: '#4a4a4a',
  // ─── Turn 17 (CLAUDE.md F6.3): the flat name plate ───
  // The owner on the cabinet's name label: "paskudna chmurka". It was a white
  // rounded bubble with a 2 px stroke — a speech balloon on a drawing of
  // furniture. These two are the plate and the ink of the quiet, square,
  // drawing-office label that replaces it, and they are the app's own tones:
  // the shell the panels are drawn in, and the ink they print in.
  labelPlate: '#1c1c1a',
  labelInk: '#e8e4dc',
};
