// After T78 · the owner's chat-fixes of 12.10.2026, named here so the strict run says why.
// The island automat is deleted on his order ("usuń te panele"); its traces go with it.

export const LICENSED = {
  'src/engine/island.js': {
    why: 'Owner 12.10.2026: the island automat deleted (`isIslandAutoPanel`, `islandPanelPlan`); nothing cut changes for units on faces',
  },
  'src/engine/room.js': {
    why: 'Owner 12.10.2026: the room check no longer skips `island_auto` boards, because none are made any more',
  },
  'src/engine/roomFit.js': {
    why: 'Owner 12.10.2026: the width law no longer exempts the deleted automat\'s end panel',
  },
};
