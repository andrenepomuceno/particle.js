export function generateParticleShader(particle3d, field3d, type) {
    function define(define, value) {
        if (value == true) {
            return "#define " + define + " 1\n";
        } else {
            return "#define " + define + " 0\n";
        }
    }

    let config = "";
    config += define("USE_3D_ARROW", particle3d);
    config += define("USE_3D_SPHERE", field3d);
    config += define("USE_PARTICLE_SPHERE", type == "sphere");
    config += define("USE_PARTICLE_ARROW", type == "arrow");
    config += define("USE_PARTICLE_SPHEROW", type == "spherow");
    let shader = config + particleFragmentShader;
    return shader;
}

export const particleVertexShader = /* glsl */ `
attribute vec3 color;
attribute float radius;

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform sampler2D textureProperties;
uniform float uCameraConstant;

varying vec4 vParticleColor;
flat varying float vParticleType;
flat varying vec3 vParticlePos;
flat varying vec3 vParticleVel;

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

void main() {
    vec4 tPos = texture2D( texturePosition, uv );
    vec3 pos = tPos.xyz;
    float r = radius;
    vParticleType = tPos.w;

    vec4 mvParticlePosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = r * uCameraConstant / (- mvParticlePosition.z);
    gl_Position = projectionMatrix * mvParticlePosition;

    vParticleVel = texture2D( textureVelocity, uv ).xyz;
    vParticlePos = pos;
    vParticleColor = vec4(color, 1.0);
}
`;

