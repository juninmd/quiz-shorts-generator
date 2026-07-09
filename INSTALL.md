# ✅ Setup Completo - Quiz Shorts Generator

## 🎉 Status: PRONTO PARA USAR

Todas as dependências foram instaladas e configuradas com sucesso!

## 📦 O que foi feito

### 1. **Dependências Python**
- ✅ Edge-TTS instalado (síntese de voz)
- ✅ Python 3.11+ disponível

### 2. **Dependências Node.js**
- ✅ Todas as dependências npm/pnpm instaladas
- ✅ TypeScript validado

### 3. **Assets**
- ✅ Usando assets existentes do git:
  - `assets/backgrounds/` (neon.png, bg_default.png)
  - `assets/logo/` (logo.png)
  - `assets/music/` (será preenchido conforme necessário)

### 4. **Scripts**
- ✅ `pnpm run generate-daily` → Gera 5 shorts com nomes únicos em `output/`
- ✅ `pnpm run start` → Gera 1 short (uso manual)

### 5. **GitHub Actions**
- ✅ Workflow `daily_quiz.yml` configurado para:
  - Rodar a cada 1 hora (ajustável)
  - Instalar todas as dependências
  - Gerar 5 shorts
  - Fazer upload dos shorts como artifacts

### 6. **Gitignore**
- ✅ Adicionado `output/` para ignorar shorts gerados

## 🚀 Como Usar Localmente

### Pré-requisitos
1. Certifique-se de que Ollama está rodando:
   ```bash
   ollama serve
   ```

2. (Apenas primeira vez) Baixe o modelo:
   ```bash
   ollama pull qwen2.5:1.5b
   ```

### Gerar 5 Shorts
```bash
pnpm run generate-daily
```

Os vídeos apareçerão em: `output/short_1_*.mp4`, `output/short_2_*.mp4`, etc.

## ⚙️ Variáveis de Ambiente (.env)

```env
# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b

# Telegram (opcional)
TELEGRAM_TOKEN=seu_token
TELEGRAM_CHAT_ID=seu_chat_id

# YouTube (opcional)
YOUTUBE_CLIENT_ID=seu_client_id
YOUTUBE_CLIENT_SECRET=seu_client_secret
YOUTUBE_REFRESH_TOKEN=seu_refresh_token
YOUTUBE_CHANNEL_NAME=seu_channel_name
```

## 📊 Estrutura do Projeto

```
quiz-shorts-generator/
├── src/
│   ├── generate-daily.ts     # 🆕 Script para gerar 5 shorts
│   ├── index.ts               # Script para gerar 1 short
│   ├── content.service.ts     # Geração de quiz (Ollama)
│   ├── tts.service.ts         # Síntese de voz (Edge-TTS)
│   ├── video.service.ts       # Montagem de vídeo (FFmpeg)
│   ├── telegram.service.ts    # Envio para Telegram
│   ├── youtube.service.ts     # Upload para YouTube
│   └── __tests__/
├── assets/
│   ├── backgrounds/           # 🎨 Fundos de vídeo
│   ├── logo/                  # 🏷️ Logo do projeto
│   └── music/                 # 🎵 Fundo musical
├── output/                    # 📹 Shorts gerados (gitignored)
├── .github/workflows/
│   └── daily_quiz.yml         # ✅ GitHub Actions configurado
└── package.json               # ✅ Scripts prontos
```

## 🔄 GitHub Actions

### Triggerar manualmente
```bash
gh workflow run daily_quiz.yml
```

### Ou via interface GitHub
1. Abra Actions na aba do repositório
2. Selecione "Daily Quiz Shorts Generator"
3. Clique "Run workflow"

## 📝 Notas

- Cada short tem um nome único com tema e timestamp
- Todos os 5 shorts são salvos na pasta `output/`
- O workflow roda a cada 1 hora (ajustável em `daily_quiz.yml` na linha com `cron`)
- Os artifacts ficam disponíveis por 7 dias

---

**Setup finalizado em**: 15/03/2026
