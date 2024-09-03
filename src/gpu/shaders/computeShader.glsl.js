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
    config += define("USE_RANDOM_NOISE", physics.enableRandomNoise);
    config += define("USE_POST_GRAVITY", physics.enablePostGravity);

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

uniform float uTime;
uniform float timeStep;
uniform float minDistance2;
uniform float massConstant;
uniform float chargeConstant;
uniform float nuclearForceConstant;
uniform float nuclearForceRange;
uniform float nuclearForceRange2;
uniform float boundaryDistance;
uniform float boundaryDamping;
uniform sampler2D textureProperties;
uniform sampler2D textureProperties2;
uniform float frictionConstant;
uniform vec4 forceConstants;
uniform float maxVel;
uniform float maxVel2;
uniform float fineStructureConstant;
uniform float colorChargeConstant;
uniform float randomNoiseConstant;

uniform float forceMap[16];
uniform float forceMapLen;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

const vec4 ones = vec4(1.0);

float sdBox(vec3 p, vec3 b)
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdSphere(vec3 p, float s)
{
    return length(p) - s;
}

#if USE_RANDOM_NOISE
uint hash(uint x) {
    x += (x << 10u);
    x ^= (x >> 6u);
    x += (x << 3u);
    x ^= (x >> 11u);
    x += (x << 15u);
    return x;
}

uint hash(uvec3 v) {
    return hash(v.x ^ hash(v.y) ^ hash(v.z));
}

float floatConstruct(uint m) {
    const uint ieeeMantissa = 0x007FFFFFu;
    const uint ieeeOne = 0x3F800000u;

    m &= ieeeMantissa;
    m |= ieeeOne;

    float  f = uintBitsToFloat(m);
    return f - 1.0;
}

float randomSeed = 0.0;

void srandom(float seed) {
    randomSeed = seed;
}

float random(vec2 v) {
    vec3 x = vec3(v, randomSeed);
    randomSeed += 1.0;
    return floatConstruct(hash(floatBitsToUint(x)));
}
#endif

