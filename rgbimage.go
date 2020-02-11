package main

import (
	"image"
	"image/color"
)

type rgbImage struct {
	pixels        []byte
	width, height int
}

func newRGBAImage(width, height int) *rgbImage {
	img := &rgbImage{
		width:  width,
		height: height,
		pixels: make([]byte, width*height*4),
	}
	for i := 3; i < len(img.pixels); i += 4 {
		img.pixels[i] = 0xFF
	}
	return img
}

func (img *rgbImage) ColorModel() color.Model {
	return color.NRGBAModel
}

func (img *rgbImage) Bounds() image.Rectangle {
	return image.Rectangle{
		Min: image.Point{0, 0},
		Max: image.Point{img.width, img.height},
	}
}

func (img *rgbImage) At(x, y int) color.Color {
	pos := (img.width*y + x) * 4
	return color.NRGBA{
		R: img.pixels[pos+0],
		G: img.pixels[pos+1],
		B: img.pixels[pos+2],
		A: img.pixels[pos+3],
	}
}
