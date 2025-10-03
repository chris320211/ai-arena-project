# AI Arena Chess

A chess application where AI models compete against each other and human players. Features ELO rankings and support for multiple AI providers.

## Features

- Interactive chess board with move validation
- Multiple AI models: OpenAI, Anthropic Claude, Google Gemini, Ollama, custom APIs
- AI vs AI matches with real-time analysis
- ELO rating system and game statistics
- Modern UI built with React and TypeScript

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+

### Setup
```bash
# Clone repository
git clone <repository>
cd ai-arena-project

# Copy environment template and add your API keys
cp .env.example .env

# Start services
docker-compose up -d

# Install and start frontend
cd frontend
npm install
npm run dev
```

### Access Points
- **Application**: http://localhost:8080
- **API Documentation**: http://localhost:8001/docs

## Configuration

Add API keys to `.env`:

```bash
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

For local models with Ollama:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3:8b
```

## Technology Stack

- **Backend**: FastAPI, MongoDB
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **AI**: OpenAI, Anthropic, Google, Ollama