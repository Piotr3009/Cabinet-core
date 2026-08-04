// ─── Supabase client with mandatory mock-mode fallback ───
// CLAUDE.md rule 6: with no keys in .env the app must RUN on sample data and
// show a yellow "Mock data mode" badge. It must never crash on a missing key.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

/** True when the app runs without a database — everything stays local. */
export const isMockMode = !url || !anonKey;

export const supabase = isMockMode
  ? null
  : createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

/**
 * Run a Supabase call, degrading gracefully to the mock fallback.
 * Never throws — callers get { data, error, mock }.
 */
export async function withDb(fn, mockValue = null) {
  if (isMockMode || !supabase) return { data: mockValue, error: null, mock: true };
  try {
    const result = await fn(supabase);
    if (result?.error) return { data: mockValue, error: result.error, mock: false };
    return { data: result?.data ?? result, error: null, mock: false };
  } catch (err) {
    // A dead network or a table that has not had sql/001_init.sql run against
    // it must not take the configurator down — fall back to local state.
    return { data: mockValue, error: err, mock: false };
  }
}

export const MOCK_REASON = isMockMode
  ? 'No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — projects stay in this browser.'
  : '';
