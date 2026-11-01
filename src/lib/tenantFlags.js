/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F14 . SKYLON'S OWN STAYS SKYLON'S (CLAUDE.md T-CC1b law 9)
//
// The owner, 01.11.2026: fronts *"bez ornamentow"*; *"ornamenty zostaw tylko
// dla Skylon Joinery"*, *"tylko dla innych UI, dla Skylon Joinery zostaje"*.
//
// The ornate fronts (ORNATE_STYLE_IDS) are OFFERED to the Skylon Joinery
// tenant only; every other tenant's choice of style shows the plain and the
// machined styles. A saved unit of another tenant that already carries an
// ornate style is not touched: the engine draws it as today, the style stays
// in the list as the current one only, and the words below say why it is not
// offered. Pure: the caller hands in the tenant id
// (useAuthStore.getState().tenant?.id, from Joinery Core's /api/auth/me).

import { FRONT_STYLE_OPTIONS } from '../engine/design.js';
import { ORNATE_STYLE_IDS } from '../engine/frontDecoration.js';

/** Skylon Joinery LTD, as Joinery Core's sql/2026-10-28-site-app-tenants.sql names it. CONFIRMED. */
export const SKYLON_TENANT_ID = 'b663e012-1ae6-45d8-b720-7bcc26baffc2';

/** The line under a current style the tenant is not offered (PROPOSED). */
export const STYLE_NOT_OFFERED = 'This style is not offered to your workshop.';

/** True for the Skylon Joinery tenant only. */
export function isSkylon(tenantId) {
  return typeof tenantId === 'string' && tenantId.trim().toLowerCase() === SKYLON_TENANT_ID;
}

/** The ornate style ids this tenant is offered: all of them for Skylon, none for everyone else. */
export function ornateFrontsFor(tenantId) {
  return isSkylon(tenantId) ? [...ORNATE_STYLE_IDS] : [];
}

/** True when `style` is an ornate style this tenant is not offered (a saved unit keeps drawing it). */
export function styleNotOffered(tenantId, style) {
  return ORNATE_STYLE_IDS.includes(style) && !ornateFrontsFor(tenantId).includes(style);
}

/**
 * The style list a gallery or a select offers this tenant: every plain and
 * machined style, the ornate ones for Skylon only. When `current` is an ornate
 * style the tenant is not offered (an item saved before, or by Skylon), it is
 * kept at the end marked `notOffered: true`, so the control still names what
 * the unit carries and a select never shows a style the unit does not have.
 */
export function frontStylesFor(tenantId, { styles = FRONT_STYLE_OPTIONS, current = null } = {}) {
  const ornate = ornateFrontsFor(tenantId);
  const offered = styles.filter((s) => !ORNATE_STYLE_IDS.includes(s.id) || ornate.includes(s.id));
  if (current && styleNotOffered(tenantId, current) && !offered.some((s) => s.id === current)) {
    const own = styles.find((s) => s.id === current);
    if (own) offered.push({ ...own, notOffered: true });
  }
  return offered;
}
