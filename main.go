package main

import (
	"net/http"
)

func main() {
	sv := NewServer(512, 512, 32, 32, 32)
	http.ListenAndServe(":8080", sv)
}
