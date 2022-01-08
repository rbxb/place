const LOCAL_MODE = false;
const LOCAL_IP_ADDRESS = "localhost:8080"

const Place = (cvs, glWindow) => {
	let loaded = false;
	let socket = null;
	let loadingp = document.querySelector("#loading-p");
	let uiwrapper = document.querySelector("#ui-wrapper");

	this.init = () => {
		loadingp.innerHTML = "connecting";

		let host, wsProt, httpProt;
		if (LOCAL_MODE) {
			host = LOCAL_IP_ADDRESS;
			wsProt = "ws://";
			httpProt = "http://"
		} else {
			host = window.location.hostname;
			wsProt = "wss://";
			httpProt = "https://"
		}

		connect(wsProt + host + "/ws");
		loadingp.innerHTML = "downloading map";
		fetch(httpProt + host + "/place.png")
		.then(resp => {
			if (!resp.ok) {
				console.error("Error downloading map.");
				return null;
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
	}

	const downloadProgress = async (resp) => {
		let len = resp.headers.get("Content-Length");
		let a = new Uint8Array(len);
		let pos = 0;
		let reader = resp.body.getReader();
		while(true) {
			let {done, value} = await reader.read();
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

	const connect = (path) => {
		socket = new WebSocket(path);
		socket.addEventListener("message", async function(event) {
			let b = await event.data.arrayBuffer();
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
	}

	this.put = (x, y, color) => {
		if (socket != null && socket.readyState == 1) {
			let b = new Uint8Array(11);
			putUint32(b.buffer, 0, x);
			putUint32(b.buffer, 4, y);
			for (let i = 0; i < 3; i++) {
				b[8+i] = color[i];
			}
			socket.send(b);
			glWindow.placePixel(x, y, color);
			glWindow.draw();
		} else {
			alert("Disconnected.");
			console.error("Disconnected.");
		}
	}

	const handleSetPixel = (b) => {
		if (loaded) {
			let x = getUint32(b, 0);
			let y = getUint32(b, 4);
			let color = new Uint8Array(b.slice(8));
			glWindow.placePixel(x, y, color);
			glWindow.draw();
		}
	}

	const setImage = (data) => {
		let img = new Image()
		let blob = new Blob([data], {type : "image/png"});
		let blobUrl = URL.createObjectURL(blob);
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

	const putUint32 = (b, offset, n) => {
    	let view = new DataView(b);
    	view.setUint32(offset, n, false);
	}

	const getUint32 = (b, offset) => {
		let view = new DataView(b);
		return view.getUint32(offset, false);
	}

	return this;
}