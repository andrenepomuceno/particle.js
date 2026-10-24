// Regenerates the v1 ports whose particles are laid out per atom or per text pixel
// (one or two groups per site), which would be impractical to write by hand.
// Usage: node scripts/gen-v1-scenarios.mjs   (writes into src/scenarios/library/)
// v1 sources: ../particle.js/src/simulation/scenarios_v1/{forceMap,quarkModel,epnModel,record}.js.
// Every constant below is v1's value converted with that scenario's unit scale (M, KG, S, C).
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const LIBRARY = fileURLToPath(new URL('../src/scenarios/library/', import.meta.url));

/** Rounds to 5 significant digits so the JSON stays readable. */
const sig = (x) => Number(x.toPrecision(5));

/** Deterministic PRNG (mulberry32): the files must not change between runs. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** v1's SI → simulation unit conversion: lengths in M, masses in KG, times in S, charges in C. */
function units({ M, KG, S, C }) {
  return {
    range: sig(3e-15 * M),
    nuclear: sig(30e3 * KG * M * S ** -2),
    coulomb: sig(8.988e9 * KG * M ** 3 * S ** -2 * C ** -2),
    up: sig(5.347988087839e-30 * KG),
    down: sig(1.069597617568e-29 * KG),
    electron: sig(9.1093837015e-31 * KG),
    proton: sig(1.67262192e-27 * KG),
    neutron: sig(1.67492749e-27 * KG),
    e: sig(1.602176634e-19 * C),
  };
}

// v1 nuclear potential shapes (computeShader.glsl.js), x = d / range. v1 counted positive as
// attraction; v2 counts positive as repulsion, hence the leading minus sign.
const POW_AX_V2 = '-k * n_i * n_j * sin(A * (1 - B^x))';
const POW_AX_V3 = '-k * n_i * n_j * sin(A * (1 - B^x)) * a * exp(-a * x)';
const FORCE_MAP_2 = '-k * n_i * n_j * (a * exp(-x / b) - c * x)';
const FORCE_MAP_1 = '-k * n_i * n_j * (1 - 2 * step(0.5, x))';
// v1 color charge: a constant pull of 2/3 between different colors and a push of 1 between
// equal colors inside the nuclear range, scaled by both nuclear charges; uncolored particles
// do not take part. same = 1 for equal colors, both = 1 when both particles carry a color.
const V1_COLOR = 'k * n_i * n_j * (5 * (cr_i * cr_j + cg_i * cg_j + cb_i * cb_j) - 2 * (cr_i + cg_i + cb_i) * (cr_j + cg_j + cb_j)) / 3';

function nuclearForce(name, expression, cutoff, k, extra) {
  return {
    name,
    mode: 'force',
    range: 'short',
    cutoff,
    expression,
    params: [{ name: 'k', value: k }, ...Object.entries(extra).map(([n, value]) => ({ name: n, value }))],
  };
}
const powAXv2 = (cutoff, k) => nuclearForce('Nuclear (v1 powAXv2)', POW_AX_V2, cutoff, k, { A: 6.64541, B: 0.054507 });
const powAXv3 = (cutoff, k) => nuclearForce('Nuclear (v1 powAXv3)', POW_AX_V3, cutoff, k, { A: 6.64541, B: 0.054507, a: 3 });
const coulomb = (k, softening) => ({ preset: 'coulomb', softening, params: { k } });
const coulomb1 = (k, softening) => ({
  name: 'Coulomb (v1 1/d)',
  mode: 'force',
  range: 'long',
  softening,
  expression: 'k * q_i * q_j / r',
  params: [{ name: 'k', value: k }],
});

/** One v1 particle type: mass, charge, nuclear charge and optional color. */
const type = (m, q, n, color) => ({ m, q, n, color });

function cycle(values) {
  return values.every((v) => JSON.stringify(v) === JSON.stringify(values[0])) ? values[0] : { cycle: values };
}

