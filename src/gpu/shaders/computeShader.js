import { NuclearPotentialType } from "../../physics";

export function generateComputeVelocity(nuclearPotential = "default", useDistance1 = false, boxBoundary = false) {
    function define(define, value) {
        if (value) {
            return "#define " + define + " 1\n";
        } else {
            return "#define " + define + " 0\n";
        }
    }

    let config = "";
    config += define("USE_DISTANCE1", useDistance1);
    config += define("USE_BOX_BOUNDARY", boxBoundary);
    config += define("USE_HOOKS_LAW", nuclearPotential === NuclearPotentialType.hooksLaw);
    config += define("USE_POTENTIAL0", nuclearPotential === NuclearPotentialType.potential_powXR);
    config += define("USE_POTENTIAL1", nuclearPotential === NuclearPotentialType.potential_exp);
    config += define("USE_POTENTIAL2", nuclearPotential === NuclearPotentialType.potential_powAX);
    let shader = config + computeVelocity;
    return shader;
}

const computeVelocity = /* glsl */ `
#include <common>

precision highp float;

uniform float minDistance2;
uniform float massConstant;
uniform float chargeConstant;
uniform float nuclearChargeConstant;
uniform float nuclearChargeRange;
uniform float nuclearChargeRange2;
uniform float forceConstant;
uniform float boundaryDistance;
uniform float boundaryDamping;
uniform sampler2D textureProperties;

const float width = resolution.x;
const float height = resolution.y;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

void main() {
    vec2 uv1 = gl_FragCoord.xy / resolution.xy;

    vec4 tPos1 = texture2D(texturePosition, uv1);
    vec3 pos1 = tPos1.xyz;
    float type1 = tPos1.w;
    if (type1 == UNDEFINED) return;

    vec4 props1 = texture2D(textureProperties, uv1);
    float id1 = props1.x;
    float m1 = props1.y;
    vec4 tVel1 = texture2D(textureVelocity, uv1);
    vec3 vel1 = tVel1.xyz;
    float collisions = tVel1.w;

    vec3 rForce = vec3(0.0);
    for (float y = 0.0; y < height; y++) {
        for (float x = 0.0; x < width; x++) {
            vec2 uv2 = vec2(x + 0.5, y + 0.5) / resolution.xy;
            vec4 tPos2 = texture2D(texturePosition, uv2);
            vec3 pos2 = tPos2.xyz;
            float type2 = tPos2.w;
            if (type2 != DEFAULT && type2 != FIXED) continue;

            vec4 props2 = texture2D(textureProperties, uv2);
            float id2 = props2.x;
            if (id1 == id2) {
                continue;
            }

            float m2 = props2.y;
            
            vec3 dPos = pos2 - pos1;
            float distance2 = dot(dPos, dPos);
            
            // check collision
            if (distance2 <= minDistance2) {
                if (type1 != PROBE) {
                    vec3 vel2 = texture2D(textureVelocity, uv2).xyz;

                    float m = m1 + m2; // precision loss if m1 >> m2
                    if (m == 0.0) {
                        continue;
                    }

                    float s = 2.0 * m1 * m2 / m;
                    vec3 dVel = vel2 - vel1;
                    if (distance2 > 0.0) {
                        vec3 res = s * dot(dVel, dPos) * dPos;
                        res /= distance2;
                        rForce += res;
                    } else {
                        rForce += s * dVel;
                    }
                    
                    ++collisions;
                    continue;
                } else {
                    // for probe
                    distance2 = minDistance2;
                }
            }

            float force = 0.0;

            float q1 = props1.z;
            float q2 = props2.z;

            #if USE_DISTANCE1
                float distance1 = sqrt(distance2);
            #endif

            force += massConstant * m1 * m2;
            force += -chargeConstant * q1 * q2;

            #if !USE_DISTANCE1
                force /= distance2;
            #else
                force /= distance1;
            #endif

            if (distance2 <= nuclearChargeRange2) {
                float nq1 = props1.w;
                float nq2 = props2.w;

                #if !USE_DISTANCE1
                    float distance1 = sqrt(distance2);
                #endif

                #if USE_HOOKS_LAW
                    float x = (2.0 * distance1 - nuclearChargeRange)/nuclearChargeRange;
                    force += -nuclearChargeConstant * nq1 * nq2 * x;
                #else
                    float x = distance1/nuclearChargeRange;

                    #if USE_POTENTIAL0 // "powXR"
                        const float r = 1.0/3.0, log2 = log(2.0);
                        x = pow(x, -log2 / log(r));
                        x = sin(2.0 * PI * x);
                    #elif USE_POTENTIAL1 // "exp"
                        const float r1 = 1.0/3.0, r2 = 3.0, log2 = log(2.0);
                        x = -exp(-log2 * x * r2 / r1);
                        x = sin(2.0 * PI * x);
                    #elif USE_POTENTIAL2 // "powAX"
                        x = sin(7.22423 * (1.0 - pow(0.13026, x)));
                    #else
                        x = sin(2.0 * PI * x);
                    #endif

                    force += nuclearChargeConstant * nq1 * nq2 * x;
                #endif
            }

            rForce += forceConstant * force * normalize(dPos);
        }
    }

    if (type1 == DEFAULT) {
        if (m1 != 0.0) {
            vel1 += rForce / abs(m1);
        } else {
            vel1 += rForce;
        }
    
        // check boundary colision
        vec3 nextPos = pos1 + vel1;
        #if !USE_BOX_BOUNDARY
            if (length(nextPos) >= boundaryDistance) {
                if (length(vel1) < boundaryDistance) {
                    vel1 = boundaryDamping * reflect(vel1, normalize(pos1));
                } else {
                    // particle will go out of boundaries
                    vel1 = vec3(0.0);
                }
            }
        #else
            if (abs(nextPos.x) >= boundaryDistance) vel1.x = -boundaryDamping * vel1.x;
            if (abs(nextPos.y) >= boundaryDistance) vel1.y = -boundaryDamping * vel1.y;
            if (abs(nextPos.z) >= boundaryDistance) vel1.z = -boundaryDamping * vel1.z;
        #endif
    } else if (type1 == PROBE) {
        vel1 = rForce;
    }

    gl_FragColor = vec4(vel1, collisions);
}
`;

export const computePosition = /* glsl */ `
precision highp float;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 tPos = texture2D( texturePosition, uv );
    vec3 pos = tPos.xyz;
    float type = tPos.w;

    if (type == DEFAULT) {
        vec3 vel = texture2D( textureVelocity, uv ).xyz;
        pos += vel;
    }

    gl_FragColor = vec4(pos, type);
}
`;
