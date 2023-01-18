package main

import (
	"flag"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"math"
	"os"
)

var loadPath string
var tolerance int

func init() {
	flag.StringVar(&loadPath, "load", "./place.png", "The canvas to clean.")
	flag.IntVar(&tolerance, "tolerance", 2, "Pixels with fewer neighbors will be cleared.")
}

var searchX = []int{1, 1, 0, -1, -1, -1, 0, 1}
var searchY = []int{0, 1, 1, 1, 0, -1, -1, -1}

func main() {
	flag.Parse()
	img := loadImage(loadPath)
	rect := img.Bounds()
	width := rect.Max.X - rect.Min.X
	height := rect.Max.Y - rect.Min.Y
	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			c := img.At(x, y)
			if isWhite(c) == 0 {
				ok := false
				for i := range searchX {
					if posOk(x+searchX[i], y+searchY[i], width, height) {
						c2 := img.At(x+searchX[i], y+searchY[i])
						if difference(c, c2) < 30000 {
							ok = true
							break
						}
					}
				}
				if !ok {
					img.Set(x, y, color.NRGBA{255, 255, 255, 255})
				}
			}
		}
	}
	for i := 0; i < 2; i++ {
		for x := 0; x < width; x++ {
			for y := 0; y < height; y++ {
				c := img.At(x, y)
				if isWhite(c) == 0 {
					white := 0
					for i := range searchX {
						if posOk(x+searchX[i], y+searchY[i], width, height) {
							c2 := img.At(x+searchX[i], y+searchY[i])
							white += isWhite(c2)
						} else {
							white++
						}
					}
					if white > 6 {
						img.Set(x, y, color.NRGBA{255, 255, 255, 255})
					}
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

func difference(c, c2 color.Color) float64 {
	r, g, b, _ := c.RGBA()
	r2, g2, b2, _ := c2.RGBA()
	dr := math.Abs(float64(r - r2))
	dg := math.Abs(float64(g - g2))
	db := math.Abs(float64(b - b2))
	return math.Max(math.Max(dr, dg), db)
}

func posOk(x, y, width, height int) bool {
	return 0 <= x && x < width && 0 <= y && y < height
}

func isWhite(c color.Color) int {
	r, g, b, _ := c.RGBA()
	if r == 0xffff && g == 0xffff && b == 0xffff {
		return 1
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
