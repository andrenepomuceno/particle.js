export const particleVertexShader = /* glsl */ `
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

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = r * cameraConstant / (- mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    if (vType == PROBE) {
        vec3 vel = texture2D( textureVelocity, uv ).xyz;
        vVelocity = vel;
    }
    
    vColor = vec4(color, 1.0);
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

#define UNDEFINED -1.0
#define DEFAULT 0.0
#define PROBE 1.0
#define FIXED 2.0

const float linewidth = 0.05;
const float antialias = 0.01;

varying vec4 vColor;
flat varying float vType;
flat varying vec3 vVelocity;

float sdArrow(vec3 p) {
    float d1 = sdCylinder(p, vec3(-(0.5 - linewidth),0.0,0.0), vec3(0.1,0.0,0.0), linewidth);
    float d2 = sdCone(p, vec3(0.1,0.0,0.0), vec3(0.5 - linewidth,0.0,0.0), 0.2, 0.0);
    return min(d1, d2);
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

void main() {
    if (vType != PROBE) {        
        float d = length(gl_PointCoord - vec2(0.5)) - (0.5 - linewidth);
        gl_FragColor = filled(d, linewidth, antialias, vColor);
    } else {
        vec3 coordinates = vec3(gl_PointCoord.xy - vec2(0.5), 0.0);
        vec3 dir = normalize(vVelocity);
        coordinates = mat3(dir.x, dir.y, 0, -dir.y, dir.x, 0, 0, 0, 1) * coordinates; // rotate

        vec4 color = velocityColor(vVelocity);
        float d = sdArrow(coordinates);
        gl_FragColor = filled(d, linewidth, antialias, color);
    }
}
`;