vec3 collision(const float m1, const float m2,
                const vec3 vel1, const vec3 vel2,
                const vec3 dPos, const float distance2) {
    vec3 rForce = vec3(0.0);

    float m = m1 + m2; // precision loss if m1 >> m2
    if (m == 0.0) {
        return rForce;
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
        
    return rForce;
}

float calcNuclearPotential(const float distance1, const float d)
{
    float x = d;

    #if USE_HOOKS_LAW
        x = -(2.0 * x - 1.0);

    #elif USE_POTENTIAL0 // 'powXR'
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
        x = exp(-d / lambda); // yukawa
        x -= sigma * d; // string tension

    #else // default
        x = sin(2.0 * PI * x);
    #endif

    return x;
}

const vec3 color1Mat[4] = vec3[](
    vec3(0.0, 0.0, 0.0),

    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
);

const vec3 color2Mat[4] = vec3[](
    vec3(0.0, 0.0, 0.0),

    vec3(-1.0, 1.0, 1.0),
    vec3(1.0, -1.0, 1.0),
    vec3(1.0, 1.0, -1.0)
);

void main() {
    vec2 uv1 = gl_FragCoord.xy / resolution.xy;
    vec4 texPos1 = texture2D(texturePosition, uv1);
    float type1 = texPos1.w;
    if (type1 == UNDEFINED) return;

    #if USE_RANDOM_NOISE
        srandom(uTime);
    #endif
    
    vec4 props1 = texture2D(textureProperties, uv1);
    float m1 = props1.x;

    vec4 texVel1 = texture2D(textureVelocity, uv1);
    float collisions = texVel1.w;
    float outOfBoundaryCount = 0.0;

    #if MODE_2D
        vec3 pos1 = vec3(texPos1.xy, 0.0);
        vec3 vel1 = vec3(texVel1.xy, 0.0);
        outOfBoundaryCount = texVel1.z;
    #else
        vec3 pos1 = texPos1.xyz;
        vec3 vel1 = texVel1.xyz;
    #endif

    float vel1Abs = dot(vel1, vel1);

    vec3 rForce = vec3(0.0);
    for (float texY = 0.5; texY < resolution.y; texY++) {
        for (float texX = 0.5; texX < resolution.x; texX++) {
            vec2 uv2 = vec2(texX, texY) / resolution.xy;
            if (uv1 == uv2) continue;

            vec4 texPos2 = texture2D(texturePosition, uv2);
            float type2 = texPos2.w;
            if (type2 != DEFAULT && type2 != FIXED) continue;
         
            vec4 props2 = texture2D(textureProperties, uv2);
            float m2 = props2.x;

            vec4 texVel2 = texture2D(textureVelocity, uv2);

            #if MODE_2D
                vec3 pos2 = vec3(texPos2.xy, 0.0);
                vec3 vel2 = vec3(texVel2.xy, 0.0);
            #else
                vec3 pos2 = texPos2.xyz;
                vec3 vel2 = texVel2.xyz;
            #endif

            vec3 dPos = pos2 - pos1;
            float distance2 = dot(dPos, dPos);

            // check collision
            if (distance2 <= minDistance2) {
                if (type1 != PROBE) {
                    rForce += collision(m1, m2, vel1, vel2, dPos, distance2);
                    ++collisions;
                    continue;
                }

                // for probe
                distance2 = minDistance2;
            }

            float distance1 = sqrt(distance2);

            float distance2inv = 1.0/distance2;
            float distance1inv = 1.0/distance1;

            float gPot = 0.0;
            float ePot = 0.0;

            #if USE_DISTANCE1
                gPot += distance1inv;
                ePot += distance1inv;
            #else
                gPot += distance2inv;
                ePot += distance2inv;
            #endif

            #if USE_FINE_STRUCTURE
            {
                float p = fineStructureConstant * distance1inv;
                ePot *= (1.0 + p);
            }
            #endif

            #if USE_POST_GRAVITY
            {
                float p = 0.0;

                p += -massConstant * (m1 + m2) * distance1inv;
                p += (3.0 / 2.0) * vel1Abs;
                p += (3.0 / 2.0) * dot(vel2, vel2);
                p += -4.0 * dot(vel1, vel2);
                p /= maxVel2;
                
                #if 0
                    const float alpha = 1.0;
                    const float lambda = 1.0;
                    p += alpha * exp(-distance1/lambda); // lambda-CDM
                #endif

                gPot *= (1.0 + p);
            }
            #endif

            float nPot = 0.0;
            float cPot = 0.0;
            
            if (distance2 < nuclearForceRange2) {
                float d = distance1/nuclearForceRange;               
                nPot += calcNuclearPotential(distance1, d);

                #if ENABLE_COLOR_CHARGE
                    float c = dot(color1Mat[uint(props1.w)], color2Mat[uint(props2.w)]);
                    cPot += c;
                    //cPot += c * d;
                #endif
            }

            vec4 props = vec4(props1.xyz, 1.0) * vec4(props2.xyz, 1.0);
            vec4 potential = vec4(gPot, ePot, nPot, cPot);
            vec4 result = forceConstants * props * potential;
            float force = dot(result, ones);

            rForce += force * normalize(dPos);
        }
    }

    #if ENABLE_FRICTION
    {
        if (vel1Abs > 0.0) {
            vec3 f = -frictionConstant * normalize(vel1);
            #if FRICTION_DEFAULT // -cv
                f *= sqrt(vel1Abs);
            #else // -cv^2
                f *= vel1Abs;
            #endif
            rForce += f;
        }
    }
    #endif

    #if USE_LORENTZ_FACTOR
    {
        float lf = 1.0 - vel1Abs / maxVel2;
        lf = max(lf, 0.001);
        rForce /= sqrt(lf);
    }
    #endif

    #if USE_RANDOM_NOISE
    {
        rForce.xy += randomNoiseConstant * vec2(
            random(uv1) - 0.5,
            random(uv1) - 0.5
        );
    }
    #endif
    
    // update velocity
    if (type1 == DEFAULT) {
        vec3 accel = rForce;
        if (m1 != 0.0) {
            accel /= abs(m1);
        }
        vel1 += timeStep * accel;

        // velocity clamp
        //vel1 = clamp(vel1, -maxVel, maxVel);
        vel1Abs = dot(vel1, vel1);
        if (vel1Abs >= maxVel2) {
            vel1 = maxVel * normalize(vel1);
        }
        
        #if ENABLE_BOUNDARY
            // check boundary colision
            vec3 nextPos = pos1 + vel1;

            #if USE_BOX_BOUNDARY
                vec3 box = vec3(boundaryDistance);
                if (sdBox(nextPos, box) >= 0.0) {
                    if (sdBox(nextPos, BOUNDARY_TOLERANCE * box) < 0.0) {
                        if (abs(nextPos.x) >= boundaryDistance) vel1.x = -boundaryDamping * vel1.x;
                        if (abs(nextPos.y) >= boundaryDistance) vel1.y = -boundaryDamping * vel1.y;
                        if (abs(nextPos.z) >= boundaryDistance) vel1.z = -boundaryDamping * vel1.z;
                    } else {
                        vel1 = normalize(vel1);
                        ++outOfBoundaryCount;
                    }
                }
            #else
                if (sdSphere(nextPos, boundaryDistance) >= 0.0) {
                    if (sdSphere(nextPos, BOUNDARY_TOLERANCE * boundaryDistance) < 0.0) {
                        vel1 = boundaryDamping * reflect(vel1, normalize(-pos1));
                    } else {
                        vel1 = normalize(vel1);
                        ++outOfBoundaryCount;
                    }
                }
            #endif
        #endif
    } else if (type1 == PROBE) {
        vel1 = rForce;
    }

    #if ROUND_VELOCITY
        vel1 = round(vel1);
    #endif

    #if MODE_2D
        gl_FragColor = vec4(vel1.xy, outOfBoundaryCount, collisions);
    #else
        gl_FragColor = vec4(vel1, collisions);
    #endif
}
`;

const computePosition = /* glsl */ `
precision highp float;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

uniform float boundaryDistance;
uniform float timeStep;

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
        
        pos += timeStep * vel;

        #if ENABLE_BOUNDARY
            #if USE_BOX_BOUNDARY
                // check out of boundary
                vec3 box = vec3(boundaryDistance);
                if (sdBox(pos, BOUNDARY_TOLERANCE * box) >= 0.0) {
                    pos = mod(pos, boundaryDistance);
                    pos *= 2.0;
                    pos -= boundaryDistance;
                }
            #else
                if (sdSphere(pos, BOUNDARY_TOLERANCE * boundaryDistance) >= 0.0) {
                    float len = length(pos);
                    vec3 n = normalize(pos);
                    pos = n * mod(len, boundaryDistance);
                }
            #endif
        #else
            pos = clamp(pos, -1e30, 1e30);
        #endif
    }

    #if ROUND_POS
        pos = round(pos);
    #endif

    #if MODE_2D
        gl_FragColor = vec4(pos.xy, 0.0, type);
    #else
        gl_FragColor = vec4(pos, type);
    #endif
}
`;