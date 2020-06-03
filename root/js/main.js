function main() {
	const cvs = document.querySelector("#viewport-canvas");
	const glWindow = new GLWindow(cvs);
	if (glWindow != null) {
		const place = new Place(cvs, glWindow);
		var color = new Uint8Array([0,0,0]);
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
		document.addEventListener("keydown", ev => {
			const zoom = glWindow.getZoom();
			switch (ev.keyCode) {
			case 189:
			case 173:
				ev.preventDefault();
				glWindow.setZoom(zoom / 1.2);
				glWindow.draw();
				break;
			case 187:
			case 61:
				ev.preventDefault();
				glWindow.setZoom(zoom * 1.2);
				glWindow.draw();
				break;
			}
		});
		document.addEventListener('gestureend', function(e) {
			alert(e.scale);
		    if (e.scale < 1.0) {
		    	var zoom = glWindow.getZoom();
		        zoom /= 1.1;
		        glWindow.setZoom(zoom);
				glWindow.draw();
		    } else if (e.scale > 1.0) {
		    	var zoom = glWindow.getZoom();
		        zoom *= 1.1;
		        glWindow.setZoom(zoom);
				glWindow.draw();
		    }
		}, false);
		window.addEventListener("resize", ev => {
			glWindow.updateViewScale();
			glWindow.draw();
		});
		var mousedown = false;
		cvs.addEventListener("mousedown", (ev) => {
			if (ev.button == 0) {
				mousedown = true;
			}
		});
		cvs.addEventListener("contextmenu", () => {return false;});
		document.addEventListener("mouseup", (ev) => {
			ev.preventDefault;
			if (ev.button == 0) {
				mousedown = false;
				document.body.style.cursor = "auto";
			} else if (ev.button == 1 || (ev.button == 2 && ev.ctrlKey)) {
				color = glWindow.getColor(glWindow.click(ev));
				var hex = "#";
				for (var i = 0; i < color.length; i++) {
					var d = color[i].toString(16);
					if (d.length == 1) d = "0" + d;
					hex += d;
				}
				colorField.value = hex.toUpperCase();
				colorSwatch.style.backgroundColor = hex;
			} else if (ev.button == 2) {
				const pos = glWindow.click(ev);
				if (pos) {
					place.put(pos.x, pos.y, color);
				}
			}
		});
		var lastMovePos = {x:0,y:0};
		document.addEventListener("mousemove", (ev) => {
			const movePos = {x:ev.clientX, y:ev.clientY};
			if (mousedown) {
				glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
				glWindow.draw();
				document.body.style.cursor = "grab";
			}
			lastMovePos = movePos;
		});
		place.init();
	}
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