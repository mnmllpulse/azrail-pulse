uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Noise functions for continental landmass shapes
float hash(vec3 p) {
    p = fract(p * vec3(.1031, .1030, .0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = p * 2.02;
        a *= 0.5;
    }
    return v;
}

void main() {
    // Normalized position on sphere surface
    vec3 normPos = normalize(vPosition);
    
    // Spherical coordinates for Latitude & Longitude grid (Image 3 Wireframe Globe)
    float lat = asin(clamp(normPos.y, -1.0, 1.0));
    float lon = atan(normPos.z, normPos.x);
    
    // Crisp wireframe grid lines
    float latGrid = abs(sin(lat * 16.0));
    float lonGrid = abs(sin(lon * 24.0));
    float gridLine = smoothstep(0.95, 0.985, latGrid) + smoothstep(0.95, 0.985, lonGrid);
    gridLine = clamp(gridLine, 0.0, 1.0);
    
    // Major Equator & Prime Meridian accent lines
    float equator = smoothstep(0.98, 0.995, abs(sin(lat * 2.0)));
    float primeMeridian = smoothstep(0.98, 0.995, abs(sin(lon * 2.0)));
    float majorLines = clamp(equator + primeMeridian, 0.0, 1.0);

    // Procedural Continental Landmasses (Image 3 geography)
    vec3 spherePos = normPos * 3.2;
    float landNoise = fbm(spherePos + vec3(0.0, uTime * 0.015, 0.0));
    float continent = smoothstep(0.48, 0.53, landNoise);
    
    // Glowing Coastline Outlines
    float coastline = smoothstep(0.46, 0.495, landNoise) - smoothstep(0.495, 0.53, landNoise);
    coastline = max(coastline, 0.0);

    // Color Palette (Purple ecosystem theme from Image 2)
    vec3 voidBlack   = vec3(0.015, 0.008, 0.035);  // Deep space core
    vec3 darkPurple  = vec3(0.08, 0.02, 0.16);     // Dark violet surface
    vec3 landViolet  = vec3(0.20, 0.07, 0.42);     // Continental landmass
    vec3 neonPurple  = vec3(0.68, 0.32, 0.98);     // Electric Purple (#a855f7)
    vec3 brightCyan  = vec3(0.35, 0.82, 1.0);      // High-tech Accent (#38bdf8)
    vec3 glowWhite   = vec3(0.95, 0.92, 1.0);      // Crisp highlight

    // Compose base sphere
    vec3 color = mix(voidBlack, darkPurple, 0.6);
    color = mix(color, landViolet, continent * 0.75);
    
    // Add glowing grid lines
    color += neonPurple * gridLine * 0.7;
    color += brightCyan * majorLines * 0.9;
    
    // Add glowing continental coastlines
    color += mix(neonPurple, brightCyan, 0.4) * coastline * 1.8;
    
    // Pulsing node dots at grid intersections
    float intersection = smoothstep(0.98, 0.998, latGrid) * smoothstep(0.98, 0.998, lonGrid);
    color += brightCyan * intersection * 3.0;

    // Fresnel / Rim Lighting (Deep Purple Cosmic Halo from Image 2)
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
    float rim = pow(fresnel, 3.8);
    
    vec3 rimColor = mix(neonPurple, brightCyan, 0.25);
    color += rimColor * rim * 2.2;

    gl_FragColor = vec4(color, 1.0);
}
