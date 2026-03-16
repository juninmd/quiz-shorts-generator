# 🧹 Cleanup Ollama Action

GitHub Action para parar o serviço Ollama e salvar cache de modelos.

## 📋 Features

✅ Para o serviço Ollama gracefully
✅ Salva cache de modelos para próximas execuções
✅ Executa mesmo em caso de erro (`if: always()`)

## 🚀 Uso Básico

```yaml
- uses: ./.github/actions/cleanup-ollama
  if: always()
  with:
    cache-enabled: true
    cache-key: ollama-models-gemma3:1b
```

## 📝 Inputs

| Input | Required | Default | Descrição |
| --- | --- | --- | --- |
| `cache-enabled` | Não | `true` | Habilitar cache de modelos |
| `cache-key` | Não | `` | Chave para salvar cache |

## 📚 Ver Também

- [setup-ollama](../setup-ollama/README.md) - Configurar Ollama
