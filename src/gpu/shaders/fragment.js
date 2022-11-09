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
                    ++collisions;

                    vec3 vel2 = texture2D(textureVelocity, uv2).xyz;

                    float m = m1 + m2;
                    if (m == 0.0) {
                        continue;
                    }

                    float s = 2.0 * m1 * m2 / m;
                    vec3 dv = vel2 - vel1;

                    rForce += s * dv;
                    
                    continue;
                } else {
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
// https://gist.github.com/983/e170a24ae8eba2cd174f
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}


// https://www.shadertoy.com/view/ldlSWj
// Computes the signed distance from a line
float line_distance(vec2 p, vec2 p1, vec2 p2) {
    vec2 center = (p1 + p2) * 0.5;
    float len = length(p2 - p1);
    vec2 dir = (p2 - p1) / len;
    vec2 rel_p = p - center;
    return dot(rel_p, vec2(dir.y, -dir.x));
}

// Computes the signed distance from a line segment
float segment_distance(vec2 p, vec2 p1, vec2 p2) {
    vec2 center = (p1 + p2) * 0.5;
    float len = length(p2 - p1);
    vec2 dir = (p2 - p1) / len;
    vec2 rel_p = p - center;
    float dist1 = abs(dot(rel_p, vec2(dir.y, -dir.x)));
    float dist2 = abs(dot(rel_p, dir)) - 0.5*len;
    return max(dist1, dist2);
}

float arrow_triangle(vec2 texcoord,
                     float body, float head, float height,
                     float linewidth, float antialias)
{
    float w = linewidth/2.0 + antialias;
    vec2 start = -vec2(body/2.0, 0.0);
    vec2 end   = +vec2(body/2.0, 0.0);

    // Head : 3 lines
    float d1 = line_distance(texcoord, end, end - head*vec2(+1.0,-height));
    float d2 = line_distance(texcoord, end - head*vec2(+1.0,+height), end);
    float d3 = texcoord.x - end.x + head;

    // Body : 1 segment
    float d4 = segment_distance(texcoord, start, end - vec2(linewidth,0.0));

    float d = min(max(max(d1, d2), -d3), d4);
    return d;
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

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vVelocity;

const float velMax = 1e3;
const float velFade = 1e-2;

const float body = 0.75;
const float linewidth = 0.05;
const float antialias = 0.0;
float head = 0.25 * body;

void main() {
    if (vType == PROBE) {
        float saturation = 1.0;
        float value = 1.0;
        float velAbs = length(vVelocity)/velMax;
        if (velAbs > 1.0) {
            velAbs = 1.0;
            saturation = 0.0;
        } else if (velAbs < velFade) {
            value = velAbs/velFade;
        }
        vec3 dir = normalize(vVelocity);
        vec3 color = hsv2rgb(vec3(velAbs, saturation, value));

        vec2 texcoord = gl_PointCoord.xy - vec2(0.5);
        float cos_theta = dir.x;
        float sin_theta = dir.y;
        texcoord = vec2(cos_theta*texcoord.x - sin_theta*texcoord.y,
                        sin_theta*texcoord.x + cos_theta*texcoord.y);

        float d = arrow_triangle(texcoord, body, head, 0.5, linewidth, antialias);
        gl_FragColor = filled(d, linewidth, antialias, vec4(color, 1.0));
    } else {
        float f = length(gl_PointCoord - vec2(0.5));
        if (f > 0.5) {
            discard;
        }

        gl_FragColor = vec4(vColor);
    }
}
`;