import { NuclearPotentialType } from "../../physics";

function define(define, value) {
    if (value) {
        return "#define " + define + " 1\n";
    }
    else {
        return "#define " + define + " 0\n";
    }
}

export function generateComputeVelocity(nuclearPotential = 'default', useDistance1 = false, boxBoundary = false, enableBoundary = true, 
enableColorCharge = true, enableFriction = false) {
    nuclearPotential = NuclearPotentialType.potential_forceMap1

    let config = '';
    config += '#define BOUNDARY_TOLERANCE 1.01\n';

    config += define("ENABLE_BOUNDARY", enableBoundary);
    config += define("USE_BOX_BOUNDARY", boxBoundary);
    config += define("USE_DISTANCE1", useDistance1);
    config += define("ENABLE_COLOR_CHARGE", enableColorCharge);
    config += define("ENABLE_FRICTION", enableFriction);

    config += define("USE_HOOKS_LAW", nuclearPotential === NuclearPotentialType.hooksLaw);
    config += define("USE_POTENTIAL0", nuclearPotential === NuclearPotentialType.potential_powXR);
    config += define("USE_POTENTIAL1", nuclearPotential === NuclearPotentialType.potential_exp);
    config += define("USE_POTENTIAL2", nuclearPotential === NuclearPotentialType.potential_powAX);
    config += define("USE_POTENTIAL3", nuclearPotential === NuclearPotentialType.potential_powAXv2);
    config += define("USE_POTENTIAL4", nuclearPotential === NuclearPotentialType.potential_powAXv3);
    config += define("USE_FMAP1", nuclearPotential === NuclearPotentialType.potential_forceMap1);

    let shader = config + computeVelocityV2;
    return shader;
}

