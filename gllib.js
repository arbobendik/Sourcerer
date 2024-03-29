'use strict';
export class GLLib {

  static postVertex = `#version 300 es
  in vec2 position_2d;
  // Pass clip space position to fragment shader
  out vec2 clip_space;
  void main() {
    vec2 pos = position_2d * 2.0 - 1.0;
    // Set final clip space position
    gl_Position = vec4(pos, 0, 1);
    clip_space = position_2d;
  }
  `;

  static computeVertex = `#version 300 es
  in vec4 position;
  void main() {
    gl_Position = position;
  }`;

  static compile = (gl, vertex, fragment) => {
    var shaders = [
      { source: vertex, type: gl.VERTEX_SHADER },
      { source: fragment, type: gl.FRAGMENT_SHADER }
    ];
    // Create Program, compile and append vertex and fragment shader to it.
    let program = gl.createProgram();
    // Compile GLSL shaders.
    shaders.forEach(async (item) => {
      let shader = gl.createShader(item.type);
      gl.shaderSource(shader, item.source);
      gl.compileShader(shader);
      // Append shader to Program if GLSL compiled successfully.
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.attachShader(program, shader);
      } else {
        // Log debug info and delete shader if shader fails to compile.
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
      }
    });

    gl.linkProgram(program);
    // Return program if it links successfully.
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // Log debug info and delete Program if Program fails to link.
      console.warn(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
    } else {
      return program;
    }
  };

  static initShaderObj = (gl, obj) => {
    // Create buffer to provide two vertices to vertex shader.
    obj.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array ([- 1 , - 1, 1, - 1, - 1, 1, - 1, 1, 1, - 1, 1, 1]), gl.STATIC_DRAW);
    // Create vertex array object.
    obj.vao = gl.createVertexArray();
    obj.framebuffer = gl.createFramebuffer();
    gl.bindVertexArray(obj.vao);
    // Tell WebGl how to draw vertices.
    gl.enableVertexAttribArray(obj.positionLocation);
    gl.vertexAttribPointer(obj.positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  static setTexParams = (gl) => {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  static setByteTexture = (gl, array, width, height) => {
    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, array);
    GLLib.setTexParams(gl);
    return tex;
  };

  // Convert 4 bytes, texture channels to usable float.
  static BytesToFloats = (bytes) => {
    let buffer = new ArrayBuffer(bytes.length);
    let byteArray = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) byteArray[i] = bytes[i];
    return new Float32Array(buffer);
  }

  // Split float into 4 8-bit texture channels.
  static FloatsToBytes = (floats) => {
    let buffer = new ArrayBuffer(floats.length * 4);
    let floatArray = new Float32Array(buffer);
    for (let i = 0; i < floats.length; i++) floatArray[i] = floats[i];
    return new Uint8Array(buffer);
  };
}