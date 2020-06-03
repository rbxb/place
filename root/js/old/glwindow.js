const viewportVertexShaderSource = `
	precision mediump float;
	attribute vec2 vert;
	uniform vec2 cam;
	uniform vec2 scale;
	varying vec2 uv;
	void main() {
		uv = vert;
		vec2 pos = vert * scale - cam;
		pos.y = 1.0 - pos.y;
		gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
	}
`;

const viewportFragmentShaderSource = `
	precision mediump float;
	uniform sampler2D tex;
	varying vec2 uv;
	void main() {
		gl_FragColor = texture2D(tex, uv);
	}
`;

function GLWindow(cvs, scaler, wrapper) {
	const gl = cvs.getContext("webgl");
	if (gl == null) {
		alert("Couldn't get WebGL context.");
		return null;
	}
	var program;
	var tex;
	var texScale = {x:0.0,y:0.0};
	var viewScale = {x:0.0,y:0.0};
	var zoom = 100;
	var camPos = {x:0.0,y:0.0};
	this.draw = function() {
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	};
	this.getViewScale = function() {
		return viewScale;
	};
	this.getTexScale = function() {
		return texScale;
	};
	this.setTexture = function(img) {
		tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		texScale = {x:img.width,y:img.height};
		this.updateViewScale();
	};
	this.updateTexture = function(x, y, color) {
		for (var j = 0; j < data.length; j+=4) {
			if (x >= texScale.x) {
				y++;
				x = 0;
			}
			if (y >= texScale.y) break;
			console.log(color);
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);
		}
	}
	this.scroll = function(ev) {
		camPos.x = ev.target.scrollLeft;
		camPos.y = ev.target.scrollTop;
		gl.uniform2f(u_cam, camPos.x / viewScale.x, camPos.y / viewScale.y);
	};
	this.setZoom = function(percent) {
		zoom = percent;
		if (zoom < 1) zoom = 1;
		if (zoom > 2000) zoom = 2000;
		const fit = calcFit();
		scaler.style.width = texScale.x * fit * zoom * 0.01 + "px";
		scaler.style.height = texScale.y * fit * zoom * 0.01 + "px";
		updateScale();
	}
	this.getZoom = function() {
		return zoom;
	}
	this.toTexCoords = function(v) {
		const fit = calcFit();
		const x = (v.x * viewScale.x + camPos.x) / (texScale.x * zoom * 0.01 * fit);
		const y = (v.y * viewScale.y + camPos.y) / (texScale.y * zoom * 0.01 * fit);
		return {x:x,y:y};
	}
	this.toScreenCoords = function(v) {
		const fit = calcFit();
		const x = v.x * texScale.x * zoom * 0.01 * fit / viewScale.x - camPos.x;
		const y = v.y * texScale.y * zoom * 0.01 * fit / viewScale.y - camPos.y;
		return {x:x,y:y};
	}
	this.updateViewScale = function() {
		var w = cvs.clientWidth;
		var h = cvs.clientHeight;
		viewScale.x = w;
		viewScale.y = h;
		cvs.width = w;
		cvs.height = h;
		gl.viewport(0, 0, w, h);
		updateScale();
	};
	var createProgram = function(vertexShader, fragmentShader) {
		program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program));
			return null;
		}
		gl.useProgram(program);
	};
	var compileShader = function(type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	};
	var calcFit = function() {
		if (viewScale.x > viewScale.y) {
			return viewScale.y / texScale.y;
		} else {
			return viewScale.x / texScale.y;
		}
	}
	var createPosAttribute = function() {
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		const positions = [
			0,0,
			1,0,
			1,1,
			0,0,
			1,1,
			0,1,
		];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		a_vert = gl.getAttribLocation(program, 'vert');
		gl.vertexAttribPointer(a_vert, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_vert);
	};
	var createUniforms = function() {
		u_cam = gl.getUniformLocation(program, 'cam');
		u_scale = gl.getUniformLocation(program, 'scale');
	};
	var updateScale = function() {
		const fit = calcFit();
		gl.uniform2f(u_scale,
			texScale.x * zoom * 0.01 * fit / viewScale.x,
			texScale.y * zoom * 0.01 * fit / viewScale.y);
	}
	const vertexShader = compileShader(gl.VERTEX_SHADER, viewportVertexShaderSource);
	const fragmentShader = compileShader(gl.FRAGMENT_SHADER, viewportFragmentShaderSource);
	createProgram(vertexShader, fragmentShader);
	createPosAttribute();
	createUniforms();
	this.setZoom(100);
	gl.clearColor(0.0,0.0,0.0,0.0);
	return this;
}