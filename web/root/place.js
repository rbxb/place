function Place(cvs, glWindow) {
	var loaded = false;
	var socket = null;
	var loadingp = document.querySelector("#loading-p");
	var uiwrapper = document.querySelector("#ui-wrapper");
	this.init = function() {
		loadingp.innerHTML = "connecting";
		connect("wss://" + window.location.hostname + "/ws");
		loadingp.innerHTML = "downloading map";
		fetch("https://" + window.location.hostname + "/place.png")
		.then(resp => {
			if (!resp.ok) {
				console.error("Error downloading map.");
				return;
			}
			return downloadProgress(resp);
		})
		.then(buf => {
			loadingp.innerHTML = "";
			setImage(buf).then(()=>{
				loaded = true;
				uiwrapper.setAttribute("hide", true);
			});
		});
	};
	var downloadProgress = async function(resp) {
		const len = resp.headers.get("Content-Length");
		const a = new Uint8Array(len);
		var pos = 0;
		const reader = resp.body.getReader();
		while(true) {
			const {done, value} = await reader.read();
			if (value) {
				a.set(value, pos);
				pos += value.length;
				loadingp.innerHTML = "downloading map " + Math.round(pos/len*100) + "%";
			}
			if(done) {
				break;
			}
		}
		return a;
	}
	var connect = function(path) {
		socket = new WebSocket(path);
		socket.addEventListener("message", async function(event) {
			const b = await event.data.arrayBuffer();
    		handleSetPixel(b);
		});
		socket.addEventListener("close", function(event) {
			socket = null;
		});
		socket.addEventListener("error", function(event) {
			console.error("Error making WebSocket connection.");
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
			console.error("Disconnected.");
		}
	};
	var handleSetPixel = function(b) {
		if (loaded) {
			const x = getUint32(b, 0);
			const y = getUint32(b, 4);
			const color = new Uint8Array(b.slice(8));
			glWindow.placePixel(x, y, color);
			glWindow.draw();
		}
	};
	var setImage = function(data) {
		const img = new Image()
		const blob = new Blob([data], {type : "image/png"});
		const blobUrl = URL.createObjectURL(blob);
		img.src = blobUrl;
		return new Promise((resolve, reject) => {
			img.onload = ()=>{
				glWindow.setTexture(img);
				glWindow.draw();
				resolve();
			};
			img.onerror = reject;
		});
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