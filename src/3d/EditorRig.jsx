import { editorRigLamps } from '../engine/render.js';

// ─── THE BENCH LAMP (turn 16, CLAUDE.md F7) ─────────────────────────────────
//
// The owner, of the element detail window and the exploded editor: "serio nic
// nie widać". Both windows carried three lights as LITERALS in their own JSX —
// an ambient at 0.75/0.8 and two directionals — so the rig could not be turned
// up without editing a component, and the two windows could drift apart while
// showing the same part.
//
// ONE rig, in the profile (`appearance.editorRig`), consumed here and used by
// both. It is deliberately NOT the studio rig: the studio lights a ROOM for a
// picture of furniture, and this lights ONE PART held up on a bench, where what
// has to read is the machining — a dog bone, a 5 mm hinge hole, the break on an
// edge. Those live inside 6 mm features whose walls face away from any single
// key, which is why the answer is lamps from more angles rather than one
// brighter lamp.
//
// Positions are FRACTIONS of the window's own orbit radius, so a 300 mm drawer
// front and a 2.4 m wardrobe are lit alike.
export default function EditorRig({ profile, radius }) {
  const rig = editorRigLamps(profile, radius);
  return (
    <>
      <ambientLight intensity={rig.ambient} />
      <hemisphereLight
        args={[rig.hemisphere.sky, rig.hemisphere.ground, rig.hemisphere.intensity]}
      />
      {rig.lamps.map((l) => (
        <directionalLight
          key={l.id}
          position={l.position}
          intensity={l.intensity}
        />
      ))}
    </>
  );
}
