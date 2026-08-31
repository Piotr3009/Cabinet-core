import { useEffect, useMemo, useState } from 'react';
import { mm, MM } from './constants.js';
import { glbClone, glbSource, onGlbLoad } from './glbSource.js';
import { useUiStore } from '../stores/uiStore.js';
import { storageBaseUrl } from '../lib/storageBase.js';
import { propsAvailable, usePropsPack } from '../lib/usePropsPack.js';
import {
  PROP_KINDS, fillSlots, layIntoSlot, propModelUrl, propSlotsOf, seatInSlot,
} from '../lib/props.js';

// ─── PROPS v1, DRAWN (turn 58b F5 · T58 F8) ─────────────────────────────────
//
// The owner approved the pack and the switch: *"ok props on/off — zegarki
// wiedzą i reszta też wie."*
//
// This file is the THIN half. Everything that can be decided without a browser
// is decided in `src/lib/props.js` — which slot a piece belongs in, which way
// up it has to lie once it is measured, how far it may be scaled before it
// stops being the pack's piece, and where it is seated so it never intersects
// a board. All this does is fetch the model, hand its measured box to that
// law, and apply the answer.
//
// T58 F8, point 2, verbatim: *"load → `updateMatrixWorld` → Box3 → LAY the
// piece into its slot — watches LYING into the watch insert's pockets (the
// model stands ~80 mm, the interior is 60 — orient by measurement, never by
// guess), belt rolls flat into lanes, ties into sections. Fewer slots → fill
// what exists; more → repeat variants. No prop intersects a board."*
//
// `glbSource` already does the load, the `updateMatrixWorld` and the Box3 —
// once per file however many pieces wear it — and it already treats a file
// that never arrives as the OTHER path rather than as an error (turn 19's
// law). So a bucket that has moved draws nothing and blocks nothing.
//
// ─── AND IT IS A PICTURE ────────────────────────────────────────────────────
//
// Nothing here is imported by `src/engine`, and nothing here writes anywhere.
// A prop cannot reach the BOM, the cut list, the DXF or the invoice, because
// there is no edge in the import graph along which it could travel. That is
// what "structural" means in T58 F8's point 3, and `test/turn58b-f5-props`
// walks the graph and says so.

/** One model, laid into one slot. Draws nothing until its file has landed. */
function Prop({ url, slot, lay }) {
  // The file may arrive after this mesh first rendered; `onGlbLoad` is the
  // app's own answer to that and it is why nothing here needs a loading state.
  const [, bump] = useState(0);
  useEffect(() => onGlbLoad(url, () => bump((n) => n + 1)), [url]);
  const entry = glbSource(url);
  const ready = Boolean(entry?.loaded && entry.scene && entry.size && !entry.failed);

  const placed = useMemo(() => {
    if (!ready) return null;
    // Three's units are metres in this app (`mm(v) = v / 1000`), so the box it
    // measured becomes millimetres by the same constant and nothing here
    // invents a scale.
    const size = { x: entry.size.x / MM, y: entry.size.y / MM, z: entry.size.z / MM };
    const laid = layIntoSlot(size, slot, { lay });
    if (!laid || !laid.fits) return null;
    const seat = seatInSlot(slot, laid.size);
    return seat ? { laid, seat } : null;
  }, [ready, entry?.size, slot, lay]);

  // Centred on its own measured box, so the quarter-turn below is about the
  // piece's middle and `seatInSlot`'s centre-height is the height it lands at.
  const model = useMemo(
    () => (placed ? glbClone(url, { datum: entry.centre }) : null),
    [placed, url, entry?.centre],
  );

  if (!placed || !model) return null;
  return (
    <group
      position={[mm(placed.seat.x), mm(placed.seat.y), mm(placed.seat.z)]}
      rotation={[placed.laid.rotX, 0, 0]}
      scale={placed.laid.scale}
      userData={{ ccProp: true, ccNoBounds: true }}
    >
      <primitive object={model} />
    </group>
  );
}

export default function Props({ result }) {
  const on = useUiStore((s) => s.props);
  const pack = usePropsPack();
  const base = storageBaseUrl();

  const laid = useMemo(() => {
    if (!on || !propsAvailable(pack) || !result) return [];
    const out = [];
    for (const built of result.assemblies?.watchInserts || []) {
      const slots = propSlotsOf(result.panels, built);
      for (const kind of PROP_KINDS) {
        const variants = pack.manifest.filter((row) => row.kind === kind.id);
        // Fewer slots → fill what exists; more → repeat variants. One law, in
        // `lib/props.js`, so the picture cannot disagree with the test.
        for (const { slot, variant, index } of fillSlots(variants, slots[kind.slot] || [])) {
          out.push({
            key: `${built.zone ?? 'w'}-${built.drawer}-${kind.id}-${index}`,
            url: propModelUrl(variant.file, base),
            slot,
            lay: kind.lay,
          });
        }
      }
    }
    return out;
  }, [on, pack, result, base]);

  if (!laid.length) return null;
  return laid.map((p) => <Prop key={p.key} url={p.url} slot={p.slot} lay={p.lay} />);
}
