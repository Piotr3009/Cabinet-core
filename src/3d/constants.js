// mm → three.js units (metres). The engine speaks mm everywhere; only the
// viewer converts, so no scale factor ever leaks into the calculations.
export const MM = 0.001;
export const mm = (v) => Number(v) * MM;

// Zero designer flourishes — a workshop tool: white walls, neutral board tones.
export const COLORS = {
  wall: '#ffffff',
  wallEdge: '#e4e4e0',
  floor: '#f2f0ec',
  board: '#d8cdbb',
  boardEdge: '#a89880',
  front: '#eae4da',
  frontEdge: '#b9ad9a',
  drawerBox: '#cfc4b2',
  back: '#cdc2b0',
  rail: '#8d8d92',
  gold: '#AA8E68',
  goldSoft: '#C8A678',
  dim: '#4a4a4a',
};

// Which engine role maps to which surface colour.
export function colorForRole(role) {
  switch (role) {
    case 'front': return COLORS.front;
    case 'back': return COLORS.back;
    case 'drawer_box': return COLORS.drawerBox;
    default: return COLORS.board;
  }
}

export function edgeColorForRole(role) {
  return role === 'front' ? COLORS.frontEdge : COLORS.boardEdge;
}
