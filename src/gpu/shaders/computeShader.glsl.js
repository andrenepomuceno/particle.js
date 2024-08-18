import { FrictionModel, NuclearPotentialType } from "../../physics";

function define(define, value = false) {
    if (value) {
        return "#define " + define + " 1\n";
    }
    else {
        return "#define " + define + " 0\n";
    }
}

export function generateComputeVelocity(physics) {
    //physics.nuclearPotential = NuclearPotentialType.potential_forceMap1;

    let config = '';
    config += '#define BOUNDARY_TOLERANCE 1.01\n';

    config += define("ENABLE_BOUNDARY", physics.enableBoundary);
    config += define("USE_BOX_BOUNDARY", physics.useBoxBoundary);
    config += define("USE_DISTANCE1", physics.useDistance1);
    config += define("ENABLE_COLOR_CHARGE", physics.enableColorCharge);
    config += define("ROUND_VELOCITY", physics.roundVelocity);
    config += define("MODE_2D", physics.mode2D);

    config += define("ENABLE_FRICTION", physics.enableFriction);
    config += define("FRICTION_DEFAULT", physics.frictionModel === FrictionModel.default);
    config += define("FRICTION_SQUARE", physics.frictionModel === FrictionModel.square);

    config += define("USE_HOOKS_LAW", physics.nuclearPotential === NuclearPotentialType.hooksLaw);
    config += define("USE_POTENTIAL0", physics.nuclearPotential === NuclearPotentialType.potential_powXR);
    config += define("USE_POTENTIAL1", physics.nuclearPotential === NuclearPotentialType.potential_exp);
    config += define("USE_POTENTIAL2", physics.nuclearPotential === NuclearPotentialType.potential_powAX);
    config += define("USE_POTENTIAL3", physics.nuclearPotential === NuclearPotentialType.potential_powAXv2);
    config += define("USE_POTENTIAL4", physics.nuclearPotential === NuclearPotentialType.potential_powAXv3);
    config += define("USE_FMAP1", physics.nuclearPotential === NuclearPotentialType.potential_forceMap1);
    config += define("USE_FMAP2", physics.nuclearPotential === NuclearPotentialType.potential_forceMap2);

    config += define("USE_LORENTZ_FACTOR", physics.enableLorentzFactor);
    config += define("USE_FINE_STRUCTURE", physics.enableFineStructure);

    let shader = config + computeVelocityV2;
    return shader;
}

