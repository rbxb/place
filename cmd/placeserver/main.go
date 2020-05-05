package main

import (
	"net/http"

	"github.com/rbxb/placeserver/ws"
)

func main() {
	sv := ws.NewServer(512, 512, 64)
	http.ListenAndServe(":8081", sv)
}
