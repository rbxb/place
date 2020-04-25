package placeserver

import (
	"image"
	"image/color"
)

type placeImage struct {
	pixels        []byte
	width, height int
}

func newPlaceImage(width, height int) *placeImage {
	return &placeImage{
		width:  width,
		height: height,
		pixels: make([]byte, width*height*3),
	}
}

func (img *placeImage) ColorModel() color.Model {
	return color.NRGBAModel
}

func (img *placeImage) Bounds() image.Rectangle {
	return image.Rectangle{
		Min: image.Point{0, 0},
		Max: image.Point{img.width, img.height},
	}
}

func (img *placeImage) At(x, y int) color.Color {
	pos := (img.width*y + x) * 3
	return color.NRGBA{
		R: img.pixels[pos+0],
		G: img.pixels[pos+1],
		B: img.pixels[pos+2],
		A: 0xFF,
	}
}

func (img *placeImage) Set(x, y int, b []byte) {
	pos := (img.width*y + x) * 3
	copy(img.pixels[pos:], b)
}
