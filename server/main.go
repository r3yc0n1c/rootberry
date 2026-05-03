package main

import (
	"log"
	"net/http"
	"rootberry/server/ws"
)

func main() {
	// http.Handle("/", http.FileServer(http.Dir("../client")))
	http.HandleFunc("/ws", ws.HandleConnection)

	log.Println("🌱 RootBerry server running on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}