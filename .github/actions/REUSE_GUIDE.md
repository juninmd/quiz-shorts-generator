# 🔄 Reutilizando Actions Ollama em Outros Repositórios

Este guia mostra como usar as actions `setup-ollama` e `cleanup-ollama` em outros repositórios.

## 📥 Opção 1: Usar Diretamente (Recomendado)

Se você quer usar as actions do repositório sem copiar:

```yaml
name: My ML Pipeline

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: juninmd/quiz-shorts-generator/.github/actions/setup-ollama@master
        id: ollama
        with:
          model: gemma3:1b
          wait-timeout: 120
          cache-enabled: true

      - name: Use Ollama
        run: |
          curl -s http://localhost:11434/api/tags | jq .
          echo "Model from cache: ${{ steps.ollama.outputs.model-cached }}"

      - uses: juninmd/quiz-shorts-generator/.github/actions/cleanup-ollama@master
        if: always()
        with:
          cache-enabled: true
          cache-key: ollama-models-gemma3:1b
```

## 📋 Opção 2: Copiar para Seu Repositório

Se você quer manter as actions sob seu controle:

### 1. Clone ou copie os arquivos

```bash
# Clone o repositório
git clone https://github.com/juninmd/quiz-shorts-generator.git

# Copie as actions
cp -r quiz-shorts-generator/.github/actions/setup-ollama seu-repo/.github/actions/
cp -r quiz-shorts-generator/.github/actions/cleanup-ollama seu-repo/.github/actions/
```

### 2. Use localmente

```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: llama2
```

## 🌟 Exemplos de Uso

### Exemplo 1: Análise de Código com Ollama

```yaml
name: Code Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: juninmd/quiz-shorts-generator/.github/actions/setup-ollama@main
        with:
          model: mistral
          cache-enabled: true

      - name: Analyze Code
        run: |
          # Use Ollama para analisar código
          curl -X POST http://localhost:11434/api/chat \
            -d '{
              "model": "mistral",
              "prompt": "Analise este código: $(cat src/main.ts)"
            }'

      - uses: juninmd/quiz-shorts-generator/.github/actions/cleanup-ollama@main
        if: always()
        with:
          cache-enabled: true
          cache-key: ollama-models-mistral
```

### Exemplo 2: Testes com Modelos Locais

```yaml
name: LLM Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        model: [gemma3:1b, mistral, neural-chat]

    steps:
      - uses: actions/checkout@v4

      - uses: juninmd/quiz-shorts-generator/.github/actions/setup-ollama@main
        with:
          model: ${{ matrix.model }}
          wait-timeout: 180

      - name: Run Tests
        run: npm test

      - uses: juninmd/quiz-shorts-generator/.github/actions/cleanup-ollama@main
        if: always()
        with:
          cache-key: ollama-models-${{ matrix.model }}
```

### Exemplo 3: Geração de Conteúdo

```yaml
name: Generate Content

on:
  schedule:
    - cron: '0 8 * * *'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: juninmd/quiz-shorts-generator/.github/actions/setup-ollama@main
        id: ollama
        with:
          model: neural-chat
          cache-enabled: true

      - name: Generate Content
        run: python scripts/generate.py

      - uses: juninmd/quiz-shorts-generator/.github/actions/cleanup-ollama@main
        if: always()
        with:
          cache-enabled: true
          cache-key: ollama-models-neural-chat
```

## ⚙️ Configurações Avançadas

### Desabilitar Cache

```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: llama2
    cache-enabled: false
```

### Aumentar Timeout

```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: mistral
    wait-timeout: 300  # 5 minutos
```

### Host Customizado

```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: gemma3:1b
    ollama-host: http://ollama-server:11434
```

## 📊 Outputs Disponíveis

Use os outputs para verificar status:

```yaml
- uses: ./.github/actions/setup-ollama
  id: setup
  with:
    model: gemma3:1b

- name: Check Status
  run: |
    echo "Ollama Ready: ${{ steps.setup.outputs.ollama-ready }}"
    echo "From Cache: ${{ steps.setup.outputs.model-cached }}"
```

## 🐛 Troubleshooting

### "Ollama não respondeu em timeout"

Aumentar timeout:
```yaml
wait-timeout: 300  # aumentar de 120 para 300 segundos
```

### Cache não está funcionando

Certificar-se de usar o cleanup com cache-key:
```yaml
- uses: ./.github/actions/cleanup-ollama
  if: always()
  with:
    cache-enabled: true
    cache-key: ollama-models-${{ env.MODELO }}
```

### "Host não pode alcançar localhost"

Se usar em runners customizados, ajustar:
```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: gemma3:1b
    ollama-host: http://seu-host:11434
```

## 📖 Documentação Completa

- [setup-ollama](./setup-ollama/README.md)
- [cleanup-ollama](./cleanup-ollama/README.md)

## 🤝 Contribuindo

Se encontrou bugs ou melhorias, abra uma issue ou PR!

---

**Mantido por**: [juninmd](https://github.com/juninmd)
**Licença**: MIT
