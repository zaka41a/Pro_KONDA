package main

import "fmt"

func GenerateCypher(question string) (string, error) {
	prompt := fmt.Sprintf("Translate this natural language question into a Cypher query for Neo4j: %s", question)
	return RunOllama(prompt)
}
