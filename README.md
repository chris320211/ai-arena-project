# AI Arena Chess

A full-stack chess application where AI models compete against each other and human players. Features comprehensive game statistics, ELO rankings, and support for multiple AI providers.

## Project Structure

```
ai-arena-project/
├── backend/           # FastAPI backend server
│   ├── app/
│   │   ├── main.py           # Main FastAPI application
│   │   ├── chess_logic.py    # Chess game logic and rules
│   │   ├── database.py       # MongoDB models and operations
│   │   └── __init__.py
│   └── requirements.txt      # Python dependencies
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # React components (ChessBoard, GameStats, etc.)
│   │   ├── pages/           # Application pages
│   │   └── main.tsx         # Application entry point
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite configuration
└── docker-compose.yml       # Docker services configuration
```

## Features

- **Interactive Chess Interface**: Drag-and-drop chess board with move validation and history navigation
- **Multiple AI Models**: Support for OpenAI GPT, Anthropic Claude, Google Gemini, Ollama, and custom APIs
- **AI vs AI Matches**: Watch different AI models compete with real-time analysis
- **ELO Rating System**: Competitive rankings with proper win/loss/draw calculations
- **Game Analytics**: Detailed statistics, performance metrics, and rating trends
- **Move History**: Navigate through game moves with back/forward controls
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+

### Setup
```bash
# Clone and navigate to project
git clone <repository>
cd ai-arena-project

# Copy environment template
cp backend/.env.example backend/.env

# Start services
docker-compose up -d

# Install and start frontend
cd frontend
npm install
npm run dev

# Stop services when done
docker-compose down
```

### Access Points
- **Application**: http://localhost:8080
- **API Documentation**: http://localhost:8001/docs
- **MongoDB**: localhost:27017

## Configuration

### AI Models
Add API keys to `backend/.env`:

```bash
# OpenAI (GPT-4o Mini, GPT-4o)
OPENAI_API_KEY=sk-your-openai-key

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google Gemini
GOOGLE_API_KEY=your-google-key

# Custom API providers
CUSTOM_AI_1_URL=https://api.provider.com/v1/chat/completions
CUSTOM_AI_1_API_KEY=your-api-key
CUSTOM_AI_1_MODEL=model-name
```

### Local Models (Ollama)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download models
ollama pull llama3:8b
ollama pull phi3.5
```

## Development

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Start backend (serves both API and frontend)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### API Endpoints
Key backend endpoints:

- `GET /state` - Current game state
- `POST /move` - Make a move
- `POST /new` - Start new game
- `POST /set-bots` - Configure AI opponents
- `POST /ai-step` - Execute AI move
- `GET /api/stats/models` - Model statistics
- `GET /api/stats/elo-history` - ELO rating history

Full API documentation: `http://localhost:8001/docs`

### Environment Variables
```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017/ai-arena

# Ollama (local models)
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL_LLAMA3=llama3:8b
OLLAMA_MODEL_PHI35=phi3.5
```

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - Game data and statistics storage
- **Pydantic** - Data validation and serialization
- **Motor** - Async MongoDB driver

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - Component library
- **Recharts** - Data visualization

### AI Integration
- **OpenAI API** - GPT models
- **Anthropic API** - Claude models
- **Google AI** - Gemini models
- **Ollama** - Local model hosting
- **Custom HTTP APIs** - Generic AI provider support