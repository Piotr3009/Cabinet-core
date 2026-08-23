// ─── THE ONE TILE (turn 45, CLAUDE.md F3) ───────────────────────────────────
//
// The approved mockup, 23.08.2026:
//
//   *"The tab then shows exactly ONE tile (swatch + code + name + ST) with
//   `Change`. The SAME single tile is what the Summary shows."*
//
// One component, two surfaces, and that is the whole point of it being a
// component: the tab and the wizard summary cannot come to say different things
// about what the job is faced in, because there is one thing that says it.
//
// The `Choose decor…` SLOT lives here too, for the same reason. "Nothing chosen
// yet" and "this is what was chosen" are the two states of one control, and a
// surface that drew them in two places would eventually draw both at once.
//
// ════════════════════════════════════════════════════════════════════════════
// EGGER IMAGE LICENCE — it travels with the picture (see engine/decors.js)
//
//   * the thumbnail is the WHOLE board scan reduced — never cropped, tiled or
//     recoloured;
//   * ATTRIBUTION IS MANDATORY and sits next to the image, inside the same
//     control: the gold line under the name is rendered unconditionally
//     wherever there is an image, and `lib/chosenDecor.js` is what fills it —
//     including for a VENEER, which borrows an EGGER scan and therefore borrows
//     the credit with it.
// ════════════════════════════════════════════════════════════════════════════

import { TILE_SWATCH_PX } from '../lib/wizardTabs.js';
import { chosenTileText } from '../lib/chosenDecor.js';

/**
 * @param {object} props
 *   tile     what `lib/chosenDecor.js chosenTile()` answered, or null
 *   slot     'carcass:c1' — stamped on the DOM so a walk can find this one
 *   label    what the slot is called, for the empty state's own words
 *   onOpen   the picker modal, opened BESIDE the control that asked for it
 *   compact  the Summary's smaller rendering — the same tile, less padding
 *   readOnly the Summary shows the tile without a `Change` of its own when the
 *            section already carries one
 */
export default function ChosenDecorTile({
  tile = null, slot = '', label = 'Material', onOpen = null,
  compact = false, readOnly = false,
}) {
  const px = compact ? Math.round(TILE_SWATCH_PX * 0.55) : TILE_SWATCH_PX;

  if (!tile) {
    return (
      <button
        type="button"
        data-choose-decor={slot || undefined}
        data-decor-slot-state="empty"
        className="w-full border border-dashed border-shell-600 rounded-lg px-3 py-4 text-left
          hover:border-gold hover:bg-shell-700 transition-colors flex items-center gap-3"
        onClick={(e) => onOpen?.(e)}
        disabled={!onOpen}
      >
        <span
          className="rounded border border-shell-600 bg-shell-800 shrink-0 flex items-center justify-center text-ink-400 text-xl"
          style={{ width: px, height: px }}
          aria-hidden
        >
          +
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-ink-50">Choose decor…</span>
          <span className="block text-[11px] text-ink-400">
            {label} — laminate, veneer or a sprayed colour, in one window.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="border border-gold/70 rounded-lg p-2 flex items-center gap-3"
      data-chosen-tile={slot || '1'}
      data-decor-slot-state="chosen"
      title={chosenTileText(tile)}
    >
      {/* The whole scan, reduced — never a crop. A uni colour and a lacquer
          ship no file: they ARE one flat colour. */}
      {tile.thumb ? (
        <img
          src={tile.thumb}
          alt={chosenTileText(tile)}
          loading="lazy"
          className="rounded object-cover block shrink-0"
          style={{ width: px, height: px }}
        />
      ) : (
        <span
          className="rounded border border-shell-600 block shrink-0"
          style={{ width: px, height: px, background: tile.hex }}
        />
      )}
      <div className="min-w-0 flex-1">
        <span className="block text-sm text-ink-50 truncate" data-tile-code="1">{tile.code}</span>
        <span className="block text-[13px] text-ink-200 truncate" data-tile-name="1">{tile.name}</span>
        {/* MANDATORY attribution, in the same control as the picture. */}
        <span className="block text-[11px] text-gold truncate" data-tile-source="1">
          {tile.attribution || [tile.source, tile.texture].filter(Boolean).join(' · ')}
        </span>
      </div>
      {!readOnly && onOpen && (
        <button
          type="button"
          className="cc-btn px-2.5 shrink-0"
          data-change-decor={slot || '1'}
          onClick={(e) => onOpen(e)}
        >
          Change
        </button>
      )}
    </div>
  );
}