/** Attributes of a group whose particles take the types in turn (v1's randomSequence: false). */
function typed(types) {
  const out = {
    mass: cycle(types.map((t) => t.m)),
    charge: cycle(types.map((t) => t.q)),
    nuclearCharge: cycle(types.map((t) => t.n)),
  };
  if (types.some((t) => t.color)) out.color = cycle(types.map((t) => t.color ?? [0, 0, 0]));
  return out;
}

const speed = (v) => (v > 0 ? { velocity: { type: 'random', speed: { min: 0, max: v } } } : {});

/**
 * v1's createNucleiFromList: `copies` × nucleus types in a disk of radius r0 around the center,
 * and `cloud` × electrons in the annulus [r0, r1].
 */
function atom(center, nucleus, copies, electron, cloud, r0, r1, v) {
  const groups = [
    { count: nucleus.length * copies, shape: { type: 'disk', radius: r0, center }, ...speed(v), ...typed(nucleus) },
  ];
  if (cloud > 0) {
    groups.push({ count: cloud, shape: { type: 'disk', radius: r1, innerRadius: r0, center }, ...speed(v), ...typed([electron]) });
  }
  return groups;
}

/** v1's cubeGenerator in 2D: a centered columns × rows lattice, row-major, y downwards. */
function lattice(columns, rows, spacing) {
  const sites = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      sites.push([sig((x - columns / 2 + 0.5) * spacing), sig(-(y - rows / 2 + 0.5) * spacing), 0]);
    }
  }
  return sites;
}

/** v1's calcGridSize: the largest square grid whose sites × particlesPerSite fit in maxParticles. */
function gridSize(particlesPerSite, maxParticles = 10000) {
  let g = 5;
  while (particlesPerSite * (g + 1) * (g + 1) <= maxParticles) g++;
  return g;
}

/** Picks an element by relative abundance (what v1's ratio lists meant; see the task's Result). */
function pickElement(elements, random) {
  const total = elements.reduce((s, e) => s + e.r, 0);
  let u = random() * total;
  for (const e of elements) {
    if ((u -= e.r) < 0) return e;
  }
  return elements[elements.length - 1];
}

// 7-row bitmap glyphs for the text scenes (v1 rasterized Arial on a canvas at load time).
const GLYPHS = {
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###'],
  c: ['....', '....', '.###', '#...', '#...', '#...', '.###'],
  e: ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
  i: ['#', '.', '#', '#', '#', '#', '#'],
  j: ['..#', '...', '..#', '..#', '..#', '#.#', '.#.'],
  l: ['#', '#', '#', '#', '#', '#', '#'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
  p: ['....', '....', '###.', '#..#', '###.', '#...', '#...'],
  r: ['...', '...', '#.#', '##.', '#..', '#..', '#..'],
  s: ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
  t: ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#'],
};

/**
 * Text as lit pixel rectangles {x, y, columns, rows} in pixel units (y up), one line every
 * `pitch` pixels with each line centered like v1's stringToCoordinates; `scale` pixels per glyph dot.
 */
function textRectangles(lines, scale, pitch) {
  const pixels = new Set();
  lines.forEach((text, line) => {
    const glyphs = [...text].map((ch) => {
      const g = GLYPHS[ch];
      if (!g) throw new Error(`no glyph for '${ch}'`);
      return g;
    });
    const width = glyphs.reduce((w, g) => w + g[0].length + 1, -1) * scale;
    let x0 = -Math.round(width / 2);
    const top = Math.round(((lines.length - 1) / 2 - line) * pitch + (7 * scale) / 2);
    for (const g of glyphs) {
      g.forEach((row, gy) => {
        [...row].forEach((dot, gx) => {
          if (dot !== '#') return;
          for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) pixels.add(`${x0 + gx * scale + a},${top - gy * scale - b}`);
        });
      });
      x0 += (g[0].length + 1) * scale;
    }
  });
  // Greedy rectangles: horizontal runs extended downwards while the next row repeats the run.
  const used = new Set();
  const lit = (x, y) => pixels.has(`${x},${y}`) && !used.has(`${x},${y}`);
  const coords = [...pixels].map((p) => p.split(',').map(Number)).sort((p, q) => q[1] - p[1] || p[0] - q[0]);
  const rects = [];
  for (const [x, y] of coords) {
    if (!lit(x, y)) continue;
    let columns = 1;
    while (lit(x + columns, y)) columns++;
    let rows = 1;
    const rowLit = (yy) => Array.from({ length: columns }, (_, k) => lit(x + k, yy)).every(Boolean) && !lit(x - 1, yy) && !lit(x + columns, yy);
    while (rowLit(y - rows)) rows++;
    for (let r = 0; r < rows; r++) for (let k = 0; k < columns; k++) used.add(`${x + k},${y - r}`);
    rects.push({ x, y, columns, rows });
  }
  return { rects, count: pixels.size };
}

