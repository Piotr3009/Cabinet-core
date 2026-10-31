/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F2 (law 1) . THE REFUSAL SCREEN: one centred card, three cases, in words.
//
// The owner, 31.10.2026, 09:08: *"warunek: tylko przez JC po zalogowaniu, nie dziala skopiowany url wklejony przez
// byle kogo"*. A Joinery Core session that may not open Cabinet Core reads WHY here, and nothing else is asked of
// JC: no list, no sign out. JC rule 6.1: the word a user reads for that role is EMPLOYEE.
//
// The words are PROPOSED (CLAUDE.md T-CC1a F2.2); `refusalCard` (stores/authStore.js) is pure, so the test reads
// the very strings drawn here.
import { refusalCard, useAuthStore } from '../../stores/authStore.js';

export default function RefusalScreen() {
  const status = useAuthStore((s) => s.status);
  const refusal = useAuthStore((s) => s.refusal);
  const tenant = useAuthStore((s) => s.tenant);
  const message = useAuthStore((s) => s.message);
  const init = useAuthStore((s) => s.init);
  const card = refusalCard({ status, refusal, tenant, message });
  return (
    <div className="h-full w-full bg-shell-900 text-ink-50 flex items-center justify-center" data-jc-refusal={refusal || status}>
      <section className="cc-panel p-6 max-w-[480px] space-y-3 text-center">
        <span className="font-semibold tracking-[0.2em] text-gold text-sm select-none">CABINET CORE</span>
        <h1 className="text-[15px] text-ink-50">{card.title}</h1>
        <p className="text-[13px] text-ink-300 leading-relaxed">{card.line}</p>
        <div className="flex gap-2 justify-center pt-2">
          {card.actions.map((a) => (a.retry ? (
            <button key={a.label} type="button" className="cc-btn" onClick={() => { init(); }}>{a.label}</button>
          ) : (
            <a key={a.label} className="cc-btn" href={a.href}>{a.label}</a>
          )))}
        </div>
      </section>
    </div>
  );
}
