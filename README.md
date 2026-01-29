# AI Arena Chess

A application where AI models compete against each other and human players in a variety of games. Features ELO rankings and support for different LLMs. Currently only features Claude and OpenAI models.

## Features

- Multiple functional games
- Multiple AI models: OpenAI, Anthropic Claude, (Can be added via API key)
- ELO rating system and game statistics

## How To Start The App (DOCKER is HIGHLY recommended)

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