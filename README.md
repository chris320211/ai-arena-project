# AI Arena Chess Project

A full-stack chess application featuring AI opponents powered by Ollama models. Players can compete against different AI models or watch AI vs AI matches.

## Project Structure

```
ai-arena-project/
├── backend/           # FastAPI backend server
│   ├── app/
│   │   ├── main.py           # Main FastAPI application
│   │   ├── chess_logic.py    # Chess game logic and rules
│   │   └── __init__.py
│   └── requirements.txt      # Python dependencies
└── frontend/          # React + TypeScript frontend
    ├── src/
    │   ├── components/       # React components (ChessBoard, GameStats, etc.)
    │   ├── pages/           # Application pages
    │   └── main.tsx         # Application entry point
    ├── package.json         # Node.js dependencies
    └── vite.config.ts       # Vite configuration
```

## Features

- **Interactive Chess Board**: Drag-and-drop chess interface
- **AI Opponents**: Multiple AI models including Llama3 and Phi3.5 via Ollama
- **AI vs AI Mode**: Watch AI models compete against each other
- **Real-time Game State**: Live updates of board state, move validation, and game status
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS using shadcn/ui components

## 🚀 Launch the Arena

**Prerequisites:** 
1. Install Docker Desktop and Node.js 18+
2. Start Docker Desktop

**Deploy the battlefield:**
```bash
# Copy environment template
cp .env.example .env

# Start backend (Docker)
docker-compose up --build -d

# Start frontend (Local)
cd frontend && npm install && npm run dev
```

**Access your AI arena:**
- 🎯 **Battle Interface:** http://localhost:8080/
- 🧠 **AI Command Center:** http://localhost:8001/docs  

**Power down:**
```bash
docker-compose down
```

---

## 🤖 AI Opponents Setup

**Cheapest Option (~$0.20 for 1000 games):**
```bash
# Get free API key from https://huggingface.co/settings/tokens
HF_API_KEY=your_huggingface_api_key_here
```

**Premium Options:**
```bash
# OpenAI (~$0.15 for 1000 games) 
OPENAI_API_KEY=your_key_here

# Anthropic Claude (~$0.25 for 1000 games)
ANTHROPIC_API_KEY=your_key_here
```

**That's it!** Just add one API key to `.env` and start playing!

## ⚔️ Battle Modes

**Human vs AI:** Challenge the machines
**AI vs AI:** Watch artificial minds clash
**Tournament Mode:** Coming soon - Multi-agent competitions

## 🏗️ Development Mode

For AI researchers and developers:
```bash
# Launch development arena
docker-compose -f docker-compose.dev.yml up
```

### Production Build

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Backend** (serves both API and frontend):
   ```bash
   cd backend
   source venv/bin/activate  # Windows: venv\Scripts\activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

The application will be available at `http://localhost:8000`

## API Endpoints

The backend provides the following key endpoints:

- `GET /state` - Get current game state
- `POST /move` - Make a move
- `POST /new` - Start a new game
- `POST /set-bots` - Configure AI opponents
- `POST /ai-step` - Execute AI move
- `GET /health` - Health check

Full API documentation is available at `http://localhost:8000/docs` when the backend is running.

## Environment Variables

Optional environment variables for customization:

```bash
# Ollama configuration
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL_LLAMA3=llama3:8b
OLLAMA_MODEL_PHI35=phi3.5
```

## Troubleshooting

- **Backend not starting**: Run `python setup.py` in the backend directory, then activate venv
- **Frontend not loading**: Run `npm install` in the frontend directory
- **AI opponents not working**: Install Ollama and download models (`ollama pull llama3:8b`)
- **Port conflicts**: Frontend runs on 8080, backend on 8000

## Technologies Used

### Backend
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **Requests**: HTTP client for Ollama integration

### Frontend
- **React 18**: Frontend library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: React component library
- **React Router**: Client-side routing