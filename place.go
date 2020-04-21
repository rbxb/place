package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image/png"
	"net/http"
	"strconv"
	"sync"
)

type event struct {
	X, Y int
	Data string
}

type PlaceServer struct {
	sync.Mutex
	img     *rgbImage
	events  []event
	current int
	imgBuf  []byte
	queue   chan byte
}

func NewPlaceServer(width, height, history int) *PlaceServer {
	return &PlaceServer{
		Mutex:  sync.Mutex{},
		img:    newRGBAImage(width, height),
		events: make([]event, history),
		queue:  make(chan byte),
	}
}

func (sv *PlaceServer) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case "GET":
		sv.handleGet(w, req)
	case "PUT":
		sv.handlePut(w, req)
	default:
		http.Error(w, "Invalid request.", 400)
	}
}

func (sv *PlaceServer) ServeImage(w http.ResponseWriter) {
	if sv.imgBuf == nil {
		sv.imgBuf = sv.createImgBuf()
	}
	w.Header().Set("Content-Type", "image/png")
	w.Write(sv.imgBuf)
}

func (sv *PlaceServer) handleGet(w http.ResponseWriter, req *http.Request) {
	str := req.URL.Query().Get("id")
	id, _ := strconv.Atoi(str)
	sv.Lock()
	if id >= sv.current && req.URL.Query().Get("wait") == "true" {
		sv.Unlock()
		sv.queue <- 0
		sv.Lock()
	}
	var b []byte
	if id < 0 || id >= sv.current || id+1 < sv.current-len(sv.events) {
		b, _ = sv.imageData(w)
	} else {
		b, _ = sv.eventsData(w, id)
	}
	sv.Unlock()
	w.Write(b)
}

func (sv *PlaceServer) handlePut(w http.ResponseWriter, req *http.Request) {
	e := event{}
	d := json.NewDecoder(req.Body)
	defer req.Body.Close()
	if err := d.Decode(&e); err != nil || !sv.dimsOk(e.X, e.Y) {
		http.Error(w, "Bad request.", 400)
		return
	}
	b, err := base64.StdEncoding.DecodeString(e.Data)
	if err != nil {
		http.Error(w, "Bad request.", 400)
		return
	}
	pos := (sv.img.width*e.Y + e.X) * 4
	sv.Lock()
	copy(sv.img.pixels[pos:], b)
	sv.imgBuf = nil
	if len(sv.events) > 0 {
		sv.events = append(sv.events[1:], e)
		sv.current++
	}
	sv.Unlock()
	w.WriteHeader(200)
	sv.clearQueue()
}

func (sv *PlaceServer) dimsOk(x, y int) bool {
	return 0 <= x && x < sv.img.width && 0 <= y && y < sv.img.height
}

func (sv *PlaceServer) imageData(w http.ResponseWriter) ([]byte, error) {
	if sv.imgBuf == nil {
		sv.imgBuf = sv.createImgBuf()
	}
	imgStr := base64.StdEncoding.EncodeToString(sv.imgBuf)
	return json.Marshal(struct {
		ID   int
		Data string
	}{
		ID:   sv.current,
		Data: imgStr,
	})
}

func (sv *PlaceServer) eventsData(w http.ResponseWriter, id int) ([]byte, error) {
	count := sv.current - id
	return json.Marshal(struct {
		ID     int
		Events []event
	}{
		ID:     sv.current,
		Events: sv.events[len(sv.events)-count:],
	})
}

func (sv *PlaceServer) createImgBuf() []byte {
	buf := bytes.NewBuffer(nil)
	if err := png.Encode(buf, sv.img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

func (sv *PlaceServer) clearQueue() {
	for {
		select {
		case <-sv.queue:
		default:
			return
		}
	}
}
