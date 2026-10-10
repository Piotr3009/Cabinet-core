// T75 F21 · THE CSV CONTRACT WITH JOINERYCORE. The owner: *"stock połączony z
// joinery core, na razie export import za pomocą csv coś jak production core,
// później api."*  Nothing here reaches a cut: the warehouse, the purchase list,
// a Check.

export const LICENSED = {
  'src/engine/warehouse.js': {
    why: 'F21 · the round trip fixed where the probe measured it failing: records split quote-aware, '
      + 'numbers read as JoineryCore writes them (comma decimals, null for a non-number), `jc_uuid` matched '
      + 'however it is printed, a worn item number renumbered and said; `projectUuids`, `priceSnapshot`, '
      + '`catalogueMoves`, `catalogueStamp`. The warehouse, not a cut',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F21 · `purchaseBom` lines carry `jc_uuid`, `code` and `price_source`, and a material in the job\'s '
      + 'quote (`pricedAt`) is priced at its quoted figure. A purchase list, not a cut',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F21 · Check #29, yellow: the price list moved since the job was priced, in words. Reads; cuts nothing',
    gates: [],
  },
  'src/lib/exporters.js': {
    why: 'F21 · the purchase CSV appends JC_UUID and CODE after PARTS and is priced at the quote. A file writer',
    gates: [],
  },
};
