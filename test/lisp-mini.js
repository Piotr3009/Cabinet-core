/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F1 · A SMALL AUTOLISP READER AND EVALUATOR, FOR THE TESTS ONLY ─────
//
// CLAUDE.md T80 F1: *"The LISP carries the three worked examples (600 one
// door, 800 pair, BUDR2 500) as its own test values"*. Until tonight the suite
// read a kit's NUMBERS block as prose and held the engine to it; it never RAN
// a routine. This file runs one: it reads a kit, defines its `defun`s, and
// calls them with the worked examples' inputs, so the test compares the kit's
// OWN answer with the prose and, from F3 on, with the engine's. LISP is law,
// and now the law is executed rather than quoted.
//
// The subset is what KIT_INFRAME.lsp writes and nothing more: numbers,
// strings, symbols (case-folded, as AutoLISP), `defun` with `/` locals,
// `setq`, `if`, `cond`, `progn`, `while`, `foreach`, `repeat`, `and`, `or`,
// `quote`, and the list and arithmetic builtins named in BUILTINS. Division is
// REAL division always: the kit writes its constants as reals (38.0), so
// AutoLISP's integer division never arises; the kit test asserts that form.
// `princ`, `getreal` and the drawing calls are inert (a command is not run).

/** Read every top-level form of a LISP source. */
export function readLisp(src) {
  const forms = [];
  let i = 0;
  const n = src.length;
  const skip = () => {
    for (;;) {
      while (i < n && /\s/.test(src[i])) i += 1;
      if (src[i] === ';') { while (i < n && src[i] !== '\n') i += 1; continue; }
      return;
    }
  };
  const read = () => {
    skip();
    if (i >= n) throw new Error('unexpected end of LISP source');
    const ch = src[i];
    if (ch === '(') {
      i += 1;
      const list = [];
      for (;;) {
        skip();
        if (src[i] === ')') { i += 1; return list; }
        if (i >= n) throw new Error('unclosed (');
        list.push(read());
      }
    }
    if (ch === ')') throw new Error(`a ) before its ( at ${i}`);
    if (ch === '\'') { i += 1; return [{ sym: 'quote' }, read()]; }
    if (ch === '"') {
      i += 1;
      let s = '';
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') { const e = src[i + 1]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; i += 2; continue; }
        s += src[i]; i += 1;
      }
      i += 1;
      return { str: s };
    }
    let tok = '';
    while (i < n && !/[\s()";]/.test(src[i])) { tok += src[i]; i += 1; }
    if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tok)) return Number(tok);
    return { sym: tok.toLowerCase() };
  };
  for (;;) {
    skip();
    if (i >= n) break;
    forms.push(read());
  }
  return forms;
}

const NIL = null;
const truthy = (v) => !(v === NIL || v === undefined || v === false || (Array.isArray(v) && v.length === 0));
const asList = (v) => (v === NIL || v === undefined ? [] : v);
const listOrNil = (a) => (a.length ? a : NIL);

/** AutoLISP `equal` with an optional fuzz, structural on lists. */
function equalLisp(a, b, fuzz = 0) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= fuzz;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, k) => equalLisp(x, b[k], fuzz));
  return a === b || (!truthy(a) && !truthy(b));
}

const BUILTINS = {
  '+': (...a) => a.reduce((s, x) => s + x, 0),
  '-': (...a) => (a.length === 1 ? -a[0] : a.slice(1).reduce((s, x) => s - x, a[0])),
  '*': (...a) => a.reduce((s, x) => s * x, 1),
  '/': (...a) => a.slice(1).reduce((s, x) => s / x, a[0]),
  '1+': (a) => a + 1,
  '1-': (a) => a - 1,
  max: (...a) => Math.max(...a),
  min: (...a) => Math.min(...a),
  abs: (a) => Math.abs(a),
  fix: (a) => Math.trunc(a),
  float: (a) => a,
  '=': (...a) => (a.every((x) => x === a[0]) ? true : NIL),
  '/=': (a, b) => (a !== b ? true : NIL),
  '<': (...a) => (a.every((x, k) => k === 0 || a[k - 1] < x) ? true : NIL),
  '>': (...a) => (a.every((x, k) => k === 0 || a[k - 1] > x) ? true : NIL),
  '<=': (...a) => (a.every((x, k) => k === 0 || a[k - 1] <= x) ? true : NIL),
  '>=': (...a) => (a.every((x, k) => k === 0 || a[k - 1] >= x) ? true : NIL),
  minusp: (a) => (a < 0 ? true : NIL),
  zerop: (a) => (a === 0 ? true : NIL),
  numberp: (a) => (typeof a === 'number' ? true : NIL),
  not: (a) => (truthy(a) ? NIL : true),
  null: (a) => (truthy(a) ? NIL : true),
  equal: (a, b, fuzz = 0) => (equalLisp(a, b, fuzz) ? true : NIL),
  eq: (a, b) => (a === b ? true : NIL),
  list: (...a) => listOrNil(a),
  cons: (a, b) => [a, ...asList(b)],
  car: (a) => (asList(a).length ? a[0] : NIL),
  cdr: (a) => listOrNil(asList(a).slice(1)),
  cadr: (a) => (asList(a).length > 1 ? a[1] : NIL),
  caddr: (a) => (asList(a).length > 2 ? a[2] : NIL),
  cadddr: (a) => (asList(a).length > 3 ? a[3] : NIL),
  cddr: (a) => listOrNil(asList(a).slice(2)),
  nth: (k, a) => (asList(a).length > k ? a[k] : NIL),
  last: (a) => (asList(a).length ? a[a.length - 1] : NIL),
  length: (a) => asList(a).length,
  append: (...a) => listOrNil(a.flatMap(asList)),
  reverse: (a) => listOrNil([...asList(a)].reverse()),
  member: (x, a) => { const l = asList(a); const k = l.findIndex((y) => equalLisp(x, y)); return k < 0 ? NIL : l.slice(k); },
  strcat: (...a) => a.join(''),
  itoa: (a) => String(Math.trunc(a)),
  rtos: (a, _mode, prec = 4) => Number(a).toFixed(prec),
  princ: () => NIL,
  prompt: () => NIL,
  getreal: () => NIL,
  getint: () => NIL,
  getstring: () => NIL,
};

