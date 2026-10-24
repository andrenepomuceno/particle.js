import { describe, expect, it } from 'vitest';
import { compileForce, forceScope, ForceValidationError, type PairScope } from '../src/engine/forces/compile';
import { makeForce } from './helpers';
import { evaluate } from '../src/engine/expr/evaluate';
import { parseExpr } from '../src/engine/expr/parser';
import { generateFieldShader, generateVelocityShader, POSITION_SHADER } from '../src/engine/shaders/computeShaders';


const pair: PairScope = {
  r: 2, m_i: 1, m_j: 1, q_i: 1, q_j: 3, q2_i: 2, q2_j: -1, i3_i: 0.5, i3_j: -0.5, p_i: 1, p_j: -1, n_i: 2, n_j: 3,
  sx_i: 1, sy_i: 0, sz_i: 0.5, sx_j: 0, sy_j: 2, sz_j: -0.5, ux: 0.6, uy: 0.8, uz: 0,
  cr_i: 1, cg_i: 0, cb_i: 0, cr_j: 0.5, cg_j: 1, cb_j: 0, t_i: 4, t_j: 5, time: 9,
  vx_i: 1, vy_i: -2, vz_i: 0.5, vx_j: 0, vy_j: 3, vz_j: -1,
};

describe('compileForce', () => {
  it('compiles a force expression', () => {
    const force = compileForce(makeForce());
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBe(1.5);
  });

  it('turns a potential into F = -dV/dr', () => {
    const force = compileForce(makeForce({ mode: 'potential', expression: 'k * q_i * q_j / r' }));
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBeCloseTo(1.5, 12);
  });

  it('expands x = r / cutoff before differentiating a short-range potential', () => {
    const force = compileForce(makeForce({ mode: 'potential', range: 'short', cutoff: 4, expression: 'k * x^2', params: [{ name: 'k', value: 1 }] }));
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBeCloseTo(-2 * 2 / 16, 12);
  });

  it('exposes nuclear charge', () => {
    const force = compileForce(makeForce({ expression: 'n_i * n_j', params: [] }));
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBe(6);
    expect(body(force)).toContain('color1.w * color2.w');
  });

  it('exposes color, parity and clocks', () => {
    const force = compileForce(makeForce({ expression: 'c_dot + p_i * p_j + t_i + t_j + time', params: [] }));
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBeCloseTo(0 - 1 + 4 + 5 + 9, 12);
  });

  it('exposes the spin vectors, their alignment and their projections on r̂', () => {
    const value = (expression: string) => {
      const force = compileForce(makeForce({ expression, params: [] }));
      return force.evaluate(forceScope(force, pair, pair.r));
    };
    expect(value('s_dot')).toBeCloseTo(1 * 0 + 0 * 2 + 0.5 * -0.5, 12);
    expect(value('si_r')).toBeCloseTo(1 * 0.6, 12);
    expect(value('sj_r')).toBeCloseTo(2 * 0.8, 12);
    expect(value('sx_i + sy_j + sz_i')).toBeCloseTo(1 + 2 + 0.5, 12);
  });

  it('exposes the 2D charge and isospin', () => {
    const force = compileForce(makeForce({ expression: 'q_dot + 10 * i3_i * i3_j + 100 * q2_i', params: [] }));
    expect(force.evaluate(forceScope(force, pair, pair.r))).toBeCloseTo(1 * 3 + 2 * -1 - 2.5 + 200, 12);
    expect(body(compileForce(makeForce({ expression: 'q_dot * i3_j', params: [] })))).toMatch(/dot\(attr1\.yz, attr2\.yz\) \* spin2\.w|spin2\.w \* dot\(attr1\.yz, attr2\.yz\)/);
  });

  it('classifies forces: central, gradient of a directional potential, vector', () => {
    const kind = (mode: 'force' | 'potential', expression: string) => compileForce(makeForce({ mode, expression, params: [] })).kind;
    expect(kind('potential', 'si_r * sj_r / r^3')).toBe('gradient');
    expect(kind('potential', 's_dot / r^3')).toBe('central');
    expect(kind('force', 'dx * q_i / r^3')).toBe('central');
    expect(kind('force', 'q_i * cross(v_i, s_j) / r^3')).toBe('vector');
    expect(kind('force', '-v_dot / r^2')).toBe('vector');
    expect(kind('force', 'vv_dot * q_i / r^2')).toBe('vector');
  });

  it('reports vector misuse with a hint (s_i and s_j are spin vectors now)', () => {
    expect(() => compileForce(makeForce({ expression: 's_i * s_j', params: [] }))).toThrow(/cannot multiply two vectors with \*; use dot\(a, b\) or cross\(a, b\)/);
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'cross(s_i, d) * r', params: [] }))).toThrow(/a potential must be a number/);
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'v_rel / r', params: [] }))).toThrow(/v_rel depend on velocity.*force mode/);
    expect(() => compileForce(makeForce({ expression: 'sin(d)', params: [] }))).toThrow(/sin\(\) takes numbers, got a vector/);
  });

  it.each([
    [{ expression: 'k * z' }, /unknown variable 'z'; declare it as a parameter/],
    [{ expression: 'x' }, /'x' \(only available for short-range forces\)/],
    [{ expression: '1 +' }, /unexpected 'end of expression'/],
    [{ range: 'short' as const, cutoff: 0 }, /cutoff must be a finite number > 0/],
    [{ softening: -1 }, /softening must be a finite number >= 0/],
    [{ params: [{ name: 'r', value: 1 }] }, /parameter name 'r' is reserved/],
    [{ params: [{ name: '1a', value: 1 }] }, /not a valid identifier/],
    [{ params: [{ name: 'k', value: 1 }, { name: 'k', value: 2 }] }, /declared twice/],
    [{ params: [{ name: 'k', value: NaN }] }, /parameter 'k' must be finite/],
    [{ params: [{ name: 'soft2', value: 1 }] }, /parameter name 'soft2' is reserved/],
    [{ params: [{ name: '_k', value: 1 }] }, /may not start with '_' or contain '__'/],
    [{ expression: 'r + log(0)', params: [] }, /non-finite constant \(-Infinity\)/],
    [{ mode: 'potential' as const, expression: 'log(0) + r^2', params: [] }, /non-finite constant \(-Infinity\)/],
  ])('rejects %j', (overrides, message) => {
    expect(() => compileForce(makeForce(overrides))).toThrow(ForceValidationError);
    expect(() => compileForce(makeForce(overrides))).toThrow(message);
  });

  it('collects every problem at once', () => {
    try {
      compileForce(makeForce({ softening: -1, expression: 'zz' }));
      expect.unreachable();
    } catch (error) {
      expect((error as ForceValidationError).problems).toHaveLength(2);
    }
  });
});