const particleFragmentShader = /* glsl */ `
#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

#define LINEWIDTH 5e-2
#define ANTIALIAS 1e-2
#define EPSILON 1e-3

uniform float uAvgVelocity;
uniform float uMaxFieldVel;

varying vec4 vParticleColor;
flat varying float vParticleType;
flat varying vec3 vParticlePos;
flat varying vec3 vParticleVel;


#define SURFACE_NORMAL(sdf, position) \
normalize(vec3( \
    sdf(position + vec3(EPSILON, 0.0, 0.0)) - sdf(position + vec3(-EPSILON, 0.0, 0.0)), \
    sdf(position + vec3(0.0, EPSILON, 0.0)) - sdf(position + vec3(0.0, -EPSILON, 0.0)), \
    sdf(position + vec3(0.0, 0.0, EPSILON)) - sdf(position + vec3(0.0, 0.0, -EPSILON))  \
))

#define RAYMARCH(sdf, rayOrigin, rayDirection) { \
    int stepCount = 128;                                        \
    float maximumDistance = 10.0;                               \
    float tt = 0.0;                                             \
    for (int i = 0; i < stepCount; i++) {                       \
        if (tt > maximumDistance) {                             \
            tt = 0.0;                                           \
            break;                                              \
        }                                                       \
        vec3 currentPosition = rayOrigin + rayDirection * tt;   \
        float d = sdf(currentPosition);                         \
        if (d < EPSILON) {                                      \
            break;                                              \
        }                                                       \
        tt += d;                                                \
    }                                                           \
    t = tt;                                                     \
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 filled(float distance, float linewidth, float antialias, vec4 fill) {
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

float arrowSdf(vec3 position, vec3 start, vec3 end, float baseRadius, float tipRadius, float tipHeight) {
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

float fieldArrowSdf(vec3 position) {
    vec3 dir = normalize(vParticleVel);

    float angle = atan(dir.y, dir.x);
    position = rotate(position, vec3(0.0, 0.0, 1.0), angle);
    float angleZ = -asin(dir.z);
    position = rotate(position, vec3(0.0, 1.0, 0.0), angleZ);

    float baseRadius = 0.1; 
    float tipRadius = 0.3;
    float tipHeight = 0.9;
    float cornerRadius = 0.05;
    vec3 start = vec3(1.0, 0.0, 0.0);
    vec3 end = vec3(-1.0, 0.0, 0.0);
    float d = arrowSdf(position, start, end, baseRadius, tipRadius, tipHeight);
    d -= cornerRadius;
    return d;
}

float particleArrowSdf(vec3 position) {
    vec3 dir = normalize(vParticleVel);

    float angle = atan(dir.y, dir.x);
    position = rotate(position, vec3(0.0, 0.0, 1.0), angle);
    float angleZ = -asin(dir.z);
    position = rotate(position, vec3(0.0, 1.0, 0.0), angleZ);

    float baseRadius = 0.3; 
    float tipRadius = 0.75;
    float tipHeight = 0.5;
    float cornerRadius = 0.05;
    vec3 start = vec3(1.0, 0.0, 0.0);
    vec3 end = vec3(-1.0, 0.0, 0.0);
    float d = arrowSdf(position, start, end, baseRadius, tipRadius, tipHeight);
    d -= cornerRadius;
    return d;
}

vec4 particleArrowColor(vec3 vel) {
    float velMax = max(16.0 * uAvgVelocity, 1.0);
    float saturation = 1.0;
    const float valueMax = 1.0;
    float value = valueMax;
    float velocity = length(vel)/velMax;
    if (velocity > 1.0) {
        velocity = 1.0;
        saturation = 0.0;
    }
    value = max(sqrt(velocity), 0.2);

    return vec4(hsv2rgb(vec3(0.8333 * velocity, saturation, value)), 1.0);
}

vec3 gParticleColor = vec3(0.0);
float particleSdf(vec3 position) {
    #if USE_PARTICLE_SPHEROW
        const float radius = 0.8;
        float d1 = length(position) - radius;
        float d2 = particleArrowSdf(position);
        if (d1 < d2) {
            gParticleColor = vParticleColor.rgb;
            return d1;
        } else {
            gParticleColor = particleArrowColor(vParticleVel).rgb;
            return d2;
        }
    #endif

    #if USE_PARTICLE_ARROW
        float d2 = fieldArrowSdf(position);
        gParticleColor = particleArrowColor(vParticleVel).rgb;
        return d2;
    #endif

    #if USE_PARTICLE_SPHERE
        float d1 = length(position) - radius;
        gParticleColor = vParticleColor.rgb;
        return d1;
    #endif
}

#define DIFFUSE_LIGHT (-2.75)
#define AMBIENT_LIGHT (0.1)

const vec3 diffuseLight = DIFFUSE_LIGHT * normalize(vec3(0.3, 1.0, 1.0));
const vec3 ambientLight = AMBIENT_LIGHT * normalize(vec3(31, 41, 53));

void particle3d() {
    vec3 targetPosition = vec3(0.0);

    vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
    mat3 eyeTransform = lookAtMatrix(cameraPosition, vParticlePos);
    rayOrigin = eyeTransform * rayOrigin;
    
    vec2 uv = gl_PointCoord.xy - vec2(0.5);
    vec3 rayDirection = normalize(vec3(uv, 1.5));
    mat3 cameraTransform = lookAtMatrix(rayOrigin, targetPosition);
    rayDirection = cameraTransform * rayDirection;

    float t = 0.0;
    RAYMARCH(particleSdf, rayOrigin, rayDirection);
    if (t <= 0.0) discard;

    // light
    vec3 position = rayOrigin + rayDirection * t;
    vec3 n = SURFACE_NORMAL(particleSdf, position);
    float diffuseAngle = max(dot(n, diffuseLight), 0.0);
    // diffuse
    vec3 color = gParticleColor * diffuseAngle;
    // ambient
    color += ambientLight * ((n.y + 1.0) * 0.5);
    // gamma
    color = sqrt(color);
    
    gl_FragColor = vec4(color, 1.0);
}

vec4 fieldColor(vec3 vel) {
    float velMax = max(uMaxFieldVel, 1e3);
    float saturation = 1.0;
    const float valueMax = 0.7;
    float velAbs = length(vel)/velMax;
    if (velAbs > 0.99) {
        velAbs = 1.0;
        saturation = 0.0;
    }
    float root = sqrt(velAbs);
    float value = valueMax * root;
    velAbs = root;
    return vec4(hsv2rgb(vec3(0.8333 * velAbs, saturation, value)), 1.0);
}

void field3d() {
    vec3 targetPosition = vec3(0.0);

    vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
    mat3 eyeTransform = lookAtMatrix(cameraPosition, vParticlePos);
    rayOrigin = eyeTransform * rayOrigin;
    
    vec2 uv = gl_PointCoord.xy - vec2(0.5);
    vec3 rayDirection = normalize(vec3(uv, 1.5));
    mat3 cameraTransform = lookAtMatrix(rayOrigin, targetPosition);
    rayDirection = cameraTransform * rayDirection;

    float t = 0.0;
    RAYMARCH(fieldArrowSdf, rayOrigin, rayDirection);
    if (t <= 0.0) discard;

    // light
    vec3 color = vec3(0.0);
    vec3 position = rayOrigin + rayDirection * t;
    vec3 n = SURFACE_NORMAL(fieldArrowSdf, position);
    float diffuseAngle = max(dot(n, diffuseLight), 0.0);
    // diffuse
    color = fieldColor(vParticleVel).rgb * diffuseAngle;
    // ambient
    color += ambientLight * ((n.y + 1.0) * 0.5);
    color = sqrt(color); // gamma

    gl_FragColor = vec4(color, 1.0);
}

void sphere2d() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv) - 0.5 + LINEWIDTH;
    gl_FragColor = filled(d, LINEWIDTH, ANTIALIAS, vParticleColor);
}

void arrow2d() {
    vec3 coordinates = vec3(gl_PointCoord.xy - vec2(0.5), 0.0);
    vec3 dir = normalize(vParticleVel);

    float angle = atan(dir.y, dir.x);
    mat4 rotZ = rotationMatrix(vec3(0.0, 0.0, -1.0), angle);
    coordinates = (rotZ * vec4(coordinates, 1.0)).xyz;

    vec4 color = fieldColor(vParticleVel);
    float d = arrowSdf(coordinates, vec3(-0.5,0.0,0.0), vec3(0.5,0.0,0.0), 0.02, 0.15, 0.4);
    gl_FragColor = filled(d, LINEWIDTH, ANTIALIAS, color);
}

void main() {
    if (vParticleType != PROBE) {        
        #if !USE_3D_SPHERE
            sphere2d();
        #else
            particle3d();
        #endif
    } else {
        #if !USE_3D_ARROW
            arrow2d();
        #else
            field3d();
        #endif
    }
}
`;