/** Load a kit's source: every `defun` defined, every other top-level form evaluated. */
export function loadLisp(src) {
  const fns = new Map();
  const globals = new Map([['t', true], ['nil', NIL], ['pi', Math.PI]]);

  const lookup = (name, env) => {
    for (let e = env; e; e = e.parent) if (e.vars.has(name)) return e.vars.get(name);
    return globals.has(name) ? globals.get(name) : NIL;
  };
  const assign = (name, value, env) => {
    for (let e = env; e; e = e.parent) if (e.vars.has(name)) { e.vars.set(name, value); return; }
    globals.set(name, value);
  };

  const call = (name, args) => {
    const fn = fns.get(name);
    if (fn) {
      const vars = new Map();
      fn.params.forEach((p, k) => vars.set(p, k < args.length ? args[k] : NIL));
      for (const l of fn.locals) vars.set(l, NIL);
      const env = { vars, parent: null };
      let out = NIL;
      for (const form of fn.body) out = evaluate(form, env);
      return out;
    }
    if (BUILTINS[name]) return BUILTINS[name](...args);
    throw new Error(`LISP: no function ${name}`);
  };

  function evaluate(form, env) {
    if (typeof form === 'number') return form;
    if (form && form.str !== undefined) return form.str;
    if (form && form.sym !== undefined) return lookup(form.sym, env);
    if (!Array.isArray(form) || form.length === 0) return NIL;
    const head = form[0].sym;
    const rest = form.slice(1);
    switch (head) {
      case 'quote': return rest[0];
      case 'defun': {
        const name = rest[0].sym;
        const spec = rest[1] || [];
        const slash = spec.findIndex((s) => s.sym === '/');
        const params = (slash < 0 ? spec : spec.slice(0, slash)).map((s) => s.sym);
        const locals = slash < 0 ? [] : spec.slice(slash + 1).map((s) => s.sym);
        fns.set(name, { params, locals, body: rest.slice(2) });
        return name;
      }
      case 'setq': {
        let v = NIL;
        for (let k = 0; k < rest.length; k += 2) { v = evaluate(rest[k + 1], env); assign(rest[k].sym, v, env); }
        return v;
      }
      case 'if': return truthy(evaluate(rest[0], env)) ? evaluate(rest[1], env) : (rest.length > 2 ? evaluate(rest[2], env) : NIL);
      case 'cond': {
        for (const clause of rest) {
          const v = evaluate(clause[0], env);
          if (truthy(v)) { let out = v; for (const f of clause.slice(1)) out = evaluate(f, env); return out; }
        }
        return NIL;
      }
      case 'progn': { let out = NIL; for (const f of rest) out = evaluate(f, env); return out; }
      case 'and': { for (const f of rest) if (!truthy(evaluate(f, env))) return NIL; return true; }
      case 'or': { for (const f of rest) if (truthy(evaluate(f, env))) return true; return NIL; }
      case 'while': { let out = NIL; while (truthy(evaluate(rest[0], env))) for (const f of rest.slice(1)) out = evaluate(f, env); return out; }
      case 'repeat': { let out = NIL; const k = evaluate(rest[0], env); for (let j = 0; j < k; j += 1) for (const f of rest.slice(1)) out = evaluate(f, env); return out; }
      case 'foreach': {
        const name = rest[0].sym;
        const list = asList(evaluate(rest[1], env));
        const inner = { vars: new Map([[name, NIL]]), parent: env };
        let out = NIL;
        for (const item of list) { inner.vars.set(name, item); for (const f of rest.slice(2)) out = evaluate(f, inner); }
        return out;
      }
      default: return call(head, rest.map((f) => evaluate(f, env)));
    }
  }

  const top = { vars: new Map(), parent: null };
  for (const form of readLisp(src)) {
    // A command (c:...) is DEFINED, never run: it prompts and draws.
    evaluate(form, top);
  }
  return {
    /** Call a routine of the kit with JS values (arrays for lists, null for nil). */
    call: (name, ...args) => call(String(name).toLowerCase(), args),
    has: (name) => fns.has(String(name).toLowerCase()),
    names: () => [...fns.keys()],
  };
}
