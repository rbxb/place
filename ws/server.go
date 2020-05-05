package ws

import (
	"bytes"
	"encoding/binary"
	"errors"
	"image/png"
	"log"
	"net/http"
	"path"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  512,
	WriteBufferSize: 512,
}

type Server struct {
	sync.RWMutex
	conns  []*websocket.Conn
	img    *placeImage
	imgBuf []byte
}

func NewServer(width, height, count int) *Server {
	return &Server{
		RWMutex: sync.RWMutex{},
		conns:   make([]*websocket.Conn, count),
		img:     newPlaceImage(width, height),
	}
}

func (sv *Server) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if path.Base(req.URL.Path) == "place.png" {
		w.Write(sv.bufferImg())
	} else {
		sv.Lock()
		defer sv.Unlock()
		i := sv.getConnIndex()
		if i == -1 {
			http.Error(w, "Service unavailable.", 503)
			return
		}
		c, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Fatal(err)
			return
		}
		sv.conns[i] = c
		go sv.handleConnection(c)
	}
}

func (sv *Server) getConnIndex() int {
	for i, c := range sv.conns {
		if c == nil {
			return i
		}
	}
	return -1
}

func (sv *Server) handleConnection(c *websocket.Conn) {
	for {
		if err := sv.readMessage(c); err != nil {
			c.Close()
			return
		}
	}
}

func (sv *Server) readMessage(c *websocket.Conn) error {
	_, p, err := c.ReadMessage()
	if err != nil {
		return err
	}
	x, y, color := parseEvent(p)
	if !sv.positionOk(x, y) {
		return errors.New("invalid placement")
	}
	sv.Lock()
	sv.img.Set(x, y, color)
	sv.imgBuf = nil
	sv.broadcast(websocket.BinaryMessage, p)
	sv.Unlock()
	return nil
}

func (sv *Server) broadcast(messageType int, p []byte) {
	for _, c := range sv.conns {
		if err := c.WriteMessage(messageType, p); err != nil {
			c.Close()
		}
	}
}

func (sv *Server) bufferImg() []byte {
	if sv.imgBuf == nil {
		buf := bytes.NewBuffer(nil)
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

func parseEvent(b []byte) (int, int, []byte) {
	if len(b) != 11 {
		return -1, -1, nil
	}
	x := int(binary.BigEndian.Uint32(b))
	y := int(binary.BigEndian.Uint32(b[4:]))
	return x, y, b[8:]
}