export function generateComputePosition(physics) {
    let config = '';
    config += '#define BOUNDARY_TOLERANCE 1.01\n';

    config += define("ENABLE_BOUNDARY", physics.enableBoundary);
    config += define("USE_BOX_BOUNDARY", physics.useBoxBoundary);
    config += define("ROUND_POS", physics.roundPosition);
    config += define("MODE_2D", physics.mode2D);

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
uniform sampler2D textureProperties2;
uniform float frictionConstant;
uniform vec4 forceConstants;
/*vec4 forceConstants = vec4(
    massConstant, 
    -chargeConstant,
    nuclearForceConstant,
    0
);*/
uniform float maxVel;
uniform float maxVel2;
uniform float fineStructureConstant;
uniform float colorChargeConstant;

uniform float forceMap[16];
uniform float forceMapLen;

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

float calcNuclearPotential(float distance1, float distance2)
{
    float x = 0.0;

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
            int idx = int(forceMapLen * x);
            x = forceMap[idx];
        #elif USE_FMAP2 // QCD test
            float lambda = forceMap[0];
            float sigma = forceMap[1];
            float xMax = forceMap[2];
            float d = x;
            x = exp(-d / lambda); // yukawa
            x /= (d * d);
            x = min(x, xMax);
            x -= sigma * d; // string tension
        #else
            x = sin(2.0 * PI * x);
        #endif
    #endif

    return x;
}

float calcColorPotential(float c1, float c2, float distance1)
{
    float x = 0.0;

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

    //if (c1 != 0.0 && c2 != 0.0)
    {
        float f = dot(color1[uint(c1)], color2[uint(c2)]);
        x = colorChargeConstant * (distance1/nuclearForceRange) * f;
    }

    return x;
}

void main() {
    const vec4 ones = vec4(1.0);

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

            vec3 vel2 = texture2D(textureVelocity, uv2).xyz;
            float m2 = props2.x;

            // check collision
            if (distance2 <= minDistance2) {
                if (type1 != PROBE) {
                    #if 1
                        // vec3 vel2 = texture2D(textureVelocity, uv2).xyz;
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
                    #else
                        rForce += -1.0 * normalize(dPos);
                    #endif
                    
                    ++collisions;
                    continue;
                } else {
                    // for probe
                    distance2 = minDistance2;
                }
            }

            float distance1 = sqrt(distance2);
            
            float force = 0.0;
            float nPot = 0.0;
            if (distance2 < nuclearForceRange2) {               
                nPot = calcNuclearPotential(distance1, distance2);

                #if ENABLE_COLOR_CHARGE
                    //nPot *= (1.0 + calcColorPotential(props1.w, props2.w, distance1));
                    nPot += calcColorPotential(props1.w, props2.w, distance1);
                #endif
            }

            float d12 = 1.0/distance2;
            float gPot = d12;
            float ePot = d12;

            #if USE_DISTANCE1
                gPot += 1.0 / distance1;
                ePot += 1.0 / distance1;
            #endif

            #if USE_FINE_STRUCTURE
                //ePot *= (1.0 + fineStructureConstant / distance1);
                ePot += fineStructureConstant / distance1;
            #endif

            #if 1
                //gPot *= (1.0 + (m1 + m2)/(maxVel2 * distance1));
                // gPot += (m1 + m2)/(maxVel2 * distance1);
                //gPot += (m1 + m2)/(1.0 * distance1);
                gPot += 1.0/distance1;

                /*float p = -(m1 + m2) / (maxVel2 * distance1);
                p += 3.0 / (2.0 * maxVel2) * dot(vel1, vel1);
                p += 3.0 / (2.0 * maxVel2) * dot(vel2, vel2);
                p += -4.0 / (maxVel2) * dot(vel1, vel2);
                gPot += p;*/
            #endif

            vec4 props = props1 * props2;
            vec4 pot = vec4(gPot, ePot, nPot, 0.0);
            vec4 result = forceConstants * props * pot;
            //force += result.x + result.y + result.z;
            force += dot(result, ones);
            
            #if USE_LORENTZ_FACTOR
                float vel2Abs = dot(vel2, vel2);
                force /= sqrt(1.0 - vel2Abs / maxVel2);
            #endif

            rForce += force * normalize(dPos);
        }
    }

    #if ENABLE_FRICTION
        float vel1Abs = dot(vel1, vel1);
        if (vel1Abs > 0.0) {
            //vel1Abs = min(vel1Abs, m1/frictionConstant); // v' = v + F/m, F = -cv^2; v' = 0 -> v = m/c
            vec3 f = -frictionConstant * normalize(vel1);
            #if FRICTION_DEFAULT
                vel1Abs = sqrt(vel1Abs);
            #endif
            f *= vel1Abs;
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

        // velocity clamp
        vel1 = clamp(vel1, -maxVel, maxVel);
        
        #if ENABLE_BOUNDARY
            // check boundary colision
            vec3 nextPos = pos1 + vel1;

            #if !USE_BOX_BOUNDARY
                if (sdSphere(nextPos, boundaryDistance) >= 0.0) {
                    if (sdSphere(nextPos, BOUNDARY_TOLERANCE * boundaryDistance) < 0.0) {
                        vel1 = boundaryDamping * reflect(vel1, normalize(-pos1));
                    } else {
                        vel1 = normalize(vel1);
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
                        vel1 = normalize(vel1);
                    }
                }
            #endif

            #if MODE_2D
                vel1.z = 0.0;
            #endif
        #endif
    } else if (type1 == PROBE) {
        vel1 = rForce;
    }

    #if ROUND_VELOCITY
        vel1 = round(vel1);
    #endif

    // vel1 *= velocityConstant;

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
                    float len = length(pos);
                    vec3 n = normalize(pos);
                    pos = n * mod(len, boundaryDistance);
                }
            #else
                vec3 box = vec3(boundaryDistance);
                if (sdBox(pos, BOUNDARY_TOLERANCE * box) >= 0.0) {
                    pos = mod(pos, boundaryDistance);
                    pos *= 2.0;
                    pos -= boundaryDistance;
                    #if MODE_2D
                        pos.z = 0.0;
                    #endif
                }
            #endif
        #else
            pos = clamp(pos, -1e30, 1e30);
        #endif
    }

    #if ROUND_POS
        pos = round(pos);
    #endif

    /*#if MODE_2D
        pos.z = 0.0;
    #endif*/

    gl_FragColor = vec4(pos, type);
}
`;