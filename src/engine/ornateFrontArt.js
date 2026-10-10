// Copyright (c) 2026 Skylon Development Ltd.
// Gallery artwork in proportional SVG units, not manufacturing dimensions.
const ring = (inset, symmetric, soft) => {
  const l = 15 + inset, r = 85 - inset, t = 15 + inset, b = 125 - inset;
  const radius = symmetric ? (r - l) / 2 : (soft ? 22 : 37) - inset;
  return symmetric
    ? `M ${l} ${t + radius} A ${radius} ${radius} 0 0 1 ${r} ${t + radius} L ${r} ${b - radius} A ${radius} ${radius} 0 0 1 ${l} ${b - radius} Z`
    : `M ${l + radius} ${t} H ${r} V ${b - radius} A ${radius} ${radius} 0 0 1 ${r - radius} ${b} H ${l} V ${t + radius} A ${radius} ${radius} 0 0 1 ${l + radius} ${t} Z`;
};

function flower(x, y, sx, sy) {
  const path = [];
  const p = (a, b) => `${x + sx * a} ${y + sy * b}`;
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const dx = Math.cos(a), dy = Math.sin(a);
    path.push({ path: `M ${p(dx * 1.8, dy * 1.8)} Q ${p(dx * 7 - dy * 2, dy * 7 + dx * 2)} ${p(dx * 7.4, dy * 7.4)} Q ${p(dx * 7 + dy * 2, dy * 7 - dx * 2)} ${p(dx * 1.8, dy * 1.8)} Z`, soft: true });
  }
  path.push({ path: `M ${p(-2, 0)} A 2 2 0 1 0 ${p(2, 0)} A 2 2 0 1 0 ${p(-2, 0)} Z` });
  for (const [a, b, c, d] of [[7, -1, 16, -5], [0, 8, -4, 18], [11, -3, 22, -5]]) {
    path.push({ path: `M ${p(a, b)} Q ${p(c, b + 2)} ${p(c, d)} Q ${p(a, d - 1)} ${p(a, b)} Z`, soft: true });
  }
  return path;
}

const art = (variant) => [
  { rect: [4, 4, 92, 132] },
  { rect: [13, 13, 74, 114] },
  ...[0, 2, 4, 6].map((n) => ({ path: ring(n, variant === 2, variant === 3), soft: n > 0 })),
  ...(variant === 4 ? [] : [
    ...flower(21, 22, 1, 1), ...flower(79, 118, -1, -1),
    ...(variant === 2 ? [...flower(79, 22, -1, 1), ...flower(21, 118, 1, -1)] : []),
  ]),
];

export const ORNATE_FRONT_ART = Object.fromEntries([1, 2, 3, 4].map((v) => [`ORNATE_A_${v}`, art(v)]));
