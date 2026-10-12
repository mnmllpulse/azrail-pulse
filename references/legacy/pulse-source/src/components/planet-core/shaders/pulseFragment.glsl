uniform float uTime;
varying vec2 vUv;

// ECG Pulse Shape
float ecg(float x, float t) {
    float x1 = fract(x - t * 0.5);
    float pulse = 0.0;
    
    // Base line
    pulse += 0.01;
    
    // The sharp ECG peaks
    float p1 = smoothstep(0.45, 0.46, x1) * smoothstep(0.47, 0.46, x1);
    float p2 = smoothstep(0.48, 0.50, x1) * smoothstep(0.52, 0.50, x1);
    float p3 = smoothstep(0.53, 0.54, x1) * smoothstep(0.55, 0.54, x1);
    
    pulse += p1 * 0.2 * sin(x * 100.0);
    pulse += p2 * 0.8 * sin(x * 200.0);
    pulse += p3 * 0.3 * sin(x * 150.0);
    
    return pulse;
}

void main() {
    // Sharp ECG Line
    vec2 uv = vUv;
    float t = uTime * 1.5;
    
    // Wave movement
    float x = uv.x;
    float ecgLine = 0.5;
    
    // Multiple periodic spikes for that ECG look
    float period = 1.0;
    float localT = mod(t, period);
    
    // The "P-QRS-T" complex
    float complexX = fract(x - t * 0.1); 
    
    float pulse = 0.0;
    
    // P wave
    pulse += 0.05 * exp(-pow(complexX - 0.2, 2.0) * 1000.0);
    // QRS complex
    pulse -= 0.1 * exp(-pow(complexX - 0.38, 2.0) * 2000.0);
    pulse += 0.8 * exp(-pow(complexX - 0.4, 2.0) * 4000.0);
    pulse -= 0.2 * exp(-pow(complexX - 0.42, 2.0) * 2000.0);
    // T wave
    pulse += 0.15 * exp(-pow(complexX - 0.6, 2.0) * 500.0);
    
    ecgLine += pulse;
    
    float dist = abs(uv.y - ecgLine);
    
    // VERY Sharp line
    float line = smoothstep(0.008, 0.0, dist);
    // Glows
    float glow = exp(-dist * 40.0) * 0.8;
    float bloom = exp(-dist * 12.0) * 0.4;
    
    vec3 color = vec3(0.75, 0.45, 1.0);
    float edgeFade = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
    
    vec3 finalColor = color * (line * 2.0 + glow + bloom);
    float finalAlpha = (line + glow + bloom) * edgeFade;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
}
