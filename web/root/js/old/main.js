function main() {
	const cvs = document.querySelector("#viewport-canvas");
	const scaler = document.querySelector("#viewport-scaler");
	const wrapper = document.querySelector("#viewport-wrapper");
	const scalerWrapper = document.querySelector("#viewport-scaler-wrapper");
	const glWindow = new GLWindow(cvs, scaler, wrapper);
	if (glWindow != null) {
		const place = new Place(cvs, glWindow);
		scalerWrapper.addEventListener("click", ev => {
			place.click(ev);
		});
		scalerWrapper.addEventListener("scroll", ev => {
			glWindow.scroll(ev);
			glWindow.draw();
		});
		document.addEventListener("keydown", ev => {
			const zoom = glWindow.getZoom();
			switch (ev.keyCode) {
			case 189:
			case 173:
				ev.preventDefault();
				glWindow.setZoom(zoom - 0.08 * zoom);
				glWindow.draw();
				break;
			case 187:
			case 61:
				ev.preventDefault();
				glWindow.setZoom(zoom + 0.08 * zoom);
				glWindow.draw();
				break;
			}
		});
		window.addEventListener("resize", ev => {
			glWindow.updateViewScale();
			glWindow.draw();
		});
		place.get();
	}
}