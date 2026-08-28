(() => {
  const canvas = document.getElementById("fluid-bg");
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefersMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion) return;

  const gl =
    canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" }) ||
    canvas.getContext("experimental-webgl");

  if (!gl) return;

  document.body.classList.add("fluid-bg-active");

  const vertSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_aspect;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.02;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 p = uv;
      p.x *= u_aspect;

      vec2 m = u_mouse / u_resolution;
      m.x *= u_aspect;
      p += (m - p) * 0.14;

      float t = u_time * 0.12;

      vec2 q = vec2(
        fbm(p + vec2(0.0, t)),
        fbm(p + vec2(5.2, 1.3) + t * 0.85)
      );

      vec2 r = vec2(
        fbm(p + 3.5 * q + vec2(1.7, 9.2) + t * 0.55),
        fbm(p + 3.5 * q + vec2(8.3, 2.8) + t * 0.45)
      );

      float f = fbm(p + 3.0 * r);
      float swirl = length(q) * 0.22 + length(r) * 0.12;

      float hue = fract(f * 0.75 + swirl + t * 0.08 + p.x * 0.06);
      float sat = 0.72 + 0.18 * sin(t + f * 6.28318);
      float val = 0.82 + 0.12 * f;

      vec3 col = hsv2rgb(vec3(hue, sat, val));

      vec2 centered = uv - 0.5;
      centered.x *= u_aspect;
      float vignette = 1.0 - dot(centered, centered) * 0.55;
      col *= clamp(vignette, 0.55, 1.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Fluid background shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = compileShader(gl.VERTEX_SHADER, vertSource);
  const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSource);
  if (!vertShader || !fragShader) {
    document.body.classList.remove("fluid-bg-active");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Fluid background program error:", gl.getProgramInfoLog(program));
    document.body.classList.remove("fluid-bg-active");
    return;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    time: gl.getUniformLocation(program, "u_time"),
    mouse: gl.getUniformLocation(program, "u_mouse"),
    aspect: gl.getUniformLocation(program, "u_aspect"),
  };

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 0;
  let height = 0;
  let running = true;
  let start = performance.now();

  function setPointer(clientX, clientY) {
    pointer.targetX = clientX;
    pointer.targetY = height - clientY;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, prefersMobile ? 1.25 : 2);
    width = Math.floor(window.innerWidth * dpr);
    height = Math.floor(window.innerHeight * dpr);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.aspect, width / height);
  }

  window.addEventListener("resize", resize);
  window.addEventListener(
    "pointermove",
    (event) => {
      setPointer(event.clientX * (width / window.innerWidth), event.clientY * (height / window.innerHeight));
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      if (!event.touches[0]) return;
      const touch = event.touches[0];
      setPointer(touch.clientX * (width / window.innerWidth), touch.clientY * (height / window.innerHeight));
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      start = performance.now();
      requestAnimationFrame(render);
    }
  });

  resize();
  pointer.x = width * 0.5;
  pointer.y = height * 0.5;
  pointer.targetX = pointer.x;
  pointer.targetY = pointer.y;

  function render(now) {
    if (!running) return;

    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;

    gl.uniform1f(uniforms.time, (now - start) * 0.001);
    gl.uniform2f(uniforms.mouse, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
