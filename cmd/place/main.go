package main

import (
	"flag"
	"image"
	"image/draw"
	"image/png"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"github.com/rbxb/place"
)

var port string
var loadPath string
var savePath string
var width int
var height int
var count int
var saveInterval int

func init() {
	flag.StringVar(&port, "port", ":8080", "The address and port the fileserver listens at.")
	flag.StringVar(&loadPath, "load", "", "The png to load as the canvas.")
	flag.StringVar(&savePath, "save", "./place.png", "The path to save the canvas.")
	flag.IntVar(&width, "width", 1024, "The width to create the canvas.")
	flag.IntVar(&height, "height", 1024, "The height to create the canvas.")
	flag.IntVar(&count, "count", 128, "The maximum number of connections.")
	flag.IntVar(&saveInterval, "sinterval", 180, "Save interval in seconds.")
}

func main() {
	flag.Parse()
	var img draw.Image
	if loadPath == "" {
		nrgba := image.NewNRGBA(image.Rect(0, 0, width, height))
		for i := range nrgba.Pix {
			nrgba.Pix[i] = 255
		}
		img = nrgba
	} else {
		img = loadImage(loadPath)
	}
	sv := place.NewServer(img, count)
	defer ioutil.WriteFile(savePath, sv.GetImageBytes(), 0644)
	go func() {
		for {
			ioutil.WriteFile(savePath, sv.GetImageBytes(), 0644)
			time.Sleep(time.Second * time.Duration(saveInterval))
		}
	}()
	http.ListenAndServe(port, sv)
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