/**
 * v1's text scenes put one small atom on every lit pixel: its quarks in a disk of radius r0
 * (here a ring of radius r0/√2, the disk's rms radius, so a lattice of pixels is one group) and
 * its electrons within r1 of the pixel (here spread uniformly over the rectangle, widened by r1).
 */
function textGroups(rects, spacing, offsetY, quarks, copies, electron, electronsPerPixel, r0, r1) {
  const groups = [];
  for (const { x, y, columns, rows } of rects) {
    const center = [sig((x + (columns - 1) / 2) * spacing), sig((y - (rows - 1) / 2 + offsetY) * spacing), 0];
    const sites = columns * rows;
    groups.push({
      count: sites * quarks.length * copies,
      cluster: { size: quarks.length * copies, radius: sig(r0 / Math.SQRT2) },
      shape: { type: 'grid', spacing, columns, rows, center },
      ...typed(quarks),
    });
    const margin = Math.max(0, 2 * r1 - spacing);
    groups.push({
      count: sites * electronsPerPixel,
      shape: { type: 'box', size: [sig(columns * spacing + margin), sig(rows * spacing + margin), 0], center },
      ...typed([electron]),
    });
  }
  return groups;
}

const RED = [1, 0, 0];
const GREEN = [0, 1, 0];
const BLUE = [0, 0, 1];

/** v1's proton + neutron quark list: uud and udd with one of each color per nucleon. */
function nucleonQuarks(u, n) {
  return [
    type(u.up, sig((2 / 3) * u.e), n, RED),
    type(u.up, sig((2 / 3) * u.e), n, GREEN),
    type(u.down, sig((-1 / 3) * u.e), n, BLUE),
    type(u.up, sig((2 / 3) * u.e), n, BLUE),
    type(u.down, sig((-1 / 3) * u.e), n, GREEN),
    type(u.down, sig((-1 / 3) * u.e), n, RED),
  ];
}

function scenario(file, meta) {
  return { file, json: { format: 'particle.js-v2/scenario', version: 1, ...meta } };
}

function welcome() {
  // forceMap.js welcome(): the nuclear range of 3 fm is 1e4 length units.
  const M = (10 / 3) * 1e18;
  const S = 5e26;
  const KG = (10 / 9.1093837015) * 1e29;
  const C = (1 / 1.602176634) * 1e21;
  const u = units({ M, KG, S, C });
  const strong = sig(10e3 * KG * M * S ** -2);
  const nq = 10;
  const quarks = nucleonQuarks(u, nq);
  const electron = type(u.electron, -u.e, sig(-nq / 6));
  const range = u.range;
  const { rects, count } = textRectangles(['Welcome', 'to', 'particle.js !'], 2, 20);
  return scenario('60-welcome.json', {
    id: 'welcome',
    name: 'Welcome',
    folder: 'Force Map',
    description:
      `v1's opening scene: ${count} pixels of text, each a nucleus of six colored quarks (uud + udd) with two electrons, ` +
      "held by v1's force map 2 (Yukawa pull minus a linear push) and its constant color force inside 3 fm. " +
      "v1 damped velocities by exp(-c·dt/m); the drag here is c divided by the mean quark mass. v1's random force noise and the text font are not reproduced; gravity (G ≈ 9e-38) is negligible and omitted.",
    seed: 1,
    view: { cameraDistance: 800000, particleRadius: 600, colorMode: 'charge' },
    settings: { timeStep: 1, mode2D: true, maxSpeed: sig(299792458 * (M / S) * 100), friction: sig(1e-6 / ((u.up + u.down) / 2)) },
    forces: [
      nuclearForce('Nuclear (v1 force map 2)', FORCE_MAP_2, range, strong, { a: 1, b: 0.1, c: 1 }),
      { name: 'Color (v1)', mode: 'force', range: 'short', cutoff: range, expression: V1_COLOR, params: [{ name: 'k', value: strong }] },
      coulomb(u.coulomb, 1),
    ],
    groups: textGroups(rects, range, 2, quarks, 1, electron, 2, 0.05 * range, (2 / 3) * range),
  });
}

