function main() {
	const cvs = document.querySelector("#viewport-canvas");
	const glWindow = new GLWindow(cvs);
	if (glWindow != null) {
		const place = new Place(cvs, glWindow);
		place.init();
		var color = new Uint8Array([0,0,0]);

		var zoomIn = function() {
			const zoom = glWindow.getZoom();
			glWindow.setZoom(zoom * 1.2);
			glWindow.draw();
		};

		var zoomOut = function() {
			const zoom = glWindow.getZoom();
			glWindow.setZoom(zoom / 1.2);
			glWindow.draw();
		};

		document.addEventListener("keydown", ev => {
			switch (ev.keyCode) {
			case 189:
			case 173:
				ev.preventDefault();
				zoomOut();
				break;
			case 187:
			case 61:
				ev.preventDefault();
				zoomIn();
				break;
			}
		});

		window.addEventListener("wheel", ev => {
			var zoom = glWindow.getZoom();
			if (ev.deltaY > 0) {
					zoom /= 1.05;
				} else {
					zoom *= 1.05;
				}
			glWindow.setZoom(zoom);
			glWindow.draw();
		});

		document.querySelector("#zoom-in").addEventListener("click", () => {
			zoomIn();
		});
		document.querySelector("#zoom-out").addEventListener("click", () => {
			zoomOut();
		});

		window.addEventListener("resize", ev => {
			glWindow.updateViewScale();
			glWindow.draw();
		});

		var pickColor = function(pos) {
			color = glWindow.getColor(glWindow.click(pos));
			var hex = "#";
			for (var i = 0; i < color.length; i++) {
				var d = color[i].toString(16);
				if (d.length == 1) d = "0" + d;
				hex += d;
			}
			colorField.value = hex.toUpperCase();
			colorSwatch.style.backgroundColor = hex;
		};

		var drawPixel = function(pos) {
			pos = glWindow.click(pos);
			if (pos) {
				const oldColor = glWindow.getColor(pos);
				for (var i = 0; i < oldColor.length; i++) {
					if (oldColor[i] != color[i]) {
						place.put(pos.x, pos.y, color);
						break;
					}
				}
			}
		};

		var dragdown = false;
		cvs.addEventListener("mousedown", (ev) => {
			switch (ev.button) {
			case 0:
				dragdown = true;
				lastMovePos = {x:ev.clientX, y:ev.clientY};
				break;
			case 1:
				pickColor({x:ev.clientX,y:ev.clientY});
				break;
			case 2:
				if (ev.ctrlKey) {
					pickColor({x:ev.clientX,y:ev.clientY});
				} else {
					drawPixel({x:ev.clientX,y:ev.clientY});
				}
			}
		});
		document.addEventListener("mouseup", (ev) => {
			dragdown = false;
			document.body.style.cursor = "auto";
		});
		var lastMovePos = {x:0,y:0};
		document.addEventListener("mousemove", (ev) => {
			const movePos = {x:ev.clientX, y:ev.clientY};
			if (dragdown) {
				glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
				glWindow.draw();
				document.body.style.cursor = "grab";
			}
			lastMovePos = movePos;
		});

		var touchstartTime;
		cvs.addEventListener("touchstart", (ev) => {
			touchstartTime = (new Date()).getTime();
			lastMovePos = {x:ev.touches[0].clientX, y:ev.touches[0].clientY};
		});
		document.addEventListener("touchend", (ev) => {
			var elapsed = (new Date()).getTime() - touchstartTime;
			if (elapsed < 100) {
				drawPixel(lastMovePos);
			}
		});
		document.addEventListener("touchmove", (ev) => {
			const movePos = {x:ev.touches[0].clientX, y:ev.touches[0].clientY};
			glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
			glWindow.draw();
			lastMovePos = movePos;
		});

		cvs.addEventListener("contextmenu", () => {return false;});

		const colorField = document.querySelector("#color-field");
		const colorSwatch = document.querySelector("#color-swatch");
		colorField.addEventListener("change", ev => {
			var hex = colorField.value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
			hex = hex.substring(0,6);
			while (hex.length < 6) {
				hex += "0";
			}
			color[0] = parseInt(hex.substring(0,2), 16);
			color[1] = parseInt(hex.substring(2,4), 16);
			color[2] = parseInt(hex.substring(4,6), 16);
			hex = "#" + hex;
			colorField.value = hex;
			colorSwatch.style.backgroundColor = hex;
		});
	}
}