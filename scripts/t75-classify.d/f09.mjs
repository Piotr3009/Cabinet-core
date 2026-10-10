// T75 F9 · THE ISLAND ENTITY. CLAUDE.md T75 F9, the owner: *"twoja droga, plus
// dodawanie szafek po bokach lub end panele, w całości."*  Nothing here can
// reach a cut: the island lives in the room, the store and the plan.

const DRAWING = 'LICENSED by FROZEN 2 (*"unless a point below needs the drawing to show what the engine now '
  + 'cuts"*): ';

export const LICENSED = {
  'src/engine/room.js': {
    why: 'F9 · `room.islands` migrated (absent = none), `roomWalls` = the real walls then four faces per '
      + 'island (`islandFaces`, the frame law), `realWalls` for every plaster reader (`wallsInScope`, '
      + '`wallNeighbours`, `moveWall`, `setWallLength`, `wallPlanObstacles`, `clampOpening`), '
      + '`rehomeIslandUnits` / `plasterPosition` (a unit keeps its face through a room change), '
      + '`islandInsideRoom`, `polygonsOverlap`, `wallName` / `wallLabel`, and `roomChangeGuard` refusing an '
      + 'island outside the room. computeCabinet never imports it',
    gates: [],
  },
  'src/engine/island.js': {
    why: 'F9 · NEW: `islandClash` (Room refuses first: core and face cabinets against every cabinet, box '
      + 'and island, and inside the room), `newIsland` at `profile.island.defaults`, `footprintOf`. '
      + 'Read by the store and Room setup',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F9 · `island.defaults` (1800 x 900, T75 proposed) and its migrate line. The six read none',
    gates: [],
  },
  'src/engine/dimensions.js': {
    why: 'F9 · an island face is "not dimensioned as walls": its two corner arrows are dropped. The view',
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `F9 · ${DRAWING}the plan's extent and its cut walls are the building's (\`realWalls\`): an island face is not drawn as a cut wall`,
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/setSheet.js': {
    why: `F9 · ${DRAWING}the key plan is the building's (\`realWalls\`)`,
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/setPerspective.js': {
    why: `F9 · ${DRAWING}behind an island face there is no building: no wall ends, no ceiling line`,
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/setElevation.js': {
    why: `F9 · ${DRAWING}an island face's group stands alone, with no wall ends drawn`,
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/wallElevation.js': {
    why: `F9 · ${DRAWING}the horizontal section cuts plaster only: an island face is not a red wall`,
    gates: [],
    drawing: true,
  },
};
