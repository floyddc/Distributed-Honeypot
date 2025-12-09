#!/bin/bash
echo "Waiting for Ollama to start..."
sleep 5
echo "Pulling llama3.2:1b model..."
docker exec ollama-llm ollama pull llama3.2:1b
echo "Ollama ready!"