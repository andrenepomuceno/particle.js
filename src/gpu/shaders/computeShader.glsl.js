import { NuclearPotentialType } from "../../physics";

function define(define, value) {
    if (value) {
        return "#define " + define + " 1\n";
    }
    else {
        return "#define " + define + " 0\n";
    }
}

export function generateComputeVelocity(nuclearPotential = "default", useDistance1 = false, boxBoundary = false, enableBoundary = true) {
    let config = "";
    config += '#define BOUNDARY_TOLERANCE 1.01\n';

    config += define("ENABLE_BOUNDARY", enableBoundary);
    config += define("USE_BOX_BOUNDARY", boxBoundary);

    config += define("USE_DISTANCE1", useDistance1);

    config += define("USE_HOOKS_LAW", nuclearPotential === NuclearPotentialType.hooksLaw);
    config += define("USE_POTENTIAL0", nuclearPotential === NuclearPotentialType.potential_powXR);
    config += define("USE_POTENTIAL1", nuclearPotential === NuclearPotentialType.potential_exp);
    config += define("USE_POTENTIAL2", nuclearPotential === NuclearPotentialType.potential_powAX);
    config += define("USE_POTENTIAL3", nuclearPotential === NuclearPotentialType.potential_powAXv2);
    config += define("USE_POTENTIAL4", nuclearPotential === NuclearPotentialType.potential_powAXv3);

    let shader = config + computeVelocityV2;
    return shader;
}

export function generateComputePosition(enableBoundary = true, boxBoundary = false) {
    let config = "";
    config += '#define BOUNDARY_TOLERANCE 1.01\n';

    config += define("ENABLE_BOUNDARY", enableBoundary);
    config += define("USE_BOX_BOUNDARY", boxBoundary);

    let shader = config + computePosition;
    return shader;
}

