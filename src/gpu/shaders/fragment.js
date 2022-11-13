export const computeVelocity = /* glsl */ `
#include <common>

precision highp float;

uniform float minDistance;
uniform float massConstant;
uniform float chargeConstant;
uniform float nearChargeConstant;
uniform float nearChargeRange;
uniform float nearChargeRange2;
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
    float q1 = props1.z;
    float nq1 = props1.w;
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
            if (distance2 <= minDistance) {
                if (type1 != PROBE) {
                    vec3 vel2 = texture2D(textureVelocity, uv2).xyz;

                    float m = m1 + m2;
                    if (m == 0.0) {
                        continue;
                    }

                    float s = 2.0 * m1 * m2 / m;
                    vec3 dv = vel2 - vel1;

                    rForce += s * dv;
                    
                    ++collisions;
                    continue;
                } else {
                    // for probe
                    distance2 = minDistance;
                }
            }

            float force = 0.0;

            float q2 = props2.z;

            force += massConstant * m1 * m2;
            force += -chargeConstant * q1 * q2;
            force /= distance2;

            if (distance2 <= nearChargeRange2) {
                
                float nq2 = props2.w;
                float distance1 = sqrt(distance2);

                float x = (2.0 * distance1 - nearChargeRange)/nearChargeRange;
                x = sin(PI * x);
                //x = cos(PI * x);
                force += -nearChargeConstant * nq1 * nq2 * x;
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
        if (length(nextPos) >= boundaryDistance) {
        //if ((abs(nextPos.x) >= boundaryDistance) || (abs(nextPos.y) >= boundaryDistance || (abs(nextPos.z) >= boundaryDistance)) {
            if (length(vel1) < boundaryDistance) {
                vel1 = reflect(vel1, normalize(-nextPos));
                vel1 *= boundaryDamping;
            } else {
                // particle will go out of boundaries
                vel1 = vec3(0.0);
            }
        }

        //if (abs(nextPos.x) >= boundaryDistance) vel1.x = -boundaryDamping * vel1.x;
        //if (abs(nextPos.y) >= boundaryDistance) vel1.y = -boundaryDamping * vel1.y;
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

export const particleFragmentShader = /* glsl */ `

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 filled(float distance, float linewidth, float antialias, vec4 fill)
{
    vec4 frag_color;
    float t = linewidth/2.0 - antialias;
    float signed_distance = distance;
    float border_distance = abs(signed_distance) - t;
    float alpha = border_distance/antialias;
    alpha = exp(-alpha*alpha);

    // Within linestroke
    if( border_distance < 0.0 )
        frag_color = fill;
    // Within shape
    else if( signed_distance < 0.0 )
        frag_color = fill;
    else
        // Outside shape
        if( border_distance > (linewidth/2.0 + antialias) )
            discard;
        else // Line stroke exterior border
            frag_color = vec4(fill.rgb*alpha, 1.0);

    return frag_color;
}

float sdCone(vec3 p, vec3 a, vec3 b, float ra, float rb)
{
    float rba  = rb-ra;
    float baba = dot(b-a,b-a);
    float papa = dot(p-a,p-a);
    float paba = dot(p-a,b-a)/baba;

    float x = sqrt( papa - paba*paba*baba );

    float cax = max(0.0,x-((paba<0.5)?ra:rb));
    float cay = abs(paba-0.5)-0.5;

    float k = rba*rba + baba;
    float f = clamp( (rba*(x-ra)+paba*baba)/k, 0.0, 1.0 );

    float cbx = x-ra - f*rba;
    float cby = paba - f;
    
    float s = (cbx < 0.0 && cay < 0.0) ? -1.0 : 1.0;
    
    return s*sqrt( min(cax*cax + cay*cay*baba,
                       cbx*cbx + cby*cby*baba) );
}

float sdCylinder(vec3 p, vec3 a, vec3 b, float r)
{
    vec3  ba = b - a;
    vec3  pa = p - a;
    float baba = dot(ba,ba);
    float paba = dot(pa,ba);
    float x = length(pa*baba-ba*paba) - r*baba;
    float y = abs(paba-baba*0.5)-baba*0.5;
    float x2 = x*x;
    float y2 = y*y*baba;
    
    float d = (max(x,y)<0.0)?-min(x2,y2):(((x>0.0)?x2:0.0)+((y>0.0)?y2:0.0));
    
    return sign(d)*sqrt(abs(d))/baba;
}

float sdArrow(vec3 p) {
    float d1 = sdCylinder(p, vec3(-0.45,0.0,0.0), vec3(0.1,0.0,0.0), 0.05);
    float d2 = sdCone(p, vec3(0.1,0.0,0.0), vec3(0.45,0.0,0.0), 0.2, 0.0);
    return min(d1, d2);
}

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

const float linewidth = 0.05;
const float antialias = 0.01;

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vVelocity;

vec3 velocityColor(vec3 vel) {
    const float velMax = 1e3;
    const float velFade = 1e-2;
    float saturation = 1.0;
    float value = 1.0;
    float velAbs = length(vel)/velMax;
    if (velAbs > 1.0) {
        velAbs = 1.0;
        saturation = 0.0;
    } else if (velAbs < velFade) {
        value = velAbs/velFade;
    }
    return hsv2rgb(vec3(velAbs, saturation, value));
}

void main() {
    if (vType != PROBE) {        
        float d = length(gl_PointCoord - vec2(0.5)) - 0.45;
        gl_FragColor = filled(d, linewidth, antialias, vColor);
    } else {
        vec3 coordinates = vec3(gl_PointCoord.xy - vec2(0.5), 0.0);
        vec3 dir = normalize(vVelocity);
        coordinates.xy = mat2(dir.x, dir.y, -dir.y, dir.x) * coordinates.xy; // rotate

        vec3 color = velocityColor(vVelocity);
        float d = sdArrow(coordinates);
        gl_FragColor = filled(d, linewidth, antialias, vec4(color, 1.0));
    }
}
`;