function planetoidFormation() {
  // record.js planetoidFormation(): v1 replaced the SI constants by G = 0.1, k = 1e-4, nuclear 3.
  const M = 1e18;
  const KG = 1e30;
  const S = 0.25e27;
  const C = (1 / 1.602176634) * 1e21;
  const u = units({ M, KG, S, C });
  const quarks = nucleonQuarks(u, 1);
  const electron = type(u.electron, -u.e, -1);
  const range = u.range;
  const { rects, count } = textRectangles(['MICROSCALE', 'PLANET', 'FORMATION'], 1, 10);
  return scenario('85-planetoid-formation.json', {
    id: 'planetoid-formation',
    name: 'Planetoid Formation',
    folder: 'Record',
    description:
      `v1's recording scene (commented out in v1): ${count} text pixels, each a deuteron-like pair of nucleons (12 quarks) with four electrons, ` +
      "under v1's step force map (pull inside half the 3 fm range, push outside), 1/d Coulomb and strong 1/d gravity that collapses " +
      "the text into planetoids. v1 damped velocities by exp(-c·dt/m); the drag here is c divided by the mean quark mass (8). " +
      "Initial state of v1's script, which later lowers the drag and raises gravity up to 16-fold.",
    seed: 1,
    view: { cameraDistance: 140000, particleRadius: 300, colorMode: 'charge' },
    settings: { timeStep: 1, mode2D: true, friction: 0.125 },
    forces: [
      nuclearForce('Nuclear (v1 force map 1)', FORCE_MAP_1, range, 3, {}),
      coulomb1(0.0001, 1),
      {
        name: 'Gravity (v1 1/d)',
        mode: 'force',
        range: 'long',
        softening: 10,
        expression: '-G * m_i * m_j / r',
        params: [{ name: 'G', value: 0.1 }],
      },
    ],
    groups: textGroups(rects, sig((2 / 3) * range), 2, quarks, 2, electron, 4, 0.05 * range, (1 / 3) * range),
  });
}

/** Units shared by the quark-model and EPN scenes: M = 1e18 (attometer), KG = 1e30, S = 1e26. */
const QUARK_UNITS = units({ M: 1e18, KG: 1e30, S: 1e26, C: (1 / 1.602176634) * 1e21 });

function quarkAtom(center, z, sq, snq, r0, r1, v) {
  const u = QUARK_UNITS;
  const nucleus = [type(u.up, sig((2 / 3) * u.e * sq), snq), type(u.down, sig((-1 / 3) * u.e * sq), snq)];
  return atom(center, nucleus, 3 * z, type(u.electron, -u.e * sq, -snq), z, r0, r1, v);
}