const computeVelocityV2 = /* glsl */ `
#include <common>
precision highp float;

uniform float minDistance2;
uniform float massConstant;
uniform float chargeConstant;
uniform float nuclearForceConstant;
uniform float nuclearForceRange;
uniform float nuclearForceRange2;
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

float sdBox( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdSphere( vec3 p, float s )
{
    return length(p)-s;
}

void main() {
    vec2 uv1 = gl_FragCoord.xy / resolution.xy;
    vec4 tPos1 = texture2D(texturePosition, uv1);
    float type1 = tPos1.w;
    if (type1 == UNDEFINED) return;

    vec3 pos1 = tPos1.xyz;
    vec4 props1 = texture2D(textureProperties, uv1);
    float id1 = props1.x;
    float m1 = props1.y;
    vec4 tVel1 = texture2D(textureVelocity, uv1);
    vec3 vel1 = tVel1.xyz;
    float collisions = tVel1.w;

    vec4 consts = vec4(
        0,
        massConstant, 
        -chargeConstant,
        nuclearForceConstant
    );

    vec3 rForce = vec3(0.0);
    for (float texY = 0.0; texY < height; texY++) {
        for (float texX = 0.0; texX < width; texX++) {
            vec2 uv2 = vec2(texX + 0.5, texY + 0.5) / resolution.xy;
            vec4 tPos2 = texture2D(texturePosition, uv2);
            float type2 = tPos2.w;
            if (type2 != DEFAULT && type2 != FIXED) continue;

            vec4 props2 = texture2D(textureProperties, uv2);
            float id2 = props2.x;
            if (id1 == id2) {
                continue;
            }

            vec3 pos2 = tPos2.xyz;            
            vec3 dPos = pos2 - pos1;
            float distance2 = dot(dPos, dPos);
            
            // check collision
            if (distance2 <= minDistance2) {
                if (type1 != PROBE) {
                    float m2 = props2.y;
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

            #if USE_DISTANCE1
                float distance1 = sqrt(distance2);
            #endif
            float x = 0.0;
            if (distance2 <= nuclearForceRange2) {
                #if !USE_DISTANCE1
                    float distance1 = sqrt(distance2);
                #endif
                #if USE_HOOKS_LAW
                    x = -(2.0 * distance1 - nuclearForceRange)/nuclearForceRange;
                #else
                    x = distance1/nuclearForceRange;
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
                    #elif USE_POTENTIAL3 // "powAXv2"
                        x = sin(6.64541 * (1.0 - pow(0.054507, x)));
                    #elif USE_POTENTIAL4 // "powAXv3"
                        x = sin(6.64541 * (1.0 - pow(0.054507, x))) * exp(-3.0 * x);
                    #else
                        x = sin(2.0 * PI * x);
                    #endif
                #endif
            }

            #if !USE_DISTANCE1
                float d12 = 1.0/distance2;
            #else
                float d12 = 1.0/distance1;
            #endif
            vec4 props = props1 * props2;
            vec4 pot = vec4(0, d12, d12, x);
            vec4 result = consts * props * pot;
            float force = result.y + result.z + result.w;
            rForce += forceConstant * force * normalize(dPos);
        }
    }

    if (type1 == DEFAULT) {
        if (m1 != 0.0) {
            vel1 += rForce / abs(m1);
        } else {
            vel1 += rForce;
        }
        
        #if ENABLE_BOUNDARY
            // check boundary colision
            vec3 nextPos = pos1 + vel1;
            #if !USE_BOX_BOUNDARY
                if (sdSphere(nextPos, boundaryDistance) >= 0.0) {
                    vel1 = boundaryDamping * reflect(vel1, normalize(-pos1));

                    if (sdSphere(nextPos, BOUNDARY_TOLERANCE * boundaryDistance) >= 0.0) {
                        vel1 = vec3(0.0);
                    }
                }
            #else
                float x = abs(nextPos.x);
                if (x >= boundaryDistance) {
                    vel1.x = -boundaryDamping * vel1.x;
                    if (x >= BOUNDARY_TOLERANCE * boundaryDistance) {
                        vel1 = vec3(0.0);
                    }
                }

                float y = abs(nextPos.y);
                if (y >= boundaryDistance) {
                    vel1.y = -boundaryDamping * vel1.y;
                    if (y >= BOUNDARY_TOLERANCE * boundaryDistance) {
                        vel1 = vec3(0.0);
                    }
                }

                float z = abs(nextPos.z);
                if (abs(nextPos.z) >= boundaryDistance) {
                    vel1.z = -boundaryDamping * vel1.z;
                    if (z >= BOUNDARY_TOLERANCE * boundaryDistance) {
                        vel1 = vec3(0.0);
                    }
                }
            #endif
        #endif
    } else if (type1 == PROBE) {
        vel1 = rForce;
    }

    gl_FragColor = vec4(vel1, collisions);
}
`;

const computePosition = /* glsl */ `
precision highp float;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

uniform float boundaryDistance;

float sdBox( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdSphere( vec3 p, float s )
{
    return length(p)-s;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 tPos = texture2D( texturePosition, uv );
    vec3 pos = tPos.xyz;
    float type = tPos.w;

    if (type == DEFAULT) {
        vec4 tVel = texture2D( textureVelocity, uv );
        vec3 vel = tVel.xyz;
        
        pos += vel;

        #if ENABLE_BOUNDARY
            #if !USE_BOX_BOUNDARY
                // check out of boundary
                if (sdSphere(pos, BOUNDARY_TOLERANCE * boundaryDistance) >= 0.0) {
                    pos = normalize(pos);
                }
            #else
                if (abs(pos.x) > BOUNDARY_TOLERANCE * boundaryDistance
                || abs(pos.y) > BOUNDARY_TOLERANCE * boundaryDistance
                || abs(pos.z) > BOUNDARY_TOLERANCE * boundaryDistance) {
                    pos = normalize(pos);
                }
            #endif
        #endif
    }

    gl_FragColor = vec4(pos, type);
}
`;