/** Body of the force's GLSL function (bindings only, not the signature). */
const body = (force: ReturnType<typeof compileForce>) => force.glsl('f', 'vec4 attr1', 0).split('\n').slice(1).join('\n');

describe('GLSL generation', () => {
  it('binds parameters, attributes and cutoff to uniforms in a function with the pair signature', () => {
    const force = compileForce(makeForce({ range: 'short', cutoff: 2, expression: 'k * m_i * cr_j * x', params: [{ name: 'k', value: 1 }] }));
    const glsl = force.glsl('force3', 'vec4 attr1', 3);
    expect(glsl.startsWith('float force3(float r, vec4 attr1) {')).toBe(true);
    for (const name of ['uF3_k', 'attr1.x', 'color2.x', 'uF3_cutoff']) expect(glsl).toContain(name);
    expect(glsl).not.toMatch(/\b(k|m_i|cr_j|cutoff)\b/);
  });

  it('keeps powers of negative bases defined (spow, never raw pow)', () => {
    const glsl = compileForce(makeForce({ expression: 'q_i^n / r', params: [{ name: 'n', value: 3 }] })).glsl('f', 'vec4 attr1', 0);
    expect(glsl).toContain('spow(attr1.y, uF0_n)');
    expect(glsl).not.toMatch(/(^|[^s])pow\(/);
  });

  it('emits the potential separately and refuses it for force-mode forces', () => {
    const lj = compileForce(makeForce({ mode: 'potential', expression: '4 * (r^-12 - r^-6)', params: [] }));
    expect(lj.glsl('potential0', 'vec4 attr1', 0, 'potential')).toMatch(/^float potential0\(float r, vec4 attr1\) \{/);
    const plain = compileForce(makeForce({ expression: 'k / r', params: [{ name: 'k', value: 1 }] }));
    expect(() => plain.glsl('p', 'vec4 attr1', 0, 'potential')).toThrow(/has no potential/);
  });

  it('keeps the sign of negative constants under powers', () => {
    const force = compileForce(makeForce({ expression: '(-2)^n / r + (1 - 3)^n', params: [{ name: 'n', value: 2 }] }));
    expect(force.evaluate(forceScope(force, pair, 2))).toBe(2 + 4);
  });

  it('rejects constants outside float32 at compile time', () => {
    for (const expression of ['1e39 * r', '1e-50 * r']) {
      expect(() => compileForce(makeForce({ expression, params: [] })), expression).toThrow(/outside float32 range/);
    }
    expect(() => compileForce(makeForce({ expression: '0 * r + 1e-30 * r', params: [] }))).not.toThrow();
  });

  it('accepts large integer powers and reports library errors without generated-text offsets', () => {
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'r^-48 + r^40', params: [] }))).not.toThrow();
    expect(() => compileForce(makeForce({ expression: 'r^2000', params: [] }))).toThrow(/^(?!.*\(at \d+\)).*exponent/);
  });

  it('reads only what the differentiated force uses', () => {
    const force = compileForce(makeForce({ mode: 'potential', expression: 'q_i * q_j * t_j + k / r', params: [{ name: 'k', value: 1 }] }));
    expect([...force.reads].sort()).toEqual(['k', 'soft2']);
    expect([...force.potentialReads].sort()).toEqual(['k', 'q_i', 'q_j', 't_j']);
  });

  it('turns library name clashes into validation problems, used or not', () => {
    for (const name of ['mix', 'input', 'E']) {
      expect(() => compileForce(makeForce({ expression: 'r', params: [{ name, value: 1 }] })), name).toThrow(/reserved in generated shader code/);
    }
  });

  it('emits one function and accumulation per force', () => {
    const long = compileForce(makeForce());
    const short = compileForce(makeForce({ range: 'short', expression: 't_j', params: [] }));
    const shader = generateVelocityShader([long, short]);
    expect(shader).toContain('float force0(');
    expect(shader).toContain('float force1(');
    expect(shader).toContain('uniform float uF0_k;');
    expect(shader).toContain('if (dist < uF1_cutoff) magnitude += force1(');
    expect(shader).toContain('texelFetch(textureVelocity, coord2, 0).w');
  });

  it('evaluates the field with the shared totalForce for a test particle that matches no index', () => {
    const shader = generateFieldShader([compileForce(makeForce())]);
    expect(shader).toContain('float force0(');
    expect(shader.match(/vec3 totalForce\(/g)).toHaveLength(1);
    expect(shader).toContain('totalForce(-1, pos, vec3(0.0), uProbeAttributes, uProbeColor, uProbeSpin, 0.0, 0.0, jacobian)');
  });

  it('skips the clock fetch when no force reads t_j', () => {
    expect(generateVelocityShader([compileForce(makeForce())])).toContain('float tau2 = 0.0;');
    expect(POSITION_SHADER).toContain('void main()');
  });
});

