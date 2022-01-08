// ***************************************************
// ***************************************************
// GLSL code for the vertex shader
// Scales and rotates the quad
//
const viewportVertexShaderSource = `
	precision mediump float;
	attribute vec2 vert;
	uniform vec2 cam;
	uniform vec2 tex_scale;
	uniform vec2 view_scale;
	uniform float zoom;
	varying vec2 uv;
	void main() {
		uv = vert + 0.5;
		vec2 pos = ((vert * tex_scale - cam) * zoom) / view_scale;
		pos += 0.5;
		pos.y = 1.0 - pos.y;
		gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
	}
`;

// ***************************************************
// ***************************************************
// GLSL code for the fragment shader
// Paints the texture onto the quad
//
const viewportFragmentShaderSource = `
	precision mediump float;
	uniform sampler2D tex;
	varying vec2 uv;
	void main() {
		gl_FragColor = texture2D(tex, uv);
	}
`;

const GLWindow = (cvs) => {
	const gl = cvs.getContext("webgl");
	if (gl == null) {
		alert("Couldn't get WebGL context.");
		return null;
	}

	let program;
	let tex;
	let texFramebuffer;
	let tex_scale = {x:0,y:0};
	let cam_pos = {x:0,y:0};
	let zoom = 1;
	let camPos = {x:0.0,y:0.0};

	this.draw = () => {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	this.setTexture = (img) => {
		tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		texFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, texFramebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		tex_scale = {x:img.width, y:img.height};
		gl.uniform2f(u_tex_scale, tex_scale.x, tex_scale.y);
		if (cvs.width > cvs.height) {
			zoom = cvs.width / tex_scale.x;
		} else {
			zoom = cvs.height / tex_scale.y;
		}
		this.setZoom(zoom);
	}

	this.placePixel = (x, y, color) => {
		let rgba = new Uint8Array(4);
		rgba[3] = 255;
		for (let i = 0; i < color.length; i++) {
			rgba[i] = color[i];
		}
		gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
	}

	this.getColor = (pos) => {
		let rgba = new Uint8Array(4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, texFramebuffer);
		gl.readPixels(pos.x, pos.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
		return rgba.slice(0,3);
	}

	this.scroll = (ev) => {
		cam_pos = {x:ev.target.scrollLeft, y:ev.target.scrollTop}
		gl.uniform2f(u_cam, cam_pos.x, cam_pos.y);
	}

	this.move = (x, y) => {
		cam_pos.x -= x / zoom;
		cam_pos.y -= y / zoom;
		gl.uniform2f(u_cam, cam_pos.x, cam_pos.y);
	}

	this.setZoom = (z) => {
		if (z < 0.01) z = 0.01;
		if (z > 20) z = 20;
		zoom = z;
		gl.uniform1f(u_zoom, z);
	}

	this.getZoom = () => {
		return zoom;
	}

	this.updateViewScale = () => {
		let w = cvs.clientWidth;
		let h = cvs.clientHeight;
		cvs.width = w;
		cvs.height = h;
		gl.viewport(0, 0, w, h);
		gl.uniform2f(u_view_scale, w, h);
	}

	this.click = (pos) => {
		pos.x /= cvs.width;
		pos.y /= cvs.height;
		let a = {
			x: ((-0.5 * tex_scale.x - cam_pos.x) * zoom) / cvs.width + 0.5,
			y: ((-0.5 * tex_scale.y - cam_pos.y) * zoom) / cvs.height + 0.5,
		};
		let b = {
			x: ((0.5 * tex_scale.x - cam_pos.x) * zoom) / cvs.width + 0.5,
			y: ((0.5 * tex_scale.y - cam_pos.y) * zoom) / cvs.height + 0.5,
		};
		if (pos.x < a.x || pos.y < a.y || pos.x > b.x || pos.y > b.y) {
			return;
		}
		pos = {
			x: (pos.x - a.x) / (b.x - a.x) * tex_scale.x,
			y: (pos.y - a.y) / (b.y - a.y) * tex_scale.y,
		}
		return pos;
	}

	const toTexCoords = (pos) => {
		pos.x = Math.floor(pos.x * tex_scale.x);
		pos.y = Math.floor(pos.y * tex_scale.y);
		return pos;
	}

	const createProgram = (vertexShader, fragmentShader) => {
		program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program));
			return null;
		}
		gl.useProgram(program);
	}

	const compileShader = (type, source) => {
		let shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	const createPosAttribute = () => {
		let buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		let positions = [
			-0.5,-0.5,
			 0.5,-0.5,
			 0.5, 0.5,
			-0.5,-0.5,
			 0.5, 0.5,
			-0.5, 0.5,
		];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		a_vert = gl.getAttribLocation(program, 'vert');
		gl.vertexAttribPointer(a_vert, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_vert);
	}

	const createUniforms = () => {
		u_cam = gl.getUniformLocation(program, 'cam');
		u_tex_scale = gl.getUniformLocation(program, 'tex_scale');
		u_view_scale = gl.getUniformLocation(program, 'view_scale');
		u_zoom = gl.getUniformLocation(program, 'zoom');
	}

	const vertexShader = compileShader(gl.VERTEX_SHADER, viewportVertexShaderSource);
	const fragmentShader = compileShader(gl.FRAGMENT_SHADER, viewportFragmentShaderSource);

	createProgram(vertexShader, fragmentShader);
	createPosAttribute();
	createUniforms();
	this.updateViewScale();
	gl.clearColor(0.0,0.0,0.0,0.0);

	return this;
}