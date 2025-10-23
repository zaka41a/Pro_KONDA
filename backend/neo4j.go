package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type GraphDB struct {
	driver neo4j.DriverWithContext
}

func InitNeo4j() (*GraphDB, error) {
	uri := os.Getenv("NEO4J_URI")
	if uri == "" {
		uri = "bolt://localhost:7687"
	}
	user := os.Getenv("NEO4J_USER")
	if user == "" {
		user = "neo4j"
	}
	pass := os.Getenv("NEO4J_PASS")
	if pass == "" {
		pass = "password"
	}

	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, pass, ""))
	if err != nil {
		return nil, err
	}

	err = driver.VerifyConnectivity(context.Background())
	if err != nil {
		return nil, err
	}

	fmt.Println("✅ Connected to Neo4j!")
	return &GraphDB{driver: driver}, nil
}

// ✅ Enregistre les concepts comme nœuds reliés dans Neo4j
func (g *GraphDB) SaveConcepts(conceptsCSV string) error {
	ctx := context.Background()
	concepts := strings.Split(conceptsCSV, ",")
	if len(concepts) == 0 {
		return fmt.Errorf("no concepts provided")
	}

	session := g.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		for i, c := range concepts {
			clean := strings.TrimSpace(c)
			if clean == "" {
				continue
			}

			// 🔹 Crée le nœud s’il n’existe pas déjà
			_, err := tx.Run(ctx, `
				MERGE (a:Concept {name: $name})
			`, map[string]any{"name": clean})
			if err != nil {
				return nil, err
			}

			// 🔹 Crée une relation avec le précédent concept
			if i > 0 {
				prev := strings.TrimSpace(concepts[i-1])
				if prev != "" {
					_, err = tx.Run(ctx, `
						MATCH (a:Concept {name: $prev}), (b:Concept {name: $name})
						MERGE (a)-[:RELATED_TO]->(b)
					`, map[string]any{"prev": prev, "name": clean})
					if err != nil {
						return nil, err
					}
				}
			}
		}
		return nil, nil
	})

	if err != nil {
		log.Println("❌ Neo4j save error:", err)
		return err
	}

	fmt.Println("💾 Saved concepts to Neo4j:", concepts)
	return nil
}

// ✅ Récupère le graphe (nœuds + relations)
func (g *GraphDB) GetGraph() (map[string]any, error) {
	ctx := context.Background()
	session := g.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	nodes := []map[string]any{}
	links := []map[string]any{}

	_, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MATCH (a:Concept)-[r:RELATED_TO]->(b:Concept)
			RETURN a.name AS source, b.name AS target
		`, nil)
		if err != nil {
			return nil, err
		}

		seen := make(map[string]bool)

		for result.Next(ctx) {
			record := result.Record()
			src := record.Values[0].(string)
			dst := record.Values[1].(string)

			if !seen[src] {
				nodes = append(nodes, map[string]any{"id": src})
				seen[src] = true
			}
			if !seen[dst] {
				nodes = append(nodes, map[string]any{"id": dst})
				seen[dst] = true
			}

			links = append(links, map[string]any{
				"source": src,
				"target": dst,
			})
		}

		return nil, nil
	})

	if err != nil {
		return nil, err
	}

	return map[string]any{
		"nodes": nodes,
		"links": links,
	}, nil
}
