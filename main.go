package main

import (
	"net/http"

	"github.com/rbxb/httpfilter"
)

func main() {
	sv := NewPlaceServer(256, 256, 16)
	filter := httpfilter.NewServer("./root", map[string]httpfilter.OpFunc{
		"place-api": func(w http.ResponseWriter, req *http.Request, query string, args []string) string {
			sv.ServeHTTP(w, req)
			return query
		},
	})
	http.ListenAndServe(":8080", filter)
}
