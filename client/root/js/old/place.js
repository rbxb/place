function Place(cvs, glWindow) {
	const responseTypeImage = 0;
	const responseTypeEvents = 1;
	const eventSize = 11;
	const headerSize = 5;
	var lastEventId = -1;
	var place = this;
	this.get = function() {
		const xhttp = new XMLHttpRequest();
		xhttp.open("GET", "api?i=" + lastEventId);
		xhttp.responseType = "arraybuffer";
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					const b = new Uint8Array(this.response);
					handleResponse(b);
					place.get()
				} else {
					setTimeout(() => {place.get()}, 3000);
				}
			}
		};
		xhttp.send();
	};
	this.put = function(x, y, color) {
		const b = new Uint8Array(eventSize);
		putUint32(b, 0, x);
		putUint32(b, 4, y);
		for (var i = 0; i < color.length; i++) {
			b[i+8] = color[i];
		}
		const xhttp = new XMLHttpRequest();
		xhttp.open("Put", "api");
		xhttp.send(b);
	};
	var handleResponse = function(b) {
		lastEventId = getUint32(b, 0);
		switch (b[4]) {
		case responseTypeImage:
			setImage(b.subarray(headerSize));
			break;
		case responseTypeEvents:
			const count = (b.length - headerSize) / eventSize;
			for (var i = 0; i < count; i++) {
				const pos = i * eventSize + headerSize;
				const x = getUint32(b, pos);
				const y = getUint32(b, pos + 4);
				const color = b.subarray(pos + 8, pos + 11);
				console.log(x + " " + y + " " + color.toString());
				glWindow.updateTexture(x, y, color);
				glWindow.draw();
			}
			break;
		}
	};
	var setImage = function(data) {
		const img = new Image()
		img.onload = function() {
			glWindow.setTexture(img);
			glWindow.draw();
		};
		const blob = new Blob([data], {type : "image/png"});
		const blobUrl = URL.createObjectURL(blob);
		img.src = blobUrl;
	}
	this.click = function(ev) {
		const rect = cvs.getBoundingClientRect();
		const texScale = glWindow.getTexScale();
		var pos = {
			x: (ev.clientX - rect.left) / rect.width,
			y: (ev.clientY - rect.top) / rect.height,
		};
		pos = glWindow.toTexCoords(pos);
		pos.x = Math.floor(pos.x * texScale.x);
		pos.y = Math.floor(pos.y * texScale.y);
		const color = [255,255,255,255];
		this.put(pos.x,pos.y,new Uint8Array(color));
	};
	var putUint32 = function(b, offset, n) {
    	view = new DataView(b.buffer);
    	view.setUint32(offset, n, false);
	}
	var getUint32 = function(b, offset) {
		view = new DataView(b.buffer)
		return view.getUint32(offset, false)
	}
	return this;
}