describe('potential mode through shader-autodiff', () => {
  // The library differentiates; our own interpreter evaluates V, so a central difference is an
  // independent check of F = -dV/dr.
  it.each([
    '4 * k * ((s / r)^12 - (s / r)^6)',
    'exp(-r / 2) / r + tanh(r) + log(r) * sqrt(r)',
    'sin(r) * cos(r) + asin(r / 4) + atan(r) + sinh(r) - cosh(r)',
    'r ^ r + pow(r, 3) + abs(r - 2) + min(r, 1) + max(r, 1) + clamp(r, 0, 2)',
    'k * q_i * q_j / r + m_i * pi * e',
  ])('F = -dV/dr for V = %s', (expression) => {
    const force = compileForce(makeForce({ mode: 'potential', expression, params: [{ name: 'k', value: 3 }, { name: 's', value: 2 }] }));
    const V = parseExpr(expression);
    for (const r of [0.7, 1.3, 2.9]) {
      const scope = forceScope(force, pair, r);
      const h = 1e-6 * r;
      const numeric = -(evaluate(V, { ...scope, r: r + h }) - evaluate(V, { ...scope, r: r - h })) / (2 * h);
      expect(Math.abs(force.evaluate(scope) - numeric)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(numeric)));
      const v = evaluate(V, scope);
      expect(Math.abs(force.evaluatePotential!(scope) - v)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(v)));
    }
  });
});
