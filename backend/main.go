package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

type AnnotateRequest struct {
	Text string `json:"text"`
}

type AnnotateResponse struct {
	Concepts []string `json:"concepts"`
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5174")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}

func main() {
	fmt.Println("🚀 Starting Pro_KONDA backend...")

	graph, err := InitNeo4j()
	if err != nil {
		log.Fatal("❌ Neo4j error:", err)
	}
	defer graph.driver.Close(context.Background())

	http.HandleFunc("/annotate", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions { // preflight CORS
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Cannot read request body", http.StatusBadRequest)
			return
		}

		var req AnnotateRequest
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(req.Text) == "" {
			http.Error(w, "No text provided for annotation", http.StatusBadRequest)
			return
		}

		fmt.Println("🔍 Annotating:", req.Text)

		result, err := RunOllama(fmt.Sprintf("Extract up to 10 key concepts, comma separated, from: %s", req.Text))
		if err != nil {
			http.Error(w, "Ollama failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Nettoyage simple
		clean := strings.TrimSpace(result)
		clean = strings.ReplaceAll(clean, "\n", " ")
		clean = strings.ReplaceAll(clean, "•", "")
		clean = strings.ReplaceAll(clean, "*", "")
		clean = strings.ReplaceAll(clean, "  ", " ")

		// Découpage en concepts
		parts := strings.Split(clean, ",")
		if len(parts) == 1 {
			parts = strings.Split(clean, ";")
		}

		concepts := []string{}
		for _, p := range parts {
			t := strings.TrimSpace(p)
			if t != "" && !strings.HasPrefix(strings.ToLower(t), "1.") && !strings.HasPrefix(strings.ToLower(t), "2.") {
				concepts = append(concepts, t)
			}
		}

		fmt.Println("✅ Extracted concepts:", concepts)
		_ = graph.SaveConcepts(strings.Join(concepts, ","))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnnotateResponse{Concepts: concepts})
	})

	http.HandleFunc("/graph", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		data, _ := graph.GetGraph()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
	})

	fmt.Println("✅ Backend running on http://localhost:3001")
	log.Fatal(http.ListenAndServe(":3001", nil))
}
