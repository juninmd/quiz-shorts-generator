# Instalação Local

## Pré-requisitos

- Node.js 24+
- pnpm 10+
- Python 3.11+
- FFmpeg e ffprobe disponíveis no PATH
- Ollama em execução

## Instalação

1. Instale dependências Node.js:

```bash
pnpm install --frozen-lockfile
```

2. Instale `edge-tts` no Python:

```bash
python -m pip install edge-tts
```

3. Copie `.env.example` para `.env` e ajuste as variáveis necessárias.

4. Baixe o modelo do Ollama usado pelo workflow de quiz:

```bash
ollama pull gemma3:1b
```

## Execução Local

Rodar o workflow de quiz com a configuração padrão:

```bash
pnpm start
```

Rodar explicitamente um workflow:

```bash
WORKFLOW_ID=quiz pnpm start
WORKFLOW_ID=podcast-clips pnpm start
WORKFLOW_ID=release-radar pnpm start
```

## Saídas

- Vídeos renderizados: `output/quiz_*.mp4`
- Ledger de auditoria: `output/audit-ledger.jsonl`
- Artefatos temporários por job: `temp_assets/jobs/<jobId>`

## Verificação Local

```bash
pnpm lint
pnpm test
pnpm test:coverage
```

## Observações

- O workflow `quiz` é o único pronto para publicação automática.
- `podcast-clips` e `release-radar` ainda exigem fontes autorizadas/oficiais antes de sair do estado `blocked`.
- Se `ENABLE_YOUTUBE=false`, o vídeo continua sendo gerado e enviado ao Telegram.
