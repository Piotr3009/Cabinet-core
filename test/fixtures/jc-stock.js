/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F9 . THE FIXTURE STOCK: rows as Joinery Core's `stock_items` and `stock_categories` hand them over
// (the columns of CLAUDE.md T-CC1b F9.1, lib/jcStock.js STOCK_COLUMNS), so a test reads the tenant's stock the
// way the app does, through `toMaterial`, and never a material list of Cabinet Core's own (law 6).

import { toMaterial } from '../../src/lib/jcStock.js';
import { GENERIC_MATERIALS } from '../../src/stores/materialAssignmentStore.js';

const row = (id, name, category, subcategory, unit, cost, extra = {}) => ({
  id, name, category, subcategory, unit, current_quantity: 10, cost_per_unit: cost,
  size: '', thickness: null, color: '', item_number: '', image_url: null, supplier_id: null, ...extra,
});

export const STOCK_ITEMS = [
  row('b6a1f3d2-0001-4c1e-9a10-000000000001', 'Egger W980 White melamine 18 mm', 'Sheet materials', 'Melamine', 'sheet', 38.5,
    { thickness: '18', color: 'White', size: '2800 x 2070', item_number: 'EG-W980-18' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000002', 'MDF 18 mm', 'Sheet materials', 'MDF', 'sheet', 29.9,
    { thickness: '18', size: '2440 x 1220', item_number: 'MDF-18' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000003', 'ABS edging white 22 x 1', 'Edging', 'ABS', 'm', 0.55,
    { thickness: '1', color: 'White', item_number: 'ABS-22-1' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000004', 'Blum Clip top Blumotion 110 hinge', 'Ironmongery', 'Hinges', 'pcs', 3.8,
    { item_number: '71B3550' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000005', 'Blum Clip top 155 hinge', 'Ironmongery', 'Hinges', 'pcs', 5.1,
    { item_number: '71T6550' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000006', 'Blum Movento runner pair', 'Ironmongery', 'Runners', 'pairs', 6.9,
    { item_number: '760H' }),
  row('b6a1f3d2-0001-4c1e-9a10-000000000007', 'Shelf pin 5 mm nickel', 'Ironmongery', 'Fittings', 'pcs', 0.09),
  row('b6a1f3d2-0001-4c1e-9a10-000000000008', 'Adjustable leg 100 mm', 'Ironmongery', 'Legs', 'pcs', 0.95),
  row('b6a1f3d2-0001-4c1e-9a10-000000000009', 'Wall cabinet hanger bracket', 'Ironmongery', 'Fittings', 'pcs', 1.85),
  row('b6a1f3d2-0001-4c1e-9a10-00000000000a', 'Oval hanging rail 30 x 15', 'Ironmongery', 'Rails', 'm', 4.2),
  row('b6a1f3d2-0001-4c1e-9a10-00000000000b', 'Tin of paint, Hague Blue 2.5 L', 'Finishes', 'Paint', 'tin', 42, { color: 'Hague Blue' }),
];

export const STOCK_CATEGORIES = [
  { id: 'c1', name: 'Sheet materials', type: 'category', parent_category_id: null, display_order: 1 },
  { id: 'c1a', name: 'Melamine', type: 'subcategory', parent_category_id: 'c1', display_order: 1 },
  { id: 'c1b', name: 'MDF', type: 'subcategory', parent_category_id: 'c1', display_order: 2 },
  { id: 'c2', name: 'Edging', type: 'category', parent_category_id: null, display_order: 2 },
  { id: 'c2a', name: 'ABS', type: 'subcategory', parent_category_id: 'c2', display_order: 1 },
  { id: 'c3', name: 'Ironmongery', type: 'category', parent_category_id: null, display_order: 3 },
  { id: 'c3a', name: 'Hinges', type: 'subcategory', parent_category_id: 'c3', display_order: 1 },
  { id: 'c3b', name: 'Runners', type: 'subcategory', parent_category_id: 'c3', display_order: 2 },
  { id: 'c4', name: 'Finishes', type: 'category', parent_category_id: null, display_order: 4 },
];

/** The materials the store holds after a read of the rows above: the three generics, then every row. */
export const STOCK_MATERIALS = [...GENERIC_MATERIALS, ...STOCK_ITEMS.map(toMaterial)];

/** One material by the start of its name (a test's own shorthand). */
export const stock = (name) => STOCK_MATERIALS.find((m) => m.name.startsWith(name));
