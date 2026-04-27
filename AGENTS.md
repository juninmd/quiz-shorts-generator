# 🧠 AGENTS.md - Quiz Shorts Generator Intelligence System

Este documento fornece instruções fundamentais para agentes de IA operando neste projeto. Ele descreve a arquitetura, convenções e fluxos críticos para garantir a continuidade e qualidade do desenvolvimento.

## 🏗️ Arquitetura do Projeto

O sistema é uma aplicação Node.js (TypeScript) que utiliza uma arquitetura baseada em serviços para gerar vídeos curtos (Shorts) de quiz automaticamente, integrando IA para conteúdo e automação de vídeo com FFmpeg.

### 🧩 Fluxo de Execução Principal
O ponto de entrada principal é `src/index.ts`, que coordena o seguinte fluxo:

1. **Content Generation (`src/content.service.ts`)**: Utiliza o AI SDK (Vercel) com Ollama para gerar o conteúdo do quiz (pergunta, opções, resposta correta e fato curioso) em formato JSON estruturado com Zod.
2. **Narração TTS (`src/tts.service.ts`)**: Invoca a ferramenta Python `edge-tts` via subprocesso para gerar o áudio (.mp3) e os timestamps de cada palavra (.vtt) para sincronização visual.
3. **Orquestração de Vídeo (`src/video.service.ts`)**: Coordena a preparação de assets e a montagem final.
   - `video-assets.service.ts`: Gerencia fontes, fundos neon, normalização de caminhos e geração de arquivos de texto temporários.
   - `video-filters.service.ts`: Constrói a complexa cadeia de filtros FFmpeg (drawtext, overlay, amix, adelay).
   - `video-ffmpeg.service.ts`: Executa o comando FFmpeg final utilizando `fluent-ffmpeg` ou spawn direto.
4. **Distribuição**:
   - `telegram.service.ts`: Envia o vídeo gerado para um canal via Bot API (GrammY).
   - `youtube.service.ts`: Realiza o upload para o YouTube Shorts utilizando a API oficial (Googleapis), com títulos e descrições otimizados.

## 📜 Convenções de Código (Protocolo Antigravity)

1. **Limite de Tamanho**: **Máximo 180 linhas por arquivo**. Se um serviço exceder este limite, deve ser decomposto em sub-módulos ou utilitários.
2. **Tipagem Estrita**: TypeScript em modo estrito. Evite o uso de `any`. Defina interfaces claras para todas as trocas de dados entre serviços.
3. **Responsabilidade Única**: Cada serviço deve focar em uma parte específica do pipeline (Conteúdo, Áudio, Filtros, Execução, Distribuição).
4. **Testes Obrigatórios**: Mínimo de **80% de cobertura** de código. Utilize `vitest` e arquivos de teste em `src/__tests__/`.
5. **KISS & DRY**: Prefira simplicidade e legibilidade. Evite abstrações prematuras.

## 🛠️ Comandos e Ferramentas

| Comando | Descrição |
| :--- | :--- |
| `pnpm install` | Instala as dependências do Node.js. |
| `pip install -r requirements.txt` | Instala dependências Python (essencial para o `edge-tts`). |
| `pnpm start` / `pnpm run generate` | Inicia o processo completo de geração de um quiz. |
| `pnpm run dev` | Inicia em modo watch para desenvolvimento. |
| `pnpm test` | Executa a suíte de testes com Vitest. |
| `pnpm run test:coverage` | Gera relatório de cobertura de testes. |
| `pnpm run lint` | Valida tipos com TSC (noEmit). |

## 🔑 Variáveis de Ambiente Críticas (`.env`)

- `OLLAMA_BASE_URL`: URL do servidor Ollama.
- `AI_MODEL`: Modelo de IA para geração do quiz (ex: `gemma4:e4b`).
- `ENABLE_YOUTUBE`: Habilita/desabilita o upload automatizado para o YouTube (`true`/`false`).
- `TELEGRAM_TOKEN` & `TELEGRAM_CHAT_ID`: Para notificações e upload.
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`: Para upload automatizado.

## 🛡️ Áreas Sensíveis e Segurança

- **FFmpeg Filters**: O arquivo `video-filters.service.ts` contém cálculos de posicionamento e temporização (reveal time). Modificações aqui devem ser testadas visualmente.
- **Python Bridge**: O `tts.service.ts` depende do comando `python -m edge_tts`. Garanta que o ambiente Python esteja acessível.
- **Assets Temporários**: A pasta `temp_assets/` é usada para arquivos intermediários (áudio, vtt, txt). O sistema deve limpar ou sobrescrever esses arquivos para evitar lixo.
- **Segurança de Segredos**: Nunca logue variáveis de ambiente. Use o arquivo `.env.example` como referência para novas configurações.

## 🤝 Guia para Agentes de IA

1. **Reprodução**: Antes de corrigir um bug, tente reproduzi-lo com um novo caso de teste em `src/__tests__`.
2. **Modularidade**: Ao adicionar novas funcionalidades (ex: novos temas, novos filtros), prefira criar um novo serviço ou estender `video-filters.service.ts` de forma modular.
3. **Assets**: Se precisar de novas músicas ou fontes, adicione em `assets/` e atualize os serviços correspondentes.

---
*"Automatizando a criatividade com precisão técnica."*
