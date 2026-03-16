#!/bin/bash

echo "🚀 Iniciando geração de 5 shorts..."

cd "/d/Solutions/pessoal/quiz-shorts-generator"

# Ensure Ollama is running
echo "Verificando Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Iniciando Ollama..."
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 10
fi

# Run the generator
echo "Gerando shorts..."
export OLLAMA_MODEL=qwen3:1.7b
pnpm run generate-daily

echo "✅ Concluído!"
