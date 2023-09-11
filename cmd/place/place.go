package main

import (
	"crypto/tls"
	"encoding/csv"
	"flag"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
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
var enableWL bool
var whitelistPath string
var loadRecordPath string
var saveRecordPath string

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
	flag.StringVar(&whitelistPath, "whitelist", "./whitelist.csv", "The path to a whitelist.")
	flag.StringVar(&loadRecordPath, "loadRecord", "", "The png to load as the record.")
	flag.StringVar(&saveRecordPath, "saveRecord", "./record.png", "The path to save the record.")
	flag.BoolVar(&enableWL, "wl", false, "Enable whitelist.")
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
		log.Printf("Creating new canvas with dimensions %d x %d\n", width, height)
		nrgba := image.NewNRGBA(image.Rect(0, 0, width, height))
		for i := range nrgba.Pix {
			nrgba.Pix[i] = 255
		}
		img = nrgba
	} else {
		log.Printf("Loading canvas from %s\n", loadPath)
		img = loadImage(loadPath)
	}

	var whitelist map[string]uint16
	var record draw.Image
	if enableWL {
		d, err := readWhitelist(whitelistPath)
		if err != nil {
			panic(err)
		}
		whitelist = d
		if loadRecordPath == "" {
			log.Printf("Creating new record image with dimensions %d x %d\n", width, height)
			record = image.NewGray16(image.Rect(0, 0, width, height))
		} else {
			log.Printf("Loading record image from %s\n", loadRecordPath)
			record = loadImage(loadRecordPath)
		}
	}

	placeSv := place.NewServer(img, count, enableWL, whitelist, record)
	defer ioutil.WriteFile(savePath, placeSv.GetImageBytes(), 0644)
	defer func() {
		if enableWL {
			ioutil.WriteFile(savePath, placeSv.GetRecordBytes(), 0644)
		}
	}()
	go func() {
		for {
			ioutil.WriteFile(savePath, placeSv.GetImageBytes(), 0644)
			if enableWL {
				ioutil.WriteFile(saveRecordPath, placeSv.GetRecordBytes(), 0644)
			}
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
	if err != nil {
		panic(err)
	}
	defer f.Close()
	pngimg, err := png.Decode(f)
	if err != nil {
		panic(err)
	}
	return pngimg.(draw.Image)
}

func readWhitelist(whitelistPath string) (map[string]uint16, error) {
	f, err := os.Open(whitelistPath)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	csvReader := csv.NewReader(f)
	data, err := csvReader.ReadAll()
	if err != nil {
		log.Fatal(err)
	}
	whitelist := make(map[string]uint16)
	for line, v := range data {
		x, err := strconv.Atoi(v[1])
		if err != nil {
			panic(fmt.Sprintf("Error when reading whitelist on line %d: %s", line, err.Error()))
		}
		whitelist[v[0]] = uint16(x)
	}
	return whitelist, nil
}
