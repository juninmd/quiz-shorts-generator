# 🧠 Quiz Shorts Generator (Node.js + TS)

Gerador automático de vídeos curtos (9:16) no estilo Quiz para YouTube Shorts, TikTok e Instagram, utilizando **Ollama**, **Vercel AI SDK**, **Edge-TTS** e **FFmpeg**.

## ✨ Funcionalidades
- **Ollama + Vercel AI SDK**: Geração de perguntas factuais com esquema JSON rigoroso via Zod.
- **Edge-TTS**: Narração humana de alta qualidade (Grátis) com sincronização palavra-por-palavra.
- **Legendas Dinâmicas (ASS)**: Legendas profissionais "queimadas" no vídeo com destaque em tempo real.
- **Node.js & TypeScript**: Código tipado, performático e fácil de manter.
- **Automação Diária**: Workflow do GitHub Actions pronto para postagem diária no Telegram.

## 🛠️ Tech Stack
- **Runtime**: Node.js 20+ (Execução via `tsx`)
- **IA**: Vercel AI SDK com provedor `ollama-ai-provider`
- **Vídeo**: `fluent-ffmpeg` com suporte a filtros complexos e legendas `.ass`
- **TTS**: `edge-tts-node`
- **Telegram**: `grammy` (Bot Framework)
- **Testes**: `vitest` com cobertura de código

## 🚀 Como Começar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (v20 ou superior)
- [pnpm](https://pnpm.io/) (Gerenciador de pacotes)
- [FFmpeg](https://ffmpeg.org/) instalado no sistema (com suporte a `libass` para as legendas)
- [Ollama](https://ollama.com/) rodando localmente ou em um servidor acessível.
- **Linux users:** instale `ttf-mscorefonts-installer` (ou similar) para garantir que o script consiga copiar uma fonte Arial; o fluxo agora também tenta DejaVu/Liberation como fallback.

O projeto foi testado em Ubuntu (via GitHub Actions) e Windows; não há dependências específicas de plataforma além da manipulação de fontes.
### 2. Instalação
Clone o repositório e instale as dependências:
```bash
pnpm install
```

### 3. Assets Necessários
O script sorteia arquivos das pastas:
- `assets/backgrounds/`: Vídeos MP4 verticais (sugestão: vídeos de Minecraft, GTA, ou paisagens abstratas).
- `assets/music/`: Trilhas sonoras MP3 de fundo.

### 4. Configurar Variáveis de Ambiente
Crie um arquivo `.env`:
```env
TELEGRAM_TOKEN=seu_bot_token
TELEGRAM_CHAT_ID=seu_chat_id
OLLAMA_HOST=http://localhost:11434/api
```

## 📅 GitHub Actions (Automação)
O workflow `.github/workflows/daily_quiz.yml` está configurado para rodar diariamente.

### Configuração de Segredos (GitHub Secrets)
Adicione os seguintes segredos no seu repositório do GitHub:
- `TELEGRAM_TOKEN`: Token do seu bot.
- `TELEGRAM_CHAT_ID`: ID do canal/grupo.
- `OLLAMA_HOST`: URL pública do seu Ollama (use [Ngrok](https://ngrok.com/) ou [Cloudflare Tunnel] para expor seu host local).

> 🛑 A partir das últimas atualizações, o script encerra o processo automaticamente assim que o vídeo é gerado e enviado ao Telegram. Isso evita que runners ou instâncias em nuvem fiquem aguardando indefinidamente após a conclusão.


### ⚠️ Observações sobre CI

O gerador de vídeos usa **FFmpeg**, que costuma interromper o reporte de progresso alguns segundos antes de encerrar (por volta de 90‑95 %). No GitHub Actions isso faz com que o passo `pnpm start` pareça travado e seja abortado por inatividade após 10 minutos, mesmo que o processo ainda esteja rodando. Para contornar:

- o código agora despeja **toda a saída do FFmpeg** e imprime mensagens de keep‑alive (`ffmpeg still running...`) a cada 5 minutos, garantindo que a ação não expire;
- técnica similar pode ser usada em outros ambientes longos, ou ajuste `timeout-minutes` na workflow.

## 🧪 Testes
Para rodar os testes e verificar a cobertura:
```bash
pnpm test
pnpm test:coverage
```

---
*Inspirado pelo repositório [shorts-generator](https://github.com/juninmd/shorts-generator)*.
