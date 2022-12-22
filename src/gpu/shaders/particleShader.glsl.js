export const particleVertexShader = /* glsl */ `
attribute vec3 color;
attribute float radius;

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float cameraConstant;

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vPos;
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

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = r * cameraConstant / (- mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    if (vType == PROBE) {
        vec3 vel = texture2D( textureVelocity, uv ).xyz;
        vVelocity = vel;
        vPos = pos;
    }
    
    vColor = vec4(color, 1.0);
}
`;

export const particleFragmentShader = /* glsl */ `

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

const float linewidth = 0.05;
const float antialias = 0.01;

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vPos;
flat varying vec3 vVelocity;

uniform vec2 resolution;

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

float arrow(vec3 position, vec3 start, vec3 end, float baseRadius, float tipRadius, float tipHeight) {
    vec3 t = start - end;
    float l = length(t);
    t /= l;
    l = max(l, tipHeight);

    position -= end;
    if (t.y + 1.0 < 0.0001) {
        position.y = -position.y;
    } else {
        float k = 1.0 / (1.0 + t.y);
        vec3 column1 = vec3(t.z * t.z * k + t.y, t.x, t.z * -t.x * k);
        vec3 column2 = vec3(-t.x, t.y, -t.z);
        vec3 column3 = vec3(-t.x * t.z * k, t.z, t.x * t.x * k + t.y);
        position = mat3(column1, column2, column3) * position;
    }
 
    vec2 q = vec2(length(position.xz), position.y);
    q.x = abs(q.x);
   
    // tip
    vec2 e = vec2(tipRadius, tipHeight);
    float h = clamp(dot(q, e) / dot(e, e), 0.0, 1.0);
    vec2 d1 = q - e * h;
    vec2 d2 = q - vec2(tipRadius, tipHeight);
    d2.x -= clamp(d2.x, baseRadius - tipRadius, 0.0);
    
    // base
    vec2 d3 = q - vec2(baseRadius, tipHeight);
    d3.y -= clamp(d3.y, 0.0, l - tipHeight);
    vec2 d4 = vec2(q.y - l, max(q.x - baseRadius, 0.0));

    float s = max(max(max(d1.x, -d1.y), d4.x), min(d2.y, d3.x));
    return sqrt(min(min(min(dot(d1, d1), dot(d2, d2)), dot(d3, d3)), dot(d4, d4))) * sign(s);
}

vec4 velocityColor(vec3 vel) {
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
    return vec4(hsv2rgb(vec3(velAbs, saturation, value)), 1.0);
}

mat3 lookAtMatrix(vec3 from, vec3 to) {
    vec3 forward = normalize(to - from);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    return mat3(right, up, forward);
}

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

float myArrow(vec3 position) {
    vec3 dir = normalize(vVelocity);

    float angle = atan(dir.y, dir.x);
    position = rotate(position, vec3(0.0, 0.0, 1.0), angle);
    float angleZ = -asin(dir.z);
    position = rotate(position, vec3(0.0, 1.0, 0.0), angleZ);

    float baseRadius = 0.15; 
    float tipRadius = 0.35;
    float tipHeight = 0.7;
    float cornerRadius = 0.05;
    vec3 start = vec3(1.0, 0.0, 0.0);
    vec3 end = vec3(-1.0, 0.0, 0.0);
    float d = arrow(position, start, end, baseRadius, tipRadius, tipHeight);
    d -= cornerRadius;
    return d;
}

vec3 normal(vec3 position) {
    float epsilon = 0.001;
    vec3 gradient = vec3(
        myArrow(position + vec3(epsilon, 0, 0)) - myArrow(position + vec3(-epsilon, 0, 0)),
        myArrow(position + vec3(0, epsilon, 0)) - myArrow(position + vec3(0, -epsilon, 0)),
        myArrow(position + vec3(0, 0, epsilon)) - myArrow(position + vec3(0, 0, -epsilon))
    );
    return normalize(gradient);
}

float raycast(vec3 rayOrigin, vec3 rayDirection) {
    int stepCount = 128 * 1;
    float maximumDistance = 10.0;
    float t = 0.0;
    for (int i = 0; i < stepCount; i++) {
        if (t > maximumDistance) {
            break;
        }
        vec3 currentPosition = rayOrigin + rayDirection * t;
        float d = myArrow(currentPosition);
        if (d < 0.0001) {
            return t;
        }
        t += d;
    }
    return 0.0;
}

void arrow3d() {
    mat3 eyeTransform = lookAtMatrix(cameraPosition, vPos);
    vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
    rayOrigin = eyeTransform * rayOrigin;
    vec3 targetPosition = vec3(0.0);
    mat3 cameraTransform = lookAtMatrix(rayOrigin, targetPosition);
    vec3 mainColor = velocityColor(vVelocity).xyz;
    
    vec2 uv = gl_PointCoord.xy - vec2(0.5);
    vec3 rayDirection = normalize(vec3(uv, 1.5));
    rayDirection = cameraTransform * rayDirection;
    float t = raycast(rayOrigin, rayDirection);
    vec3 color = vec3(0.0);
    if (t > 0.0) {
        vec3 position = rayOrigin + rayDirection * t;
        vec3 lightDirection = vec3(0.0, 0.0, -1.0);
        vec3 n = normal(position);
        float diffuseAngle = max(dot(n, lightDirection), 0.0);
        // diffuse
        color = mainColor * diffuseAngle; // arrow
        // ambient
        color += vec3(0.01) * ((n.y + 1.0) * 0.5); // light
    } else {
        gl_FragColor = vec4(0.0, 0.1, 0.0, 0.5);
        return;
    }

    // gamma
    color = sqrt(color);

    gl_FragColor = vec4(color, 1.0);
}

void sphere() {
    float d = length(gl_PointCoord - vec2(0.5)) - (0.5 - linewidth);
    gl_FragColor = filled(d, linewidth, antialias, vColor);
}

void arrow2d() {
    vec3 coordinates = vec3(gl_PointCoord.xy - vec2(0.5), 0.0);
    vec3 dir = normalize(vVelocity);

    float angle = atan(dir.y, dir.x);
    mat4 rotZ = rotationMatrix(vec3(0.0, 0.0, -1.0), angle);
    float angleZ = -asin(dir.z);
    mat4 rotY = rotationMatrix(vec3(0.0, 1.0, 0.0), angleZ);
    coordinates = (rotZ * vec4(coordinates, 1.0)).xyz;

    vec4 color = velocityColor(vVelocity);
    float d = arrow(coordinates, vec3(-0.5,0.0,0.0), vec3(0.5,0.0,0.0), 0.02, 0.15, 0.4);
    gl_FragColor = filled(d, linewidth, antialias, color);
}

void main() {
    if (vType != PROBE) {        
        sphere();
    } else {
        #if 0
            arrow2d();
        #else
            arrow3d();
        #endif
    }
}
`;
