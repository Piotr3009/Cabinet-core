import { useCallback, useState } from 'react';
import GoldLine from '../ui/GoldLine.jsx';
import { Button } from '../design/controls.jsx';
import QuoteForm from '../ui/QuoteForm.jsx';
import { useEstimateStore } from './store.js';
import { buildEstimateDocument, estimateMailBody } from './document.js';
import { downloadJson, estimateFilename, readJsonFile } from './download.js';
import { openMail } from './mail.js';
import { go } from '../site/router.js';
import { PRICE_FOOTNOTE, PRICE_ON_REQUEST } from '../config.js';
import * as A from '../design/adapter.js';

// ─── T64 F5 · MY ESTIMATE — ITS OWN PAGE, AS IN PRIME SASH WINDOWS ─────────
//
// The owner: *"wycena inna strona, na której masz 2–3 szafy i wtedy otwierasz
// szafę i edytujesz — zobacz na PRIME SASH WINDOWS."* Then: *"cena się
// konfiguruje sama … i później jak już zakończymy, przycisk DONE i ADD TO
// ESTIMATE."*
//
// THE STRUCTURE IS PSW'S, READ TONIGHT (F0), AND NOTHING IS IMPORTED FROM IT:
//
//   /tmp/psw/src/pages/EstimatesPage.jsx        the list — one row per item
//     with its facts in columns and its actions at the right end
//     (Configure / Edit / Archive); an empty state that says "No estimates
//     yet" and offers the one button that fixes it.
//   /tmp/psw/src/pages/EstimateConfiguratorPage.jsx   one item at a time in
//     the configurator (ADD / EDIT mode off the URL), and under it "Windows
//     in estimate" — Location · Type · Price · Edit · × — with
//     `removeItem(estimateId, itemId)` on the ×. Here that list IS this page,
//     and the room is the configurator (`design/DesignRoom.jsx enterRoom`).
//   /tmp/psw/src/components/layout/MainLayout.jsx + AppSidebar.jsx   how a
//     page and its navigation compose: the page under one persistent nav,
//     and the nav's Estimates entry always there. Here the nav is the site
//     header and MY ESTIMATE (n) is that entry (F4).
//
// THE SKIN IS PBI'S. Ivory & Onyx, the display serif for the name, the UI
// sans for the facts, gold in a hairline, one filled button on the page.
//
// ONE PERSISTENCE PATH holds the items — `estimate/store.js`, the SAVE/LOAD
// store T59 wrote, with `committed` / `thumb` / `duplicate` / `remove`
// grown onto it (CLAUDE.md: *"An item IS a saved design … do not write a
// second persistence"*). SAVE / LOAD is that store's own file, renamed on
// the page to what it is: SAVED ESTIMATES.
//
// THE EGGER GATE (PR body): quote requests carry decor names; the public
// launch still waits on the Egger UK mail.

const mmText = (n) => `${Math.round(Number(n) || 0)} mm`;

/** F5.2 · the quote form, over the page, in the design system — moved here from the room. */
function QuoteOverlay({ onClose, onSubmit }) {
  return (
    <div
      data-testid="quote-overlay"
      className="pbi-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pbi-overlay-card">
        <h2 className="pbi-display pbi-h3">REQUEST A QUOTE</h2>
        <GoldLine />
        <p className="pbi-choice pbi-choice-15 pbi-overlay-line">
          Every wardrobe in your estimate comes with the message. Nothing is ordered and nothing
          is charged.
        </p>
        <QuoteForm testid="quote-form" onSubmit={onSubmit} />
        <div className="pbi-overlay-back">
          <Button kind="link" data-testid="quote-close" onClick={onClose}>‹ BACK TO MY ESTIMATE</Button>
        </div>
      </div>
    </div>
  );
}

/** One item's facts, read off its own snapshot — the same shape LOAD takes back. */
function factsOf(item) {
  const snap = item?.snapshot || {};
  const project = snap.project || {};
  const main = (snap.units || []).find((u) => !u.params?.rides_on) || snap.units?.[0] || null;
  const p = main?.params || {};
  const wall = Math.round(Math.abs(project.room?.corners?.[1]?.x ?? 0));
  return {
    room: `${mmText(wall)} wall · ceiling ${mmText(project.room?.height)}`,
    size: `${mmText(p.width)} × ${mmText(p.height)} × ${mmText(p.depth)}`,
    fronts: A.frontsWords(project),
  };
}

