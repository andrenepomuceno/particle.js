import { describe, expect, it } from 'vitest';
import { compileForce, forceScope, forceToGlsl, ForceValidationError, type PairScope } from '../src/engine/forces/compile';
import { makeForce } from './helpers';
import { generateFieldShader, generateVelocityShader, POSITION_SHADER } from '../src/engine/shaders/computeShaders';


const pair: PairScope = {
  r: 2, m_i: 1, m_j: 1, q_i: 1, q_j: 3, q2_i: 2, q2_j: -1, i3_i: 0.5, i3_j: -0.5, p_i: 1, p_j: -1, n_i: 2, n_j: 3,
  sx_i: 1, sy_i: 0, sz_i: 0.5, sx_j: 0, sy_j: 2, sz_j: -0.5, ux: 0.6, uy: 0.8, uz: 0,
  cr_i: 1, cg_i: 0, cb_i: 0, cr_j: 0.5, cg_j: 1, cb_j: 0, t_i: 4, t_j: 5, time: 9,
};

describe('compileForce', () => {
  it('compiles a force expression', () => {
    const force = compileForce(makeForce());
    expect(force.evaluate(forceScope(force, pair))).toBe(1.5);
  });

  it('turns a potential into F = -dV/dr', () => {
    const force = compileForce(makeForce({ mode: 'potential', expression: 'k * q_i * q_j / r' }));
    expect(force.evaluate(forceScope(force, pair))).toBeCloseTo(1.5, 12);
  });

  it('expands x = r / cutoff before differentiating a short-range potential', () => {
    const force = compileForce(makeForce({ mode: 'potential', range: 'short', cutoff: 4, expression: 'k * x^2', params: [{ name: 'k', value: 1 }] }));
    expect(force.evaluate(forceScope(force, pair))).toBeCloseTo(-2 * 2 / 16, 12);
  });

  it('exposes nuclear charge', () => {
    const force = compileForce(makeForce({ expression: 'n_i * n_j', params: [] }));
    expect(force.evaluate(forceScope(force, pair))).toBe(6);
    expect(forceToGlsl(force, 0)).toBe('(color1.w * color2.w)');
  });

  it('exposes color, parity and clocks', () => {
    const force = compileForce(makeForce({ expression: 'c_dot + p_i * p_j + t_i + t_j + time', params: [] }));
    expect(force.evaluate(forceScope(force, pair))).toBeCloseTo(0 - 1 + 4 + 5 + 9, 12);
  });

  it('exposes the spin vectors, their alignment and their projections on r̂', () => {
    const value = (expression: string) => {
      const force = compileForce(makeForce({ expression, params: [] }));
      return force.evaluate(forceScope(force, pair));
    };
    expect(value('s_dot')).toBeCloseTo(1 * 0 + 0 * 2 + 0.5 * -0.5, 12);
    expect(value('si_r')).toBeCloseTo(1 * 0.6, 12);
    expect(value('sj_r')).toBeCloseTo(2 * 0.8, 12);
    expect(value('sx_i + sy_j + sz_i')).toBeCloseTo(1 + 2 + 0.5, 12);
  });

  it('exposes the 2D charge and isospin', () => {
    const force = compileForce(makeForce({ expression: 'q_dot + 10 * i3_i * i3_j + 100 * q2_i', params: [] }));
    expect(force.evaluate(forceScope(force, pair))).toBeCloseTo(1 * 3 + 2 * -1 - 2.5 + 200, 12);
    expect(forceToGlsl(compileForce(makeForce({ expression: 'q_dot * i3_j', params: [] })), 0)).toBe('(dot(attr1.yz, attr2.yz) * spin2.w)');
  });

  it('rejects direction-dependent spin terms in potential mode', () => {
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'si_r * sj_r / r^3', params: [] })))
      .toThrow(/si_r, sj_r depend on the pair's direction.*force mode/);
  });

  it('rejects the old scalar spin variables with the list of new ones', () => {
    expect(() => compileForce(makeForce({ expression: 's_i * s_j', params: [] }))).toThrow(/unknown variable 's_i'.*s_dot/);
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

describe('GLSL generation', () => {
  it('binds parameters, attributes and cutoff to uniforms', () => {
    const force = compileForce(makeForce({ range: 'short', cutoff: 2, expression: 'k * m_i * cr_j * x', params: [{ name: 'k', value: 1 }] }));
    expect(forceToGlsl(force, 3)).toBe('(((uF3_k * attr1.x) * color2.x) * (r / uF3_cutoff))');
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
    expect(shader).toContain('totalForce(-1, pos, vec3(0.0), uProbeAttributes, uProbeColor, uProbeSpin, 0.0, 0.0)');
  });

  it('skips the clock fetch when no force reads t_j', () => {
    expect(generateVelocityShader([compileForce(makeForce())])).toContain('float tau2 = 0.0;');
    expect(POSITION_SHADER).toContain('void main()');
  });
});
