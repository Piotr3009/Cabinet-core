/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useEffect, useMemo } from 'react';

import Modal from './Modal.jsx';
import MaterialPicker from './MaterialPicker.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { JC_OFFLINE } from '../lib/jcApi.js';
import { categoryTree, STOCK_EMPTY, STOCK_PAGE } from '../lib/jcStock.js';

/**
 * ─── T-CC1b F9.3 · THE STOCK WINDOW (law 6) ─────────────────────────────────
 *
 * The owner, 01.11.2026: *"materialy z JC (jego baza), przypisanie w CC"*. The
 * rail's Materials row "Stock..." opens this: the tenant's Joinery Core stock
 * as Cabinet Core sees it, READ-ONLY (name, item number, category, thickness,
 * unit, price, stock, the JC badge), with a search that narrows and the
 * tenant's categories as a tree filter (JC rule 6.3). Width 1240, the font
 * floor of F12. Nothing is written here; a row is added or changed in Joinery
 * Core, Stock. The list is the same component the Assign window embeds.
 */
export default function JcStockModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const materialsSource = useMaterialAssignmentStore((s) => s.materialsSource);
  const stockError = useMaterialAssignmentStore((s) => s.stockError);
  const stockCategories = useMaterialAssignmentStore((s) => s.stockCategories);
  const stockLoading = useMaterialAssignmentStore((s) => s.stockLoading);
  const loadMaterials = useMaterialAssignmentStore((s) => s.loadMaterials);

  useEffect(() => { loadMaterials?.()?.catch?.(() => {}); }, [loadMaterials]);

  const tree = useMemo(() => categoryTree(stockCategories), [stockCategories]);
  // The stock is Joinery Core's rows only: the three generic boards are Cabinet Core's placeholders.
  const rows = useMemo(() => materials.filter((m) => !m.placeholder), [materials]);
  const offline = Boolean(stockError) || (materialsSource !== 'jc' && !stockLoading);

  return (
    <Modal
      name="jc-stock"
      anchor={anchor}
      title="Stock"
      onClose={closeModal}
      width="w-[1240px]"
      className="cc-modal-wide"
      footer={(
        <>
          <span className="text-ink-400 mr-auto" data-stock-count={String(rows.length)}>
            {offline ? '' : `${rows.length} materials in your Joinery Core stock, read-only here`}
          </span>
          <a className="cc-btn" href={STOCK_PAGE} target="_blank" rel="noreferrer" data-stock-open="1">Open Stock in Joinery Core</a>
          <button type="button" className="cc-btn" onClick={closeModal}>Close</button>
        </>
      )}
    >
      <div className="flex flex-col gap-2" data-jc-stock="1">
        {offline && (
          <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-status-warn/60 bg-status-warn/10 text-status-warn" data-stock-offline="1">
            <span className="flex-1">{stockError || JC_OFFLINE}</span>
            <button type="button" className="cc-btn" onClick={() => loadMaterials()} data-stock-retry="1">Retry</button>
          </div>
        )}
        {!offline && rows.length === 0 && (
          <div className="rounded px-2 py-1.5 border border-shell-600" data-stock-empty="1">{STOCK_EMPTY}</div>
        )}
        <MaterialPicker materials={rows} tree={tree} kind="all" testId="stock" maxHeight="64vh" emptyText={STOCK_EMPTY} />
      </div>
    </Modal>
  );
}