function air() {
  const u = QUARK_UNITS;
  const range = u.range;
  const r2 = 0.493 * range;
  const elements = [
    { r: 2 * 78.084, n: 7, name: 'N' },
    { r: 2 * 20.946, n: 8, name: 'O' },
    { r: 0.934, n: 18, name: 'Ar' },
    { r: 0.0417, n: 6, name: 'C (CO2)' },
    { r: 2 * 0.0417, n: 8, name: 'O (CO2)' },
    { r: 0.001818, n: 10, name: 'Ne' },
    { r: 0.000524, n: 2, name: 'He' },
    { r: 0.0417, n: 6, name: 'C (CH4)' },
    { r: 4 * 0.0417, n: 1, name: 'H (CH4)' },
    { r: 0.000114, n: 36, name: 'Kr' },
  ];
  const random = rng(11);
  const g = gridSize(7 * 8);
  const tally = {};
  const groups = lattice(g, g, 3 * r2).flatMap((center) => {
    const e = pickElement(elements, random);
    tally[e.name] = (tally[e.name] ?? 0) + 1;
    const snq = random() >= 0.01 ? 1 : -1;
    return quarkAtom(center, e.n, 1, snq, 0.05 * range, 0.5 * range, 0);
  });
  const mix = Object.entries(tally).map(([name, n]) => `${n} ${name}`).join(', ');
  return scenario('65-air.json', {
    id: 'air',
    name: 'Air',
    folder: 'Quark Model',
    description:
      `v1's quark-model air: a ${g}×${g} lattice of atoms by abundance (${mix}); each atom is 3Z up + 3Z down quarks ` +
      "and Z electrons, bound by v1's powAXv3 nuclear force (pull below 0.22 of the 3 fm range) and Coulomb; about 1% of nuclei " +
      'carry negative nuclear charge as in v1. Gravity (G ≈ 7e-39) is negligible and omitted.',
    seed: 1,
    view: { cameraDistance: 45000, particleRadius: 120, colorMode: 'charge' },
    settings: { timeStep: 1, mode2D: true, boundary: 'box', boundarySize: 20 * range, restitution: 0.9 },
    forces: [powAXv3(range, u.nuclear), coulomb(u.coulomb, 6)],
    groups,
  });
}

function water2() {
  const u = QUARK_UNITS;
  const range = u.range;
  const r0 = 0.01 * range;
  const r1 = 0.5 * range;
  const r2 = 0.95 * range;
  const random = rng(12);
  const g = gridSize(2 * (3 + 1) + 8 * (2 * 3 + 1));
  const hydrogen = [type(u.up, sig((2 / 3) * u.e), 1), type(u.up, sig((2 / 3) * u.e), 1), type(u.down, sig((-1 / 3) * u.e), 1)];
  const electron = type(u.electron, -u.e, -1);
  const c30 = Math.cos(Math.PI / 6);
  const groups = lattice(g, g, 4 * r2).flatMap((center) => {
    const side = random() < 0.5 ? -1 : 1;
    const h = (sx) => [sig(center[0] + sx * r2 * c30), sig(center[1] + side * r2 * 0.5), 0];
    return [
      ...quarkAtom(center, 8, 1, 1, r0, r1, 0),
      ...atom(h(1), hydrogen, 1, electron, 1, r0, r1, 0),
      ...atom(h(-1), hydrogen, 1, electron, 1, r0, r1, 0),
    ];
  });
  return scenario('66-water-2.json', {
    id: 'water-2',
    name: 'Water 2',
    folder: 'Quark Model',
    description:
      `v1's quark-model water: a ${g}×${g} lattice of H2O molecules, oxygen as 24 up + 24 down quarks with 8 electrons and ` +
      "each hydrogen as a uud triplet 2.85 fm away at ±30° with its electron around it, bound by v1's powAXv3 nuclear force and Coulomb. " +
      'Gravity (G ≈ 7e-39) is negligible and omitted.',
    seed: 1,
    view: { cameraDistance: 15000, particleRadius: 120, colorMode: 'charge' },
    settings: { timeStep: 1, mode2D: true, boundary: 'box', boundarySize: 100 * range, restitution: 0.9 },
    forces: [powAXv3(range, u.nuclear), coulomb(u.coulomb, 6)],
    groups,
  });
}

