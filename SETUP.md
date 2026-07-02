# Setup Operacional

## Workflow Ativo

O pipeline principal do repositório é o workflow `quiz`.

Execução local ou CI:

```bash
WORKFLOW_ID=quiz pnpm start
```

## Telegram

Variáveis mínimas:

```env
TELEGRAM_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Sem essas variáveis, o workflow de quiz falha na etapa de publicação para Telegram.

## YouTube

Variáveis mínimas:

```env
ENABLE_YOUTUBE=true
YOUTUBE_PRIVACY_STATUS=public
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

Notas:

- `ENABLE_YOUTUBE=false` desliga o upload.
- `YOUTUBE_PRIVACY_STATUS` aceita `public`, `private` e `unlisted`.
- Para fluxos com fontes de terceiros, a política do projeto rebaixa o upload para revisão/draft quando aplicável.

## GitHub Actions

O workflow [.github/workflows/generate_quiz.yml](.github/workflows/generate_quiz.yml) agora:

- instala dependências com lockfile congelado;
- executa `pnpm lint` e `pnpm test` antes da geração;
- publica artifacts em `output/quiz_*.mp4`.

O workflow [.github/workflows/secret-scan.yml](.github/workflows/secret-scan.yml) executa varredura de segredos com Gitleaks em `push`, `pull_request` e execução manual.

## Guardrails Editoriais

- `quiz`: auto-aprovado por ser conteúdo próprio.
- `podcast-clips`: bloqueado até existir fonte autorizada com prova de permissão.
- `release-radar`: bloqueado até existir fonte oficial/licenciada.

## Troubleshooting

- `Ollama não está respondendo`: verifique `OLLAMA_HOST` e rode `ollama serve`.
- `edge-tts não encontrado`: rode `python -m pip install edge-tts`.
- `FFmpeg não encontrado`: instale FFmpeg/ffprobe e valide com `ffmpeg -version`.

