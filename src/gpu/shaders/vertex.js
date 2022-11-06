export const particleVertexShader = /* glsl */ `
attribute vec3 color;
attribute float radius;

uniform sampler2D texturePosition;
uniform float cameraConstant;

varying vec4 vColor;

void main() {
    vColor = vec4(color, 1.0);

    vec3 pos = texture2D( texturePosition, uv ).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = radius * cameraConstant / (- mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;
