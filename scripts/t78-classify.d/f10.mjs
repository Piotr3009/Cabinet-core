// T78 F10 · the 40 mm corner strip and the blank are the blind kit's own parts.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  blindKit: {
    what: 'a BLIND kit (`type.blind`): the kit cuts its blank and its 40 mm corner strip the moment it is placed; '
      + 'every other kit is untouched by F10 (the post of a plain corner stays the neighbour\'s auto-part, at 40 now)',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('BLIND_')),
  },
  autoPost: {
    what: '`params.corner_post_left_mm` / `corner_post_right_mm` on a plain unit (the store writes them at a corner stop): '
      + 'the auto post, 40 wide where it was 50 (the owner\'s number)',
    opens: (params) => Number(params?.corner_post_left_mm) > 0 || Number(params?.corner_post_right_mm) > 0,
  },
};

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'T78 F10: `corner.postMm` 40, the owner\'s decided number (*"listwa narozinkowa musi miec 40 mm"*); read by the corner '
      + 'stop, the blind blank\'s width, the auto post and the kit\'s own strip',
    gates: ['blindKit', 'autoPost'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F10: the blind kit cuts `${unitNum}-POST` (front material, postMm x front_t, plinth line to top, in the adjacent '
      + 'run\'s front plane by `corner_post_at_mm` or the family\'s own); the new params are dropped from the L\'s virtual parents',
    gates: ['blindKit'],
  },
  'src/engine/runs.js': {
    why: 'T78 F10: a run stopping on a blind kit\'s strip ends there by the stop record `corner_butt_*_mm` (`runEnd`), and its '
      + 'door sees the strip as a rigid neighbour (`unitVerticals`); a design-layer read, never a cut',
    gates: ['blindKit'],
  },
};

export const LIVENESS = {
  blindKit: () => {
    const r = computeCabinet({ ...defaultParamsFor('BLIND_BASE', P), unit_num: 'BB01', doors: true }, P);
    const post = r.panels.find((p) => p.part === 'CORNER-POST');
    const blank = r.panels.find((p) => p.role === 'blind_blank');
    return {
      live: Boolean(post && blank && post.w === P.corner.postMm && post.meta.kit === 'blind'),
      said: `BLIND_BASE alone cuts ${blank?.id} and ${post?.id} (${post?.w} x ${post?.h} x ${post?.thickness})`,
    };
  },
  autoPost: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', corner_post_left_mm: P.corner.postMm }, P);
    const post = r.panels.find((p) => p.part === 'CORNER-POST');
    return { live: Boolean(post && post.w === 40), said: `BUD with the auto post cuts ${post?.id} ${post?.w} wide` };
  },
};

// Goldens and fixtures RE-PINNED by F10, knowingly: the blind kits cut a new
// board (their own strip) and the owner's 40 moves every corner stop by 10.
export const REPINNED = [
  { file: 'fixtures/golden-blind-base.json', why: 'T78 F10: the blind kit cuts its own CORNER-POST (40 x front_t); its blank is 10 narrower (postMm 50 to 40)' },
  { file: 'fixtures/golden-blind-wall.json', why: 'T78 F10: as golden-blind-base' },
  { file: 'fixtures/golden-blind-wardrobe.json', why: 'T78 F10: as golden-blind-base' },
  { file: 'fixtures/t75-corner-kitchen.json', why: 'T78 F10: every run on a corner stop stands 10 closer (postMm 40); the blind stop\'s run carries the stop record, the blind kit its own strip' },
  { file: 'fixtures/t75-wardrobe-corner.json', why: 'T78 F10: as t75-corner-kitchen' },
];

export const GOLDENS = [];
