# 🚀 Quiz Shorts Generator

[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Protocol: Antigravity](https://img.shields.io/badge/Protocol-Antigravity-orange.svg)]()

> A modern, high-performance project built with **Python 3.x**. Orchestrated under the Antigravity protocol.

## ✨ Features

- **High Performance**: Optimized for speed and low resource usage.
- **Clean Architecture**: Built following strict Antigravity guidelines.
- **Automated**: Integrated with modern CI/CD and verification scripts.

## 🛠️ Tech Stack

- **Primary Technology**: Python 3.x / Node.js
- **Architecture**: Modular and domain-driven.

## 🔑 Environment Variables

To fully run the project, including the automated YouTube Shorts post logic, make sure to set up the following environment variables:

- `OLLAMA_HOST`: The host URL for Ollama (default: `http://localhost:11434`).
- `OLLAMA_MODEL`: The Ollama model to use (default: `qwen2.5:1.5b`).
- `TELEGRAM_TOKEN`: Bot token for uploading the video via Telegram.
- `TELEGRAM_CHAT_ID`: The chat ID for the destination in Telegram.
- `YOUTUBE_CLIENT_ID`: OAuth2 Client ID for YouTube API.
- `YOUTUBE_CLIENT_SECRET`: OAuth2 Client Secret for YouTube API.
- `YOUTUBE_REFRESH_TOKEN`: OAuth2 Refresh Token that is authorized for your channel.
- `YOUTUBE_CHANNEL_NAME`: (Optional) The name of the target channel to help Ollama generate personalized metadata.

## 🛡️ Antigravity Protocol

This project follows the **Antigravity** code standards:
- **150-Line Limit**: Applied to all logic modules.
- **Strict Typing**: Avoiding dynamic/any types.
- **Clean Code**: DRY, KISS, and SOLID principles applied rigorously.

---

*"Simplicity is the ultimate sophistication."*
