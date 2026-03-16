# 🚀 Setup de Dependências - Quiz Shorts Generator

## Pré-requisitos

Este projeto requer as seguintes dependências para funcionar corretamente:

### 1. **FFmpeg**

- Status: **JÁ INSTALADO**
- Versão: 7.1.1
- Necessário para: Montagem de vídeos

### 2. **Python 3.11+**

- Status: **JÁ INSTALADO**
- Versão: 3.11.4
- Necessário para: Edge-TTS (síntese de fala)

### 3. **Edge-TTS**

- Status: **PENDENTE**
- Instalar com:

```bash
pip install edge-tts
```

### 4. **Ollama**

- Status: **NECESSÁRIO**
- URL: [https://ollama.ai](https://ollama.ai)
- Instalação: Baixar e instalar localmente
- Configuração necessária no `.env`:
  - `OLLAMA_HOST=http://localhost:11434`
  - `OLLAMA_MODEL=qwen2.5:1.5b` (ou outro modelo disponível)

## Ajustes de Configuração

Edite o arquivo `.env` com suas credenciais:

```env
# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b

# Telegram (opcional para envio automático)
TELEGRAM_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui

# YouTube (opcional para upload automático)
YOUTUBE_CLIENT_ID=seu_client_id_aqui
YOUTUBE_CLIENT_SECRET=seu_client_secret_aqui
YOUTUBE_REFRESH_TOKEN=seu_refresh_token_aqui
```

## Executar Geração de 5 Shorts

Após instalar todas as dependências:

```bash
# Gerar 5 shorts do dia
pnpm run generate-daily

# Ou com npm
npm run generate-daily
```

## Saída

Os vídeos serão salvos em: `output/short_1_*.mp4`, `output/short_2_*.mp4`, etc.

## Troubleshooting

### Erro: "Ollama não está respondendo"

- Certifique-se de que Ollama está rodando: `ollama serve`
- Verifique a URL em `.env`

### Erro: "edge-tts não encontrado"

- Windows: `pip install edge-tts`
- Mac/Linux: `pip3 install edge-tts`

### Erro: "FFmpeg não encontrado"

- Windows: Instalar via [ffmpeg.org](https://ffmpeg.org/download.html) (já feito)
- Mac: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

---

**Última atualização**: 15/03/2026

