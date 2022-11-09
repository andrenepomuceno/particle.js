export const particleVertexShader = /* glsl */ `
// attribute vec3 position
// attribute vec2 uv
attribute vec3 color;
attribute float radius;

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float cameraConstant;

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vVelocity;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

void main() {
    vec4 tPos = texture2D( texturePosition, uv );
    vec3 pos = tPos.xyz;

    float r = radius;
    vType = tPos.w;
    if (vType == PROBE) {
        vec3 vel = texture2D( textureVelocity, uv ).xyz;
        vVelocity = vel;
    }

    vColor = vec4(color, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = r * cameraConstant / (- mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;
