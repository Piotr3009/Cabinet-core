/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 · THE HARDWARE SILHOUETTES THE PROJECTOR ASKS FOR (PART D, F7)
//
// The projector (./projector.js) asks one question per hardware instance:
// `silhouetteMark(family, instance)`, and gets back null (draw today's
// symbol) or a function of the view's name returning closed 3-D rings in the
// instance's UNIT frame, the silhouette traced from the room's own GLB and
// set down where the room sets the model. F1 lands the question; F7 lands
// the traced file and the answer.

/** No silhouette has been traced yet: every family draws today's symbol. */
export function silhouetteMark() {
  return null;
}
