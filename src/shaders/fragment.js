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
uniform sampler2D textureProperties;

const float width = resolution.x;
const float height = resolution.y;

void main() {
    vec2 uv1 = gl_FragCoord.xy / resolution.xy;
    vec4 props1 = texture2D(textureProperties, uv1);
    float id1 = props1.x;
    if (id1 == 0.0) {
        return;
    }
    float m1 = props1.y;
    vec3 pos1 = texture2D(texturePosition, uv1).xyz;
    vec3 vel1 = texture2D(textureVelocity, uv1).xyz;

    vec3 rForce = vec3(0.0);
    for (float y = 0.0; y < height; y++) {
        for (float x = 0.0; x < width; x++) {
            vec2 uv2 = vec2(x + 0.5, y + 0.5) / resolution.xy;
            vec4 props2 = texture2D(textureProperties, uv2);
            float id2 = props2.x;
            if (id2 == 0.0) {
                continue;
                //break;
            }
            if (id1 == id2) {
                continue;
            }
            float m2 = props2.y;
            vec3 pos2 = texture2D(texturePosition, uv2).xyz;
            vec3 vel2 = texture2D(textureVelocity, uv2).xyz;

            vec3 dPos = pos2 - pos1;
            float distance2 = dot(dPos, dPos);

            if (distance2 <= minDistance) {
                float m = m1 + m2;
                if (m == 0.0) {
                    continue;
                }

                float s = 2.0 * m1 * m2 / m;
                vec3 dv = vel2 - vel1;

                rForce += s * dv;
                
                continue;
            }

            float force = 0.0;

            float q1 = props1.z;
            float q2 = props2.z;

            force += massConstant * m1 * m2;
            force += -chargeConstant * q1 * q2;
            force /= distance2;

            if (distance2 <= nearChargeRange2) {
                float nq1 = props1.w;
                float nq2 = props2.w;
                float distance1 = sqrt(distance2);

                float x = (2.0 * distance1 - nearChargeRange)/nearChargeRange;
                x = sin(PI * x);
                force += -nearChargeConstant * nq1 * nq2 * x;
            }

            rForce += forceConstant * force * normalize(dPos);
        }
    }

    if (m1 != 0.0) {
        vel1 += rForce / abs(m1);
    } else {
        vel1 += rForce;
    }

    // check boundary colision
    vec3 nextPos = pos1 + vel1;
    if (length(nextPos) >= boundaryDistance) {
        vel1 = reflect(vel1, normalize(-nextPos));
    }

    gl_FragColor = vec4(vel1, 1.0);
}
`;

export const computePosition = /* glsl */ `

precision highp float;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 pos = texture2D( texturePosition, uv ).xyz;
    vec3 vel = texture2D( textureVelocity, uv ).xyz;

    pos += vel;

    gl_FragColor = vec4(pos, 1.0);
}
`;

export const particleFragmentShader = /* glsl */ `
varying vec4 vColor;

void main() {
    float f = length(gl_PointCoord - vec2(0.5));
    if (f > 0.5) {
        discard;
    }
    gl_FragColor = vec4(vColor);
}
`;