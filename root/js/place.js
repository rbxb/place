function Place(cvs, glWindow) {
	var queue = [];
	var socket = null;
	this.init = function() {
		fetch("./wsaddr")
			.then(resp => resp.text())
			.then(addr => {
				connect(addr);
				return fetch("http://" + addr + "/place.png")
			})
			.then(resp => {
				if (!resp.ok) {
					alert("Failed to connect.");
					return;
				}
				return resp.arrayBuffer();
			})
			.then(buf => {
				setImage(new Uint8Array(buf));
				for (var i = 0; i < queue.length; i++) {
					const pixel = queue.unshift();
					glWindow.placePixel(pixel.x, pixel.y, pixel.color);
					glWindow.draw();
				}
				queue = null;
			});
	};
	var connect = function(socketaddr) {
		socket = new WebSocket("ws://" + socketaddr + "/ws");
		socket.addEventListener("message", async function(event) {
			const b = await event.data.arrayBuffer();
    		handleResponse(b);
		});
		socket.addEventListener("close", function(event) {
			socket = null;
		});
		socket.addEventListener("error", function(event) {
			alert("Failed to connect.");
			socket.close();
		});
	};
	this.put = function(x, y, color) {
		if (socket != null && socket.readyState == 1) {
			const b = new Uint8Array(11);
			putUint32(b.buffer, 0, x);
			putUint32(b.buffer, 4, y);
			for (var i = 0; i < 3; i++) {
				b[8+i] = color[i];
			}
			socket.send(b);
			glWindow.placePixel(x, y, color);
			glWindow.draw();
		} else {
			alert("Disconnected.");
			console.error("Not connected.");
		}
	};
	var handleResponse = function(b) {
		const x = getUint32(b, 0);
		const y = getUint32(b, 4);
		const color = new Uint8Array(b.slice(8));
		if (queue != null) {
			queue.push({x:x,y:y,color:color});
		} else {
			glWindow.placePixel(x, y, color);
			glWindow.draw();
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
	var putUint32 = function(b, offset, n) {
    	view = new DataView(b);
    	view.setUint32(offset, n, false);
	}
	var getUint32 = function(b, offset) {
		view = new DataView(b);
		return view.getUint32(offset, false);
	}
	return this;
}