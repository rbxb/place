package main

import (
	"net/http"

	"github.com/rbxb/placeserver"
)

func main() {
	sv := placeserver.NewServer(512, 512, 32, 32)
	http.ListenAndServe(":8080", sv)
}
