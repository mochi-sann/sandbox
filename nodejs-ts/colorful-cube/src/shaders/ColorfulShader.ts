export const ColorfulShader = {
  uniforms: {
    u_time: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float u_time;
    varying vec3 vPosition;
    void main() {
      vec3 color = vec3(
        sin(vPosition.x + u_time),
        sin(vPosition.y + u_time),
        sin(vPosition.z + u_time)
      );
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
