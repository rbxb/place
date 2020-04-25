package main

import (
	"bytes"
	"encoding/binary"
	"image/png"
	"io/ioutil"
	"net/http"
	"path"
	"strconv"
	"sync"
)

const (
	responseTypeImage  = 0x00
	responseTypeEvents = 0x01
)

const (
	eventSize  = 11
	headerSize = 5
)

type Server struct {
	sync.RWMutex
	limit      chan byte
	wait       chan http.ResponseWriter
	img        *rgbImage
	imgBuf     []byte
	eventBuf   []byte
	eventCount int
	current    int
}

func NewServer(width, height, eventCount, limitSize, waitSize int) *Server {
	return &Server{
		RWMutex:    sync.RWMutex{},
		limit:      make(chan byte, limitSize),
		wait:       make(chan http.ResponseWriter, waitSize),
		img:        newRGBImage(width, height),
		eventBuf:   make([]byte, eventSize*eventCount+headerSize),
		eventCount: eventCount,
	}
}

func (sv *Server) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	select {
	case sv.limit <- 0:
		if path.Base(req.URL.Path) == "place.png" {
			sv.ServeImage(w, req)
		} else {
			switch req.Method {
			case "GET":
				sv.handleGet(w, req)
			case "PUT":
				sv.handlePut(w, req)
			default:
				http.Error(w, "Bad request.", 400)
			}
		}
		<-sv.limit
	default:
		http.Error(w, "Service unvailable.", 503)
	}
}

func (sv *Server) ServeImage(w http.ResponseWriter, req *http.Request) {
	w.Write(sv.bufferImg()[headerSize:])
}

func (sv *Server) handleGet(w http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	str := query.Get("i")
	start, _ := strconv.Atoi(str)
	sv.RLock()
	count := sv.current - start
	if count <= 0 {
		sv.RUnlock()
		select {
		case sv.wait <- w:
		default:
			http.Error(w, "Service unvailable.", 503)
		}
		return
	}
	var b []byte
	if count > sv.eventCount || start < 0 {
		b = sv.bufferImg()
	} else {
		b = sv.eventBuf[:headerSize+count*eventSize]
	}
	sv.RUnlock()
	w.Write(b)
}

func (sv *Server) getRespond(w http.ResponseWriter) {

}

func (sv *Server) handlePut(w http.ResponseWriter, req *http.Request) {
	b, err := ioutil.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "Internal error.", 500)
		panic(err)
	}
	x, y, color := parseEvent(b)
	if !sv.positionOk(x, y) {
		http.Error(w, "Bad request.", 400)
		return
	}
	sv.Lock()
	sv.img.Set(x, y, color)
	sv.imgBuf = nil
	sv.current++
	b = sv.bufferEvent(b)
	n := len(sv.wait)
	sv.Unlock()
	w.WriteHeader(200)
	sv.clearWait(b, n)
}

func (sv *Server) bufferEvent(b []byte) []byte {
	sv.eventBuf[0] = responseTypeEvents
	binary.BigEndian.PutUint32(sv.eventBuf[1:], uint32(sv.current))
	copy(sv.eventBuf[headerSize+eventSize:], sv.eventBuf[headerSize:])
	copy(sv.eventBuf[headerSize:], b)
	b = make([]byte, headerSize+eventSize)
	copy(b, sv.eventBuf)
	return b
}

func (sv *Server) bufferImg() []byte {
	if sv.imgBuf == nil {
		b := make([]byte, 5)
		b[0] = responseTypeImage
		binary.BigEndian.PutUint32(b[1:], uint32(sv.current))
		buf := bytes.NewBuffer(b)
		if err := png.Encode(buf, sv.img); err != nil {
			panic(err)
		}
		sv.imgBuf = buf.Bytes()
	}
	return sv.imgBuf
}

func (sv *Server) positionOk(x, y int) bool {
	return 0 <= x && x < sv.img.width && 0 <= y && y < sv.img.height
}

func (sv *Server) clearWait(b []byte, n int) {
	for i := 0; i < n; i++ {
		(<-sv.wait).Write(b)
	}
}

func parseEvent(b []byte) (int, int, []byte) {
	if len(b) != eventSize {
		return -1, -1, nil
	}
	x := int(binary.BigEndian.Uint32(b))
	y := int(binary.BigEndian.Uint32(b[4:]))
	return x, y, b[8:]
}
