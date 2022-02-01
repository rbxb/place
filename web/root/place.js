const LOCAL_MODE = false;
const LOCAL_IP_ADDRESS = "localhost:8080";

class Place {
	#loaded;
	#socket;
	#loadingp;
	#uiwrapper;
	#glWindow;

	constructor(glWindow) {
		this.#loaded = false;
		this.#socket = null;
		this.#loadingp = document.querySelector("#loading-p");
		this.#uiwrapper = document.querySelector("#ui-wrapper");
		this.#glWindow = glWindow;
	}

	initConnection() {
		this.#loadingp.innerHTML = "connecting";

		let host, wsProt, httpProt;
		if (LOCAL_MODE) {
			host = LOCAL_IP_ADDRESS;
			wsProt = "ws://";
			httpProt = "http://";
		} else {
			host = window.location.hostname;
			wsProt = "wss://";
			httpProt = "https://";
		}

		this.#connect(wsProt + host + "/ws");
		this.#loadingp.innerHTML = "downloading map";

		fetch(httpProt + host + "/place.png")
		.then(async resp => {
			if (!resp.ok) {
				console.error("Error downloading map.");
				return null;
			}

			let buf = await this.#downloadProgress(resp);
			await this.#setImage(buf);

			this.#loaded = true;
			this.#loadingp.innerHTML = "";
			this.#uiwrapper.setAttribute("hide", true);
		});
	}

	async #downloadProgress(resp) {
		let len = resp.headers.get("Content-Length");
		let a = new Uint8Array(len);
		let pos = 0;
		let reader = resp.body.getReader();
		while(true) {
			let {done, value} = await reader.read();
			if (value) {
				a.set(value, pos);
				pos += value.length;
				this.#loadingp.innerHTML = "downloading map " + Math.round(pos/len*100) + "%";
			}
			if(done) break;
		}
		return a;
	}

	#connect(path) {
		this.#socket = new WebSocket(path);

		const socketMessage = async (event) => {
			let b = await event.data.arrayBuffer();
    		this.#handleSocketSetPixel(b);
		};

		const socketClose = (event) => {
			this.#socket = null;
		};

		const socketError = (event) => {
			console.error("Error making WebSocket connection.");
			alert("Failed to connect.");
			this.#socket.close();
		};

		this.#socket.addEventListener("message", socketMessage);
		this.#socket.addEventListener("close", socketClose);
		this.#socket.addEventListener("error", socketError);
	}

	setPixel(x, y, color) {
		if (this.#socket != null && this.#socket.readyState == 1) {
			let b = new Uint8Array(11);
			this.#putUint32(b.buffer, 0, x);
			this.#putUint32(b.buffer, 4, y);
			for (let i = 0; i < 3; i++) {
				b[8+i] = color[i];
			}
			this.#socket.send(b);
			this.#glWindow.setPixelColor(x, y, color);
			this.#glWindow.draw();
		} else {
			alert("Disconnected.");
			console.error("Disconnected.");
		}
	}

	#handleSocketSetPixel(b) {
		if (this.#loaded) {
			let x = this.#getUint32(b, 0);
			let y = this.#getUint32(b, 4);
			let color = new Uint8Array(b.slice(8));
			this.#glWindow.setPixelColor(x, y, color);
			this.#glWindow.draw();
		}
	}

	async #setImage(data) {
		let img = new Image()
		let blob = new Blob([data], {type : "image/png"});
		let blobUrl = URL.createObjectURL(blob);
		img.src = blobUrl;
		let promise = new Promise((resolve, reject) => {
			img.onload = () => {
				this.#glWindow.setTexture(img);
				this.#glWindow.draw();
				resolve();
			};
			img.onerror = reject;
		});
		await promise;
	}

	#putUint32(b, offset, n) {
    	let view = new DataView(b);
    	view.setUint32(offset, n, false);
	}

	#getUint32(b, offset) {
		let view = new DataView(b);
		return view.getUint32(offset, false);
	}
}