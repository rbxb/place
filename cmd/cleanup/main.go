package main

import (
	"flag"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"os"
)

var loadPath string

func init() {
	flag.StringVar(&loadPath, "load", "./place.png", "The canvas to clean.")
}

func main() {
	flag.Parse()
	img := loadImage(loadPath)
	rect := img.Bounds()
	width := rect.Max.X - rect.Min.X
	height := rect.Max.Y - rect.Min.Y
	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			if isWhite(x, y, width, height, img) == 0 {
				count := 8
				count -= isWhite(x+1, y+0, width, height, img)
				count -= isWhite(x+1, y+1, width, height, img)
				count -= isWhite(x+0, y+1, width, height, img)
				count -= isWhite(x-1, y+1, width, height, img)
				count -= isWhite(x-1, y+0, width, height, img)
				count -= isWhite(x-1, y-1, width, height, img)
				count -= isWhite(x+0, y-1, width, height, img)
				count -= isWhite(x+1, y-1, width, height, img)
				if count < 3 {
					img.Set(x, y, color.NRGBA{255, 255, 255, 255})
				}
			}
		}
	}
	f, err := os.OpenFile(loadPath+".cleaned.png", os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}
	png.Encode(f, img)
	f.Close()
}

func isWhite(x, y, width, height int, img image.Image) int {
	if 0 <= x && x < width && 0 <= y && y < height {
		r, g, b, _ := img.At(x, y).RGBA()
		if r == 0xffff && g == 0xffff && b == 0xffff {
			return 1
		}
	}
	return 0
}

func loadImage(loadPath string) draw.Image {
	f, err := os.Open(loadPath)
	defer f.Close()
	if err != nil {
		panic(err)
	}
	pngimg, err := png.Decode(f)
	if err != nil {
		panic(err)
	}
	return pngimg.(draw.Image)
}