export function generateComputePosition(enableBoundary = true, boxBoundary = false) {
    let config = '';
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
/*uniform float massConstant;
uniform float chargeConstant;*/
uniform float nuclearForceConstant;
uniform float nuclearForceRange;
uniform float nuclearForceRange2;
uniform float forceConstant;
uniform float boundaryDistance;
uniform float boundaryDamping;
uniform sampler2D textureProperties;
uniform float frictionConstant;
uniform vec4 forceConstants;
/*vec4 forceConstants = vec4(
    massConstant, 
    -chargeConstant,
    nuclearForceConstant,
    0
);*/

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
    float m1 = props1.x;
    vec4 tVel1 = texture2D(textureVelocity, uv1);
    vec3 vel1 = tVel1.xyz;
    float collisions = tVel1.w;

    vec3 rForce = vec3(0.0);
    for (float texY = 0.5; texY < resolution.y; texY++) {
        for (float texX = 0.5; texX < resolution.x; texX++) {
            vec2 uv2 = vec2(texX, texY) / resolution.xy;
            if (uv1 == uv2) continue;

            vec4 tPos2 = texture2D(texturePosition, uv2);
            float type2 = tPos2.w;
            if (type2 != DEFAULT && type2 != FIXED) continue;

            vec3 pos2 = tPos2.xyz;            
            vec4 props2 = texture2D(textureProperties, uv2);

            vec3 dPos = pos2 - pos1;
            float distance2 = dot(dPos, dPos);

            /*vec3 vel2 = texture2D(textureVelocity, uv2).xyz;
            float rng = 23.0 + 29.0 * vel1.x + 67.0 * vel1.y + 101.0 * vel2.x + 223.0 * vel2.y + 331.0 * dPos.x + 991.0 * dPos.y;
            rng = mod(rng, 3.0);
            if (rng == 0.0) continue;*/

            // check collision
            if (distance2 <= minDistance2) {
                if (type1 != PROBE) {
                    float m2 = props2.x;
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
            
            float force = 0.0;
            float x = 0.0;
            if (distance2 < nuclearForceRange2) {
                #if !USE_DISTANCE1
                    float distance1 = sqrt(distance2);
                #endif

                #if USE_HOOKS_LAW
                    x = -(2.0 * distance1 - nuclearForceRange)/nuclearForceRange;
                #else
                    x = distance1/nuclearForceRange;
                    #if USE_POTENTIAL0 // 'powXR'
                        const float r = 1.0/3.0, log2 = log(2.0);
                        x = pow(x, -log2 / log(r));
                        x = sin(2.0 * PI * x);
                    #elif USE_POTENTIAL1 // 'exp'
                        const float r1 = 1.0/3.0, r2 = 3.0, log2 = log(2.0);
                        x = -exp(-log2 * x * r2 / r1);
                        x = sin(2.0 * PI * x);
                    #elif USE_POTENTIAL2 // 'powAX'
                        x = sin(7.22423 * (1.0 - pow(0.13026, x)));
                    #elif USE_POTENTIAL3 // 'powAXv2'
                        x = sin(6.64541 * (1.0 - pow(0.054507, x)));
                    #elif USE_POTENTIAL4 // 'powAXv3'
                        const float a = 3.0;
                        x = sin(6.64541 * (1.0 - pow(0.054507, x))) * exp(-a * x) * a;
                    #elif USE_FMAP1 // 'forceMap1'
                        // const float fMap[2] = float[2](1.0, 0.0);
                        // int idx = int(2.0 * x);
                        // const float fMap[3] = float[](3.0, 0.0, -1.0);
                        // int idx = int(3.0 * x);
                        // const float fMap[4] = float[](2.0, 0.0, -1.0, -1.0);
                        // int idx = int(4.0 * x);
                        // const float fMap[7] = float[](3.0, 0.0, -2.0, 0.0, 2.0, 0.0, -3.0);
                        // int idx = int(7.0 * x);
                        // const float fMap[6] = float[](1.0, 3.0, 0.0, -1.0, -0.5, -0.25);
                        // int idx = int(6.0 * x);

                        // const float fMap[10] = float[](1.0, 3.0, -2.0, -1.0, 0.5, -0.5, -0.25, 0.125, -0.125, -0.063);
                        // int idx = int(10.0 * x);

                        // const float fMap[8] = float[](3.0, -2.0, 1.0, -1.0, 0.5, -0.5, 0.25, -0.25);
                        // int idx = int(8.0 * x);

                        /*const float fMap[12] = float[](2.0, 3.0, -2.0, -1.0, 0.0, 1.0, 0.0, -1.0, 0.0, 0.5, 0.0, -0.5);
                        int idx = int(12.0 * x);*/

                        /*const float fMap[6] = float[](2.0, 3.0, -2.0, -1.0, 0.5, -0.5);
                        int idx = int(6.0 * x);*/

                        // const float fMap[12] = float[](0.0, 2.0, 0.0, -2.0, 0.0, 0.1, 0.0, -1.0, 0.0, 0.1, 0.0, -0.5);
                        // int idx = int(12.0 * x);

                        // const float fMap[8] = float[](0.1, 2.0, 0.0, -1.0, 0.0, 0.1, 0.0, -0.5);
                        // int idx = int(8.0 * x);

                        const float fMap[12] = float[](
                            1.0, 2.0, 0.0, -2.0, 
                            0.0, 0.5, 0.0, -1.0, 
                            0.0, 0.25, 0.0, -0.5);
                        int idx = int(8.0 * x);
                        
                        x = fMap[idx];
                    #else
                        x = sin(2.0 * PI * x);
                    #endif
                #endif

                #if ENABLE_COLOR_CHARGE
                    const vec3 color1[4] = vec3[](
                        vec3(0.0, 0.0, 0.0),

                        vec3(0.0, 1.0, -1.0),
                        vec3(-1.0, 0.0, 1.0),
                        vec3(1.0, -1.0, 0.0)
                    );
                    const vec3 color2[4] = vec3[](
                        vec3(0.0, 0.0, 0.0),
                        
                        vec3(1.0, 0.0, 0.0),
                        vec3(0.0, 1.0, 0.0),
                        vec3(0.0, 0.0, 1.0)
                    );

                    float c = dot(color1[uint(props1.w)], color2[uint(props2.w)]);
                    float d = distance1 / nuclearForceRange; //(2.0 * distance1 - nuclearForceRange)/nuclearForceRange;
                    force += nuclearForceConstant * c * d;
                    // x = x * c;
                #endif
            }

            #if !USE_DISTANCE1
                float d12 = 1.0/distance2;
            #else
                float d12 = 1.0/distance1;
            #endif
            vec4 props = props1 * props2;
            vec4 pot = vec4(d12, d12, x, 0);
            vec4 result = forceConstants * props * pot;
            force += result.x + result.y + result.z;
            rForce += force * normalize(dPos);
        }
    }

    #if ENABLE_FRICTION
        float velAbs = dot(vel1, vel1);
        if (velAbs > 0.0) {
            //velAbs = min(velAbs, m1/frictionConstant); // v' = v + F/m, F = -cv^2; v' = 0 -> v = m/c
            vec3 f = -frictionConstant * normalize(vel1);
            velAbs = sqrt(velAbs);
            f *= velAbs;
            rForce += f;
        }
    #endif

    rForce *= forceConstant;
    
    // update velocity
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
                    if (sdSphere(nextPos, BOUNDARY_TOLERANCE * boundaryDistance) < 0.0) {
                        vel1 = boundaryDamping * reflect(vel1, normalize(-pos1));
                    } else {
                        vel1 = vec3(0.0);
                    }
                }
            #else
                vec3 box = vec3(boundaryDistance);
                if (sdBox(nextPos, box) >= 0.0) {
                    if (sdBox(nextPos, BOUNDARY_TOLERANCE * box) < 0.0) {
                        if (abs(nextPos.x) >= boundaryDistance) vel1.x = -boundaryDamping * vel1.x;
                        if (abs(nextPos.y) >= boundaryDistance) vel1.y = -boundaryDamping * vel1.y;
                        if (abs(nextPos.z) >= boundaryDistance) vel1.z = -boundaryDamping * vel1.z;
                    } else {
                        vel1 = vec3(0.0);
                    }
                }
            #endif
        #endif
    } else if (type1 == PROBE) {
        vel1 = rForce;
    }

    // velocity clamp / sanity checks
    #if ENABLE_BOUNDARY
        vel1 = min(vel1, vec3(boundaryDistance, boundaryDistance, boundaryDistance));
    #else
        vel1 = min(vel1, vec3(1e12, 1e12, 1e12));
    #endif

    #ifdef ROUND_VELOCITY
        vel1 = round(vel1);
    #endif

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
                vec3 box = vec3(boundaryDistance);
                if (sdBox(pos, BOUNDARY_TOLERANCE * box) >= 0.0) {
                    pos = normalize(pos);
                }
            #endif
        #else
            // clamp pos?
        #endif
    }

    #ifdef ROUND_POS
        pos = round(pos);
    #endif

    gl_FragColor = vec4(pos, type);
}
`;