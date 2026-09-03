import { useEffect, useState } from 'react';

// ─── HASH ROUTING, AND NO ROUTER ───────────────────────────────────────────
//
// CLAUDE.md F3: *"`retail.html#/design` (hash routing inside the retail app;
// no router dependency)"*, and the standing law: *"No new npm dependencies."*
//
// So: `location.hash` is the whole router. Eleven lines, one event listener,
// and it survives a reload — which matters more than it sounds, because F5's
// estimate is memory-only and a client who reloads has lost their design; at
// least they land where they were.
//
// T64 F5: `/estimate` — MY ESTIMATE, its own page, as in Prime Sash Windows.
// The retail router only; PRO's `/` is untouched.

export const ROUTES = [
  '/', '/design', '/estimate', '/collections', '/contact', '/materials', '/design-process', '/about', '/journal',
];

/** '#/design?collection=black-label' → { path: '/design', query: { collection: 'black-label' } } */
export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '') || '/';
  const [pathRaw, queryRaw = ''] = raw.split('?');
  const path = pathRaw.startsWith('/') ? pathRaw.replace(/\/+$/, '') || '/' : `/${pathRaw}`;
  const query = {};
  for (const pair of queryRaw.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  // F6: *"No route 404s."* An unknown path is the landing page, not an error —
  // a client who mistypes a URL is still a client.
  return { path: ROUTES.includes(path) ? path : '/', query, unknown: !ROUTES.includes(path) };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(
    typeof window === 'undefined' ? '#/' : window.location.hash,
  ));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    onChange();
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path) => {
  if (typeof window !== 'undefined') window.location.hash = path;
};

export const hashHref = (path) => `#${path}`;