export default function EstimatePage({ today = new Date().toISOString().slice(0, 10) }) {
  const estimate = useEstimateStore();
  const items = estimate.designs.filter((d) => d.committed);
  const [quoteOpen, setQuoteOpen] = useState(false);

  // ─── THE ESTIMATE'S OWN BUTTONS — for the whole list now ─────────────────
  const document_ = useCallback(() => {
    estimate.capture();
    return buildEstimateDocument({
      designs: useEstimateStore.getState().designs.filter((d) => d.committed),
      details: estimate.details,
      isoDate: today,
    });
  }, [estimate, today]);

  const onSave = useCallback(() => {
    downloadJson(estimateFilename(today), document_());
  }, [document_, today]);

  const onQuoteSubmit = useCallback((details) => {
    estimate.setDetails(details);
    const doc = { ...document_(), details };
    downloadJson(estimateFilename(today), doc);
    openMail({ subject: `Estimate request — ${details.name || 'Prime Bespoke Interiors'}`, body: estimateMailBody(doc) });
    setQuoteOpen(false);
  }, [document_, estimate, today]);

  const onLoad = useCallback((file) => {
    readJsonFile(file).then((doc) => useEstimateStore.getState().loadEstimate(doc)).catch(() => {});
  }, []);

  return (
    <main className="pbi-est-page" data-testid="estimate-page">
      <div className="pbi-est-head">
        <div>
          <h1 className="pbi-display pbi-h2">MY ESTIMATE</h1>
          <GoldLine />
          <p className="pbi-choice pbi-choice-15" data-testid="estimate-count">
            {items.length === 0
              ? 'No wardrobes in it yet.'
              : `${items.length} wardrobe${items.length === 1 ? '' : 's'} · ${PRICE_ON_REQUEST}`}
          </p>
          <p className="pbi-ui pbi-ui-light pbi-quiet" data-testid="estimate-footnote">{PRICE_FOOTNOTE}</p>
        </div>
        {/* THE ONE FILLED BUTTON on the page — PSW's "+ New estimate", which
            here is a new wardrobe: the room in ADD mode, at step 1. */}
        <Button data-testid="add-another" onClick={() => go('/design?new=1')}>
          + ADD ANOTHER WARDROBE
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="pbi-est-empty" data-testid="estimate-empty">
          <p className="pbi-display pbi-h3">NOTHING HERE YET</p>
          <p className="pbi-choice pbi-choice-15">
            Design a wardrobe and press DONE → ADD TO MY ESTIMATE. It will be listed here, and
            you can add another beside it.
          </p>
        </div>
      ) : (
        <div className="pbi-est-table" data-testid="estimate-list" role="table">
          <div className="pbi-est-tr pbi-est-th" role="row">
            <span />
            <span className="pbi-ui pbi-ui-light pbi-quiet">NAME</span>
            <span className="pbi-ui pbi-ui-light pbi-quiet">ROOM</span>
            <span className="pbi-ui pbi-ui-light pbi-quiet">W × H × D</span>
            <span className="pbi-ui pbi-ui-light pbi-quiet">FRONTS</span>
            <span className="pbi-ui pbi-ui-light pbi-quiet">PRICE</span>
            <span className="pbi-ui pbi-ui-light pbi-quiet">ACTIONS</span>
          </div>
          {items.map((item, i) => {
            const facts = factsOf(item);
            return (
              <div key={item.id} className="pbi-est-tr" role="row" data-testid={`estimate-row-${i + 1}`}>
                <span className="pbi-est-thumb">
                  {item.thumb ? (
                    <img src={item.thumb} alt="" data-testid="estimate-thumb" />
                  ) : (
                    <span className="pbi-est-thumb-none" aria-hidden="true" />
                  )}
                </span>
                <span className="pbi-display pbi-h4 pbi-est-name" data-testid={`estimate-name-${i + 1}`}>{item.name}</span>
                <span className="pbi-choice">{facts.room}</span>
                <span className="pbi-choice">{facts.size}</span>
                <span className="pbi-choice">{facts.fronts}</span>
                <span className="pbi-display pbi-est-row-price">{PRICE_ON_REQUEST}</span>
                <span className="pbi-est-actions">
                  <Button kind="link" data-testid={`estimate-edit-${i + 1}`} onClick={() => go(`/design?edit=${item.id}`)}>
                    EDIT
                  </Button>
                  <Button kind="link" data-testid={`estimate-duplicate-${i + 1}`} onClick={() => estimate.duplicate(item.id)}>
                    DUPLICATE
                  </Button>
                  <Button
                    kind="link"
                    data-testid={`estimate-remove-${i + 1}`}
                    title="Take this wardrobe out of the estimate"
                    onClick={() => estimate.remove(item.id)}
                  >
                    ×
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="pbi-est-foot">
        <div className="pbi-est-foot-block">
          <h2 className="pbi-display pbi-h4">YOUR QUOTE</h2>
          <GoldLine />
          <div className="pbi-est-foot-actions">
            <Button
              kind="secondary"
              data-testid="estimate-quote"
              disabled={items.length === 0}
              onClick={() => setQuoteOpen(true)}
            >
              REQUEST A QUOTE
            </Button>
          </div>
        </div>
        <div className="pbi-est-foot-block">
          {/* SAVE / LOAD — the existing project list, renamed to what it is. */}
          <h2 className="pbi-display pbi-h4">SAVED ESTIMATES</h2>
          <GoldLine />
          <div className="pbi-est-foot-actions">
            <Button
              kind="secondary"
              size="small"
              data-testid="estimate-save"
              disabled={items.length === 0}
              onClick={onSave}
            >
              SAVE THIS ESTIMATE
            </Button>
            <label className="pbi-btn pbi-btn-secondary pbi-btn-small pbi-link-file">
              LOAD AN ESTIMATE
              <input
                type="file"
                accept="application/json,.json"
                hidden
                data-testid="detail-load"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); }}
              />
            </label>
          </div>
        </div>
      </div>

      {quoteOpen ? (
        <QuoteOverlay onClose={() => setQuoteOpen(false)} onSubmit={onQuoteSubmit} />
      ) : null}
    </main>
  );
}