function essentialElements() {
  const u = QUARK_UNITS;
  const range = u.range;
  const elements = [
    { r: 100, n: 1, name: 'H' },
    { r: 30, n: 6, name: 'C' },
    { r: 30, n: 7, name: 'N' },
    { r: 10, n: 8, name: 'O' },
    ...[
      ['Mg', 12],
      ['P', 15],
      ['S', 16],
      ['Fe', 26],
      ['Cu', 29],
      ['Zn', 30],
    ].map(([name, n]) => ({ r: 1, n, name })),
  ];
  const avgZ = elements.reduce((s, e) => s + e.r * e.n, 0) / elements.reduce((s, e) => s + e.r, 0);
  const g = gridSize(7 * Math.round(avgZ + 0.5));
  const half = g * range;
  const random = rng(13);
  const tally = {};
  let anti = 0;
  const groups = Array.from({ length: g * g }, () => {
    const s = random() <= 0.1 ? -1 : 1;
    if (s < 0) anti++;
    // Inset by the electron cloud radius so no atom starts partly outside the reflecting box.
    const center = [sig((2 * random() - 1) * (half - 0.5 * range)), sig((2 * random() - 1) * (half - 0.5 * range)), 0];
    const e = pickElement(elements, random);
    tally[e.name] = (tally[e.name] ?? 0) + 1;
    return quarkAtom(center, e.n, s, s, 0.05 * range, 0.5 * range, 1);
  }).flat();
  const mix = Object.entries(tally).map(([name, n]) => `${n} ${name}`).join(', ');
  return scenario('67-essential-elements.json', {
    id: 'essential-elements',
    name: 'Essential Elements',
    folder: 'Quark Model',
    description:
      `v1's quark-model mix of life's elements scattered at random (${mix}); ${anti} of them are antimatter ` +
      "(charges and nuclear charge flipped). Each atom is 3Z up + 3Z down quarks and Z electrons under v1's powAXv2 nuclear force and Coulomb. " +
      'Gravity (G ≈ 7e-39) is negligible and omitted.',
    seed: 1,
    view: { cameraDistance: 45000, particleRadius: 120, colorMode: 'charge' },
    settings: { timeStep: 1, mode2D: true, boundary: 'box', boundarySize: half, restitution: 0.9 },
    forces: [powAXv2(range, u.nuclear), coulomb(u.coulomb, 6)],
    groups,
  });
}

function periodicTable() {
  const u = QUARK_UNITS;
  const range = u.range;
  const r2 = 0.493 * range;
  const nucleus = [type(u.proton, u.e, 1), type(u.neutron, 0, 1)];
  const electron = type(u.electron, -u.e, sig(-1 / 3));
  const v = 1e3 * (1e18 / 1e26);
  const groups = lattice(8, 8, 6 * r2).flatMap((center, k) => atom(center, nucleus, k + 1, electron, k + 1, 0.05 * range, 0.5 * range, v));
  return scenario('70-periodic-table.json', {
    id: 'periodic-table',
    name: 'Periodic Table',
    folder: 'EPN Model',
    description:
      "v1's electron-proton-neutron model: elements Z = 1 to 64 on an 8×8 grid, each Z protons + Z neutrons with Z electrons, " +
      "bound by v1's powAXv3 nuclear force (nuclear charge 1 for nucleons, -1/3 for electrons) and Coulomb. " +
      'Gravity (G ≈ 7e-39) is negligible and omitted.',
    seed: 1,
    view: { cameraDistance: 60000, particleRadius: 120, colorMode: 'charge' },
    settings: { timeStep: sig(1 / 3), mode2D: true, boundary: 'box', boundarySize: 40 * range, restitution: 0.9 },
    forces: [powAXv3(range, u.nuclear), coulomb(u.coulomb, 6)],
    groups,
  });
}

/** Top level pretty-printed, one particle group per line. */
function format(json) {
  const { groups, ...rest } = json;
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, '');
  const body = groups.map((g) => `    ${JSON.stringify(g)}`).join(',\n');
  return `${head},\n  "groups": [\n${body}\n  ]\n}\n`;
}

for (const { file, json } of [welcome(), air(), water2(), essentialElements(), periodicTable(), planetoidFormation()]) {
  const total = json.groups.reduce((s, g) => s + g.count, 0);
  if (total > 16384) throw new Error(`${file}: ${total} particles exceed the default capacity 16384`);
  // Per-site groups: their counts are the atoms themselves, so the particle-count setting must not rescale them.
  json.groups = json.groups.map(({ count, ...g }) => ({ count, scale: false, ...g }));
  await writeFile(LIBRARY + file, format(json));
  console.log(`${file}: ${json.groups.length} groups, ${total} particles`);
}
