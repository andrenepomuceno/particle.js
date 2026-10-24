import { GLSL_POWER_HELPERS } from '../expr/glsl';
import { collectVariables } from '../expr/ast';
import { forceToGlsl, forceUniformName, type CompiledForce } from '../forces/compile';

export const BOUNDARY_CODE = { none: 0, sphere: 1, box: 2 } as const;

const COMMON_UNIFORMS = /* glsl */ `
uniform sampler2D uAttributes;
uniform sampler2D uColor;
uniform int uCount;
uniform float uTimeStep;
uniform float uTime;
uniform float uFriction;
uniform float uMaxSpeed;
uniform int uBoundary;
uniform float uBoundarySize;
uniform float uRestitution;
uniform bool uMode2D;

#define KIND_FIXED 2.0
`;

function forceFunction(force: CompiledForce, index: number): string {
  const uniforms = ['cutoff', 'soft2', ...force.definition.params.map((p) => p.name)]
    .map((name) => `uniform float ${forceUniformName(index, name)};`)
    .join('\n');
  return `${uniforms}
float force${index}(float r, vec4 attr1, vec4 attr2, vec4 color1, vec4 color2, float tau1, float tau2) {
  return ${forceToGlsl(force, index)};
}`;
}

function forceAccumulation(force: CompiledForce, index: number): string {
  const call = `force${index}(sqrt(r2 + ${forceUniformName(index, 'soft2')}), attr1, attr2, color1, color2, tau1, tau2)`;
  if (force.definition.range === 'short') {
    return `if (dist < ${forceUniformName(index, 'cutoff')}) magnitude += ${call};`;
  }
  return `magnitude += ${call};`;
}

export function generateVelocityShader(forces: readonly CompiledForce[]): string {
  const needsTau2 = forces.some((f) => collectVariables(f.magnitude).has('t_j'));
  const fetchTau2 = needsTau2 ? 'texelFetch(textureVelocity, coord2, 0).w' : '0.0';
  return `${COMMON_UNIFORMS}
${GLSL_POWER_HELPERS}
${forces.map(forceFunction).join('\n')}

void main() {
  ivec2 coord1 = ivec2(gl_FragCoord.xy);
  int width = TEXTURE_WIDTH;
  int index1 = coord1.y * width + coord1.x;
  vec4 velocityTexel = texelFetch(textureVelocity, coord1, 0);
  if (index1 >= uCount) {
    gl_FragColor = velocityTexel;
    return;
  }
  vec4 positionTexel = texelFetch(texturePosition, coord1, 0);
  vec3 pos1 = positionTexel.xyz;
  vec3 vel1 = velocityTexel.xyz;
  float tau1 = velocityTexel.w;
  vec4 attr1 = texelFetch(uAttributes, coord1, 0);
  vec4 color1 = texelFetch(uColor, coord1, 0);

  if (positionTexel.w == KIND_FIXED) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, tau1 + uTimeStep);
    return;
  }

  vec3 force = vec3(0.0);
  for (int index2 = 0; index2 < uCount; index2++) {
    if (index2 == index1) continue;
    ivec2 coord2 = ivec2(index2 % width, index2 / width);
    vec3 delta = pos1 - texelFetch(texturePosition, coord2, 0).xyz;
    float r2 = dot(delta, delta);
    if (r2 == 0.0) continue;
    float dist = sqrt(r2);
    vec4 attr2 = texelFetch(uAttributes, coord2, 0);
    vec4 color2 = texelFetch(uColor, coord2, 0);
    float tau2 = ${fetchTau2};
    float magnitude = 0.0;
    ${forces.map(forceAccumulation).join('\n    ')}
    force += magnitude * (delta / dist);
  }

  vel1 += uTimeStep * force / attr1.x;
  if (uFriction > 0.0) vel1 *= exp(-uFriction * uTimeStep);
  if (uMode2D) vel1.z = 0.0;
  float speed = length(vel1);
  if (uMaxSpeed > 0.0 && speed > uMaxSpeed) vel1 *= uMaxSpeed / speed;

  vec3 next = pos1 + uTimeStep * vel1;
  if (uBoundary == ${BOUNDARY_CODE.sphere}) {
    float len = length(next);
    if (len > uBoundarySize) {
      vec3 normal = next / len;
      float outward = dot(vel1, normal);
      if (outward > 0.0) vel1 -= (1.0 + uRestitution) * outward * normal;
    }
  } else if (uBoundary == ${BOUNDARY_CODE.box}) {
    for (int axis = 0; axis < 3; axis++) {
      if (abs(next[axis]) > uBoundarySize && next[axis] * vel1[axis] > 0.0) {
        vel1[axis] = -uRestitution * vel1[axis];
      }
    }
  }

  gl_FragColor = vec4(vel1, tau1 + uTimeStep);
}
`;
}

export const POSITION_SHADER = `${COMMON_UNIFORMS}
void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int index = coord.y * TEXTURE_WIDTH + coord.x;
  vec4 positionTexel = texelFetch(texturePosition, coord, 0);
  if (index >= uCount || positionTexel.w == KIND_FIXED) {
    gl_FragColor = positionTexel;
    return;
  }
  vec3 pos = positionTexel.xyz + uTimeStep * texelFetch(textureVelocity, coord, 0).xyz;
  if (uMode2D) pos.z = 0.0;
  if (uBoundary == ${BOUNDARY_CODE.sphere}) {
    float len = length(pos);
    if (len > uBoundarySize) pos *= uBoundarySize / len;
  } else if (uBoundary == ${BOUNDARY_CODE.box}) {
    pos = clamp(pos, vec3(-uBoundarySize), vec3(uBoundarySize));
  }
  gl_FragColor = vec4(pos, positionTexel.w);
}
`;
