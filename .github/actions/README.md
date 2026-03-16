# 📦 GitHub Actions do Quiz Shorts Generator

Este diretório contém **GitHub Actions reutilizáveis** que podem ser usadas em qualquer repositório.

## 🦙 Actions Disponíveis

### 1. `setup-ollama`
Instala e configura Ollama com pull automático de modelos e cache.

**Uso:**
```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: gemma3:1b
```

📖 [Documentação completa](./setup-ollama/README.md)

### 2. `cleanup-ollama`
Para o serviço Ollama e salva cache.

**Uso:**
```yaml
- uses: ./.github/actions/cleanup-ollama
  if: always()
  with:
    cache-key: ollama-models-gemma3:1b
```

📖 [Documentação completa](./cleanup-ollama/README.md)

## 📁 Estrutura

```
.github/actions/
├── setup-ollama/
│   ├── action.yml          # Definição da ação
│   └── README.md           # Documentação específica
├── cleanup-ollama/
│   ├── action.yml          # Definição da ação
│   └── README.md           # Documentação específica
└── REUSE_GUIDE.md         # Guia de reutilização em outros repositórios
```

## 🚀 Quick Start

### Local
```yaml
- uses: ./.github/actions/setup-ollama
  with:
    model: gemma3:1b
```

### Em outro repositório
```yaml
- uses: juninmd/quiz-shorts-generator/.github/actions/setup-ollama@main
  with:
    model: gemma3:1b
```

## 📚 Guia Completo

Veja [REUSE_GUIDE.md](./REUSE_GUIDE.md) para exemplos detalhados de como usar essas actions em outros repositórios.

## 🔧 Suporte

Use esse template para reportar problemas:

- **Action**: setup-ollama / cleanup-ollama
- **Inputs**: `{ ... }`
- **Erro**: `...`
- **Esperado**: `...`

---

Criado para reutilização em múltiplos repositórios ✨
