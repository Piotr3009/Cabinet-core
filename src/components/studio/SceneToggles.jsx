/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 (CLAUDE.md T84 PART D): THE SCENE'S EDGE, THE FOUR TOGGLES
//
// CLAUDE.md T84 F6: *"SceneToggles: four at the scene's top edge: X-ray, Hide
// fronts, Outlines, Open all / Close all (PROPOSED, the designer's set; the
// owner may swap one by the profile list `profile.ui.studio.sceneToggles`),
// each with its title and its pressed state, the SAME handlers and the SAME
// guards as CanvasToolbar's ... never silently widened."*
//
// Under Studio the canvas toolbar is not rendered (F6, INT's one guard in the
// page), so these are its buttons in their new place: every entry below is a
// CanvasToolbar.jsx button copied control for control: the same store action,
// the same `disabled` expression, the same `aria-pressed`, the same label, and
// its title with the toolbar's em dash written as a colon (CONTRACT 0). The
// registry holds the toolbar's EIGHT switches, so the owner's list in the
// profile can name any of them; the profile names four (`xray`, `hideFronts`,
// `outlines`, `openAll`), shown in the profile's order. An id the registry does
// not know is skipped, never invented.
//
// Open all / Close all reads the toolbar's OWN door list and its own "every door
// open" through `useDoorEntries` (CanvasToolbar.jsx): one list of doors, two roads.

import { useUiStore } from '../../stores/uiStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { propsAvailable, propsReason, usePropsPack } from '../../lib/usePropsPack.js';
import { LAYER_CLASS } from '../../lib/modalLayer.js';
import { useDoorEntries } from '../CanvasToolbar.jsx';

/** The toolbar's eight switches, by the ids `profile.ui.studio.sceneToggles` names them with. */
const SCENE_TOGGLE_IDS = Object.freeze([
  'dimensions', 'frontDimensions', 'outlines', 'xray', 'props', 'hideFronts', 'measure', 'openAll',
]);

export default function SceneToggles() {
  const wanted = useCabinetProfileStore((s) => s.profile?.ui?.studio?.sceneToggles);
  const viewMode = useUiStore((s) => s.viewMode);
  const contourView = useUiStore((s) => s.contourView);
  const showDimensions = useUiStore((s) => s.showDimensions);
  const toggleDimensions = useUiStore((s) => s.toggleDimensions);
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const toggleFrontDimensions = useUiStore((s) => s.toggleFrontDimensions);
  const showOutlines = useUiStore((s) => s.showOutlines);
  const toggleOutlines = useUiStore((s) => s.toggleOutlines);
  const xray = useUiStore((s) => s.xray);
  const toggleXray = useUiStore((s) => s.toggleXray);
  const props = useUiStore((s) => s.props);
  const toggleProps = useUiStore((s) => s.toggleProps);
  const propsPack = usePropsPack();
  const propsReady = propsAvailable(propsPack);
  const hideFronts = useUiStore((s) => s.hideFronts);
  const toggleHideFronts = useUiStore((s) => s.toggleHideFronts);
  const rulerOn = useUiStore((s) => s.rulerOn);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  const toggleAllFronts = useUiStore((s) => s.toggleAllFronts);
  const { doorEntries, everyDoorOpen } = useDoorEntries();

  // Each entry: the toolbar's button, field for field (CanvasToolbar.jsx).
  const toggles = {
    dimensions: {
      hook: 'toggle-dimensions',
      label: showDimensions ? 'Hide dimensions' : 'Show dimensions',
      pressed: showDimensions,
      disabled: viewMode !== '3d',
      onClick: toggleDimensions,
      title: showDimensions ? 'Hide dimensions and distance arrows' : 'Show dimensions and distance arrows',
    },
    frontDimensions: {
      hook: 'toggle-front-dimensions',
      label: showFrontDimensions ? 'Hide front dimensions' : 'Front dimensions',
      pressed: showFrontDimensions,
      disabled: viewMode !== '3d',
      onClick: toggleFrontDimensions,
      title: showFrontDimensions
        ? 'Hide front dimensions: sizes, gaps and the merged run figure'
        : 'Show front dimensions: sizes, gaps and the merged run figure',
    },
    outlines: {
      hook: 'toggle-outlines',
      label: 'Outlines',
      pressed: showOutlines || contourView,
      disabled: viewMode !== '3d' || contourView,
      onClick: toggleOutlines,
      title: contourView
        ? 'Contour view draws nothing but the outlines'
        : (showOutlines ? 'Hide the outlines' : 'Show the outlines'),
    },
    xray: {
      hook: 'toggle-xray',
      label: 'X-ray',
      pressed: xray,
      disabled: viewMode !== '3d' || contourView,
      onClick: toggleXray,
      title: contourView
        ? 'Contour view already draws nothing but the outlines'
        : 'See through the carcasses: hinges, runners and legs where they are fitted',
    },
    props: {
      hook: 'toggle-props',
      label: 'Props',
      pressed: props && propsReady,
      disabled: viewMode !== '3d' || contourView || !propsReady,
      onClick: toggleProps,
      title: propsReady
        ? (props ? 'Take the props out of the drawers' : 'Dress the drawers: watches, belt rolls, folded ties')
        : propsReason(propsPack),
    },
    hideFronts: {
      hook: 'toggle-hide-fronts',
      label: 'Hide fronts',
      pressed: hideFronts,
      disabled: viewMode !== '3d',
      onClick: toggleHideFronts,
      title: hideFronts
        ? 'Show the doors and drawer fronts again: nothing about the project changed'
        : 'Take the doors and drawer fronts off the picture: a way of LOOKING, not an edit',
    },
    measure: {
      hook: 'toggle-measure',
      label: 'Measure',
      pressed: rulerOn,
      disabled: viewMode !== '3d',
      onClick: toggleRuler,
      title: rulerOn
        ? 'Measuring: click two points to read the distance. Escape clears, then closes.'
        : 'Measure between two points on the drawing',
    },
    openAll: {
      hook: 'toggle-open-all',
      label: everyDoorOpen ? 'Close all' : 'Open all',
      pressed: everyDoorOpen,
      disabled: viewMode !== '3d' || !doorEntries.length,
      onClick: () => toggleAllFronts(doorEntries),
      title: everyDoorOpen
        ? 'Shut every door in the project'
        : 'Swing every door in the project open: nothing about the project changes',
    },
  };

  const shown = (Array.isArray(wanted) ? wanted : []).filter((id) => Object.hasOwn(toggles, id));
  if (!shown.length) return null;

  return (
    <div
      className={`studio-scene-toggles studio-skin ${LAYER_CLASS.panel}`}
      data-studio="scene-toggles"
      role="toolbar"
      aria-label="Scene toggles"
    >
      {shown.map((id) => {
        const t = toggles[id];
        return (
          <button
            key={id}
            type="button"
            className="cc-btn studio-toggle"
            data-studio={t.hook}
            data-toggle={id}
            aria-pressed={t.pressed}
            disabled={t.disabled}
            title={t.title}
            onClick={t.onClick}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
