package main

import (
	"crypto/tls"
	"flag"
	"image"
	"image/draw"
	"image/png"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/rbxb/httpfilter"
	"github.com/rbxb/place"
)

var port string
var root string
var loadPath string
var savePath string
var logPath string
var width int
var height int
var count int
var saveInterval int

func init() {
	flag.StringVar(&port, "port", ":8080", "The address and port the fileserver listens at.")
	flag.StringVar(&root, "root", "./root", "The directory serving files.")
	flag.StringVar(&loadPath, "load", "", "The png to load as the canvas.")
	flag.StringVar(&savePath, "save", "./place.png", "The path to save the canvas.")
	flag.StringVar(&logPath, "log", "", "The log file to write to.")
	flag.IntVar(&width, "width", 1024, "The width to create the canvas.")
	flag.IntVar(&height, "height", 1024, "The height to create the canvas.")
	flag.IntVar(&count, "count", 64, "The maximum number of connections.")
	flag.IntVar(&saveInterval, "sinterval", 180, "Save interval in seconds.")
}

func main() {
	flag.Parse()
	if logPath != "" {
		f, err := os.OpenFile("place.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal(err)
		}
		defer f.Close()
		log.SetOutput(f)
	}
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
	placeSv := place.NewServer(img, count)
	defer ioutil.WriteFile(savePath, placeSv.GetImageBytes(), 0644)
	go func() {
		for {
			ioutil.WriteFile(savePath, placeSv.GetImageBytes(), 0644)
			time.Sleep(time.Second * time.Duration(saveInterval))
		}
	}()
	fs := httpfilter.NewServer(root, "", map[string]httpfilter.OpFunc{
		"place": func(w http.ResponseWriter, req *http.Request, args ...string) {
			placeSv.ServeHTTP(w, req)
		},
	})
	server := http.Server{
		TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler)), //disable HTTP/2
		Addr:         port,
		Handler:      fs,
	}
	log.Fatal(server.ListenAndServe())
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
