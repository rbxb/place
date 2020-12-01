package place

import (
	"bytes"
	"encoding/binary"
	"errors"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"net/http"
	"path"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  512,
	WriteBufferSize: 512,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	Error: func(w http.ResponseWriter, req *http.Request, status int, err error) {
		log.Fatal(err)
		http.Error(w, err.Error(), status)
	},
}

type Server struct {
	sync.RWMutex
	clients []chan []byte
	img     draw.Image
	imgBuf  []byte
}

func NewServer(img draw.Image, count int) *Server {
	return &Server{
		RWMutex: sync.RWMutex{},
		clients: make([]chan []byte, count),
		img:     img,
	}
}

func (sv *Server) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	switch path.Base(req.URL.Path) {
	case "place.png":
		sv.HandleGetImage(w, req)
	case "stat":
		sv.HandleGetStat(w, req)
	case "ws":
		sv.HandleSocket(w, req)
	default:
		http.Error(w, "Not found.", 404)
	}
}

func (sv *Server) HandleGetImage(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(sv.GetImageBytes()) //not thread safe but it won't do anything bad
}

func (sv *Server) HandleGetStat(w http.ResponseWriter, req *http.Request) {
	count := 0
	for _, ch := range sv.clients {
		if ch != nil {
			count++
		}
	}
	w.Write([]byte(strconv.Itoa(count)))
}

func (sv *Server) HandleSocket(w http.ResponseWriter, req *http.Request) {
	sv.Lock()
	defer sv.Unlock()
	i := sv.getConnIndex()
	if i == -1 {
		http.Error(w, "Server full.", 503)
		return
	}
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println(err)
		return
	}
	ch := make(chan []byte, 8)
	sv.clients[i] = ch
	go sv.readLoop(conn, ch, i)
	go writeLoop(conn, ch)
}

func (sv *Server) getConnIndex() int {
	for i, client := range sv.clients {
		if client == nil {
			return i
		}
	}
	return -1
}

func rateLimiter() func() bool {
	const rate = 8   //per second average
	const min = 0.01 //kick threshold
	last := time.Now().UnixNano()
	var v float32 = 1.0
	return func() bool {
		now := time.Now().UnixNano()
		v *= float32((now-last)*rate) / float32(time.Second)
		if v > 1.0 {
			v = 1.0
		}
		last = now
		return v > min
	}
}

func (sv *Server) readLoop(conn *websocket.Conn, ch chan []byte, i int) {
	limiter := rateLimiter()
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if !limiter() {
			log.Println("client kicked for high rate")
			break
		}
		if sv.handleMessage(p) != nil {
			log.Println("client kicked for bad message")
			break
		}
	}
	sv.clients[i] = nil
	close(ch)
}

func writeLoop(conn *websocket.Conn, ch chan []byte) {
	for {
		if p, ok := <-ch; ok {
			conn.WriteMessage(websocket.BinaryMessage, p)
		} else {
			break
		}
	}
	conn.Close()
}

func (sv *Server) handleMessage(p []byte) error {
	if !sv.setPixel(parseEvent(p)) {
		return errors.New("invalid placement")
	}
	sv.broadcast(p)
	return nil
}

func (sv *Server) broadcast(p []byte) {
	for _, ch := range sv.clients {
		if ch != nil {
			select {
			case ch <- p:
			default:
				close(ch)
				log.Println("client kicked for being slow")
			}
		}
	}
}

func (sv *Server) GetImageBytes() []byte {
	if sv.imgBuf == nil {
		buf := bytes.NewBuffer(nil)
		if err := png.Encode(buf, sv.img); err != nil {
			log.Println(err)
		}
		sv.imgBuf = buf.Bytes()
	}
	return sv.imgBuf
}

func (sv *Server) setPixel(x, y int, c color.Color) bool {
	rect := sv.img.Bounds()
	width := rect.Max.X - rect.Min.X
	height := rect.Max.Y - rect.Min.Y
	if 0 > x || x >= width || 0 > y || y >= height {
		return false
	}
	sv.img.Set(x, y, c)
	sv.imgBuf = nil
	return true
}

func parseEvent(b []byte) (int, int, color.Color) {
	if len(b) != 11 {
		return -1, -1, nil
	}
	x := int(binary.BigEndian.Uint32(b))
	y := int(binary.BigEndian.Uint32(b[4:]))
	return x, y, color.NRGBA{b[8], b[9], b[10], 0xFF}
}
