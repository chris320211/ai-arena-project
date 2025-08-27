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

## Prerequisites

- **Python 3.8+** for the backend
- **Node.js 18+** for the frontend
- **Ollama** (optional, for AI opponents)

## Setup Instructions

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd ai-arena-project/backend
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd ai-arena-project/frontend
```

Install Node.js dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:8080`

### 3. Ollama Setup (Optional - for AI opponents)

If you want to use AI opponents, install and configure Ollama:

1. Install Ollama from [https://ollama.com](https://ollama.com)
2. Pull the required models:
   ```bash
   ollama pull llama3:8b
   ollama pull phi3.5
   ```
3. Ensure Ollama is running on `http://localhost:11434` (default)

## Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):
   ```bash
   cd ai-arena-project/backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd ai-arena-project/frontend
   npm run dev
   ```

3. **Access Application**: Open `http://localhost:8080` in your browser

### Production Build

1. **Build Frontend**:
   ```bash
   cd ai-arena-project/frontend
   npm run build
   ```

2. **Start Backend** (serves both API and frontend):
   ```bash
   cd ai-arena-project/backend
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

- **Backend not starting**: Ensure Python dependencies are installed and port 8000 is available
- **Frontend not loading**: Check that Node.js dependencies are installed and port 8080 is available
- **AI opponents not working**: Verify Ollama is installed, running, and models are downloaded
- **CORS issues**: The backend is configured to allow all origins for development

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