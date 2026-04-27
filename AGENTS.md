# 🧠 AGENTS.md - Quiz Shorts Generator Intelligence System

Este documento fornece instruções fundamentais para agentes de IA operando neste projeto. Ele descreve a arquitetura, convenções e fluxos críticos para garantir a continuidade e qualidade do desenvolvimento sob o protocolo **Antigravity**.

## 🏗️ Arquitetura do Projeto

O sistema é uma aplicação Node.js (TypeScript) que utiliza uma arquitetura baseada em serviços para gerar vídeos curtos (Shorts) de quiz automaticamente, integrando IA generativa, processamento de áudio e vídeo.

### 🧩 Fluxo de Execução Principal (`src/index.ts`)
1.  **Geração de Conteúdo (`src/content.service.ts`)**: Utiliza o **Vercel AI SDK** com **Ollama** para gerar o tema, pergunta, opções e fato curioso em formato JSON validado via **Zod**.
2.  **Narração TTS (`src/tts.service.ts`)**: Invoca o `edge-tts` (Python) via subprocesso para gerar áudio (.mp3) e extrair timestamps de palavras (.vtt) para sincronização visual.
3.  **Orquestração de Vídeo (`src/video.service.ts`)**:
    *   `video-assets.service.ts`: Valida assets (fontes, fundos, logos) e prepara arquivos temporários de texto para o FFmpeg.
    *   `video-filters.service.ts`: Define a lógica complexa de overlays, transições e sincronização de legendas.
    *   `video-ffmpeg.service.ts`: Wrapper para execução do comando `ffmpeg`.
4.  **Distribuição**:
    *   `telegram.service.ts`: Envia o vídeo e notificações via **grammY**.
    *   `youtube.service.ts`: Gera metadados otimizados para SEO e realiza o upload via **Google APIs**.

## 📜 Convenções de Código (Protocolo Antigravity)

1.  **Limite de Tamanho**: **Máximo 180 linhas por arquivo**. Se exceder, decomponha em sub-módulos ou serviços específicos (Ex: split `video-filters` de `video-service`).
2.  **Tipagem Estrita**: TypeScript `strict: true`. Proibido o uso de `any`. Use interfaces e tipos explícitos para contratos de serviços.
3.  **Testes Obrigatórios (TDD)**: **100% de cobertura** exigida em Statements, Branches, Functions e Lines. Verifique sempre via `vitest.config.ts`.
4.  **KISS & DRY**: Priorize legibilidade e simplicidade. Evite "over-engineering" e abstrações desnecessárias.
5.  **Observabilidade**: Logs claros usando prefixos (🚀, ✅, ❌, ⚠️) para facilitar o debug remoto.

## 🛠️ Stack Tecnológica & Comandos

| Ferramenta | Uso |
| :--- | :--- |
| **Node.js 24 + pnpm** | Runtime principal e gerenciador de pacotes. |
| **TypeScript + tsx** | Linguagem e execução direta de scripts TS. |
| **Vitest + V8** | Framework de testes e engine de cobertura. |
| **FFmpeg** | Engine de processamento de vídeo (requer instalação no sistema). |
| **Python 3 + edge-tts** | Utilizado para Text-to-Speech de alta qualidade. |
| **Ollama** | Backend local para modelos de linguagem (AI SDK). |

### Comandos Frequentes
```bash
pnpm install                  # Instala dependências Node
pip install edge-tts          # Instala dependência Python (global/venv)
pnpm test                     # Executa testes unitários
pnpm run test:coverage        # Verifica cobertura (deve ser 100%)
pnpm run lint                 # Type-check via TSC
pnpm start                    # Executa o fluxo completo
```

## 🛡️ Áreas Sensíveis e Segurança

*   **Secrets**: Nunca logue `YOUTUBE_REFRESH_TOKEN` ou `TELEGRAM_TOKEN`. Use `redactSecrets()` em `utils.service.ts` para sanitizar erros.
*   **Asset Paths**: Sempre use `path.resolve()` ou `normalizePath()` para evitar problemas com espaços em nomes de arquivos nos filtros do FFmpeg.
*   **Temporary Assets**: Arquivos em `temp_assets/` e `output/` são ignorados pelo git. O sistema tenta limpar `temp_assets` ao final de cada execução bem-sucedida.
*   **FFmpeg Filters**: A cadeia de filtros é sensível. Ao modificar `video-filters.service.ts`, valide sempre com `video-ffmpeg.service.test.ts`.

## 🤝 Guia para Agentes de IA

1.  **Reprodutibilidade**: Antes de qualquer fix, adicione um caso de teste em `src/__tests__` que comprove a falha.
2.  **Desenvolvimento Cirúrgico**: Faça mudanças mínimas e precisas. Se uma refatoração for necessária para manter o limite de 180 linhas, faça-a em um passo separado.
3.  **Dependências**: Verifique `package.json` antes de sugerir novas libs. Prefira nativos do Node.js ou libs já instaladas.
4.  **Hardware**: O processamento de vídeo é intensivo em CPU. Evite criar múltiplos processos FFmpeg em paralelo sem controle.

---
*"Automatizando a criatividade com precisão técnica e rigor arquitetural."*
