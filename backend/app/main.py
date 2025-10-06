from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

import os
import requests
import time
from dotenv import load_dotenv

# Add AI provider imports
from openai import OpenAI
try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Load environment variables from .env file
load_dotenv()

# Import database functions
from .database import (
    connect_to_mongo, close_mongo_connection, save_game_result,
    get_recent_games, get_all_model_stats, update_model_stats,
    update_elo_ratings, get_elo_history, get_all_elo_history,
    GameResult, EloHistoryEntry
)

from .chess_logic import (
    create_board, print_board, get_piece_moves, move_piece,
    is_in_check, is_checkmate, is_stalemate,
)

def _clone_board(board):
    return [row[:] for row in board]

def _is_strict_legal(board, side: str, fx: int, fy: int, tx: int, ty: int) -> bool:
    if (tx, ty) not in get_piece_moves(board, fx, fy):
        return False
    temp = _clone_board(board)
    move_piece(temp, fx, fy, tx, ty)
    return not is_in_check(temp, side)

def _collect_legal_moves_for_side(board, side):
    moves = []
    for x in range(8):
        for y in range(8):
            piece = board[x][y]
            if piece == '.':
                continue
            if side == 'white' and not piece.isupper():
                continue
            if side == 'black' and not piece.islower():
                continue
            for tx, ty in get_piece_moves(board, x, y):
                if _is_strict_legal(board, side, x, y, tx, ty):
                    moves.append((x, y, tx, ty))
    return moves

class RandomAI:
    def choose(self, board, side):
        pool = _collect_legal_moves_for_side(board, side)
        if not pool:
            return None
        import random
        return random.choice(pool)

class OllamaAI:
    def __init__(self, model: str, base: str | None = None):
        self.model = model
        self.base = base or os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434")

    def _post(self, payload):
        url = f"{self.base.rstrip('/')}/api/generate"
        try:
            r = requests.post(url, json=payload, timeout=60)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(500, f"Ollama request failed: {e}")

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)
        prompt = system_text + "\n\n" + user_text
        data = self._post({
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0}
        })
        txt = data.get("response", "")
        import json, re
        try:
            obj = json.loads(txt)
        except Exception:
            candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
            obj = None
            for c in candidates:
                try:
                    o = json.loads(c)
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n"," ")
                raise HTTPException(500, f"Ollama bad JSON; got: {snippet}...")
        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"]) 
        return (fx, fy, tx, ty)


# Add OpenAIAI class
class OpenAIAI:
    def __init__(self, model: str):
        self.model = model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_text},
                {"role": "user", "content": user_text},
            ],
            temperature=0,
        )
        txt = resp.choices[0].message.content
        import json, re
        try:
            obj = json.loads(txt)
        except Exception:
            candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
            obj = None
            for c in candidates:
                try:
                    o = json.loads(c)
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n"," ")
                raise HTTPException(500, f"OpenAI bad JSON; got: {snippet}...")
        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)


# Add Claude/Anthropic AI class
class AnthropicAI:
    def __init__(self, model: str):
        if not anthropic:
            raise ImportError("anthropic package not installed. Install with: pip install anthropic")
        self.model = model
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=150,
            temperature=0,
            system=system_text,
            messages=[{"role": "user", "content": user_text}]
        )
        txt = message.content[0].text
        import json, re
        try:
            obj = json.loads(txt)
        except Exception:
            candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
            obj = None
            for c in candidates:
                try:
                    o = json.loads(c)
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n"," ")
                raise HTTPException(500, f"Anthropic bad JSON; got: {snippet}...")
        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)


# Add Google Gemini AI class
class GeminiAI:
    def __init__(self, model: str):
        if not genai:
            raise ImportError("google-generativeai package not installed. Install with: pip install google-generativeai")
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel(model)

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)

        prompt = system_text + "\n\n" + user_text
        response = self.model.generate_content(prompt)
        txt = response.text
        import json, re
        try:
            obj = json.loads(txt)
        except Exception:
            candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
            obj = None
            for c in candidates:
                try:
                    o = json.loads(c)
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n"," ")
                raise HTTPException(500, f"Gemini bad JSON; got: {snippet}...")
        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)


# Add Generic HTTP API AI class for other providers
class HttpAI:
    def __init__(self, name: str, url: str, headers: dict, model: str):
        self.name = name
        self.url = url
        self.headers = headers
        self.model = model

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_text},
                {"role": "user", "content": user_text}
            ],
            "temperature": 0,
            "max_tokens": 150
        }
        
        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            # Handle different response formats
            txt = ""
            if "choices" in data and len(data["choices"]) > 0:
                # OpenAI-like format
                if "message" in data["choices"][0]:
                    txt = data["choices"][0]["message"]["content"]
                elif "text" in data["choices"][0]:
                    txt = data["choices"][0]["text"]
            elif "content" in data:
                # Direct content format
                txt = data["content"]
            elif "response" in data:
                # Ollama-like format
                txt = data["response"]
            else:
                raise HTTPException(500, f"Unknown response format from {self.name}")
                
        except requests.RequestException as e:
            raise HTTPException(500, f"{self.name} request failed: {e}")
        
        import json, re
        try:
            obj = json.loads(txt)
        except Exception:
            candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
            obj = None
            for c in candidates:
                try:
                    o = json.loads(c)
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n"," ")
                raise HTTPException(500, f"{self.name} bad JSON; got: {snippet}...")
        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

# Helper function to safely create AI engines
def create_ai_engine(engine_type, *args, **kwargs):
    try:
        if engine_type == "anthropic":
            return AnthropicAI(*args, **kwargs)
        elif engine_type == "gemini":
            return GeminiAI(*args, **kwargs)
        elif engine_type == "openai":
            return OpenAIAI(*args, **kwargs)
        elif engine_type == "http":
            return HttpAI(*args, **kwargs)
        else:
            raise ValueError(f"Unknown engine type: {engine_type}")
    except Exception as e:
        print(f"Failed to create {engine_type} engine: {e}")
        return None

ENGINES = {
    "random": RandomAI(),
    "anthropic_claude_haiku": create_ai_engine("anthropic", "claude-3-5-haiku-20241022") if os.getenv("ANTHROPIC_API_KEY") else None,
    "ollama_phi35": OllamaAI(os.getenv("OLLAMA_MODEL_PHI35", "phi3.5")),
    "openai_gpt4o_mini": OpenAIAI("gpt-4o-mini"),

    # New API-based bots (will be None if API keys are not provided)
    "anthropic_claude_sonnet": create_ai_engine("anthropic", "claude-3-5-sonnet-20241022") if os.getenv("ANTHROPIC_API_KEY") else None,
    "gemini_pro": create_ai_engine("gemini", "gemini-1.5-pro") if os.getenv("GOOGLE_API_KEY") else None,
    "openai_gpt4o": create_ai_engine("openai", "gpt-4o") if os.getenv("OPENAI_API_KEY") else None,

    # Generic HTTP API slots for custom providers
    # These can be configured via environment variables
}

# Add custom HTTP bots if configured
if os.getenv("CUSTOM_AI_1_URL") and os.getenv("CUSTOM_AI_1_API_KEY"):
    ENGINES["custom_ai_1"] = create_ai_engine(
        "http",
        name="Custom AI 1",
        url=os.getenv("CUSTOM_AI_1_URL"),
        headers={"Authorization": f"Bearer {os.getenv('CUSTOM_AI_1_API_KEY')}", "Content-Type": "application/json"},
        model=os.getenv("CUSTOM_AI_1_MODEL", "default")
    )

if os.getenv("CUSTOM_AI_2_URL") and os.getenv("CUSTOM_AI_2_API_KEY"):
    ENGINES["custom_ai_2"] = create_ai_engine(
        "http", 
        name="Custom AI 2",
        url=os.getenv("CUSTOM_AI_2_URL"),
        headers={"Authorization": f"Bearer {os.getenv('CUSTOM_AI_2_API_KEY')}", "Content-Type": "application/json"},
        model=os.getenv("CUSTOM_AI_2_MODEL", "default")
    )

if os.getenv("CUSTOM_AI_3_URL") and os.getenv("CUSTOM_AI_3_API_KEY"):
    ENGINES["custom_ai_3"] = create_ai_engine(
        "http",
        name="Custom AI 3", 
        url=os.getenv("CUSTOM_AI_3_URL"),
        headers={"Authorization": f"Bearer {os.getenv('CUSTOM_AI_3_API_KEY')}", "Content-Type": "application/json"},
        model=os.getenv("CUSTOM_AI_3_MODEL", "default")
    )

# Filter out None engines
ENGINES = {k: v for k, v in ENGINES.items() if v is not None}

BOTS = {
    "white": None,
    "black": None,
}

# Database lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path.lower()
        if path.endswith((".css", ".js", ".svg", ".png", ".jpg", ".jpeg")):
            response.headers["Cache-Control"] = "no-store"
        return response

app.add_middleware(NoCacheStaticMiddleware)

STATE = {
    "board": create_board(),
    "turn": "white",
    "last_move": None,  # {"from":"e2","to":"e4"}
    "game_start_time": None,
    "move_count": 0,
    "game_active": False,
    "move_history": [],  # Track move history to prevent repetition
    "position_history": [],  # Track board positions for threefold repetition detection
}

class Square(BaseModel):
    x: int
    y: int

class MovePayload(BaseModel):
    from_sq: Square
    to_sq: Square
    promotion: Optional[str] = None

def _valid_xy(x: int, y: int) -> bool:
    return 0 <= x < 8 and 0 <= y < 8

FILES = ["a","b","c","d","e","f","g","h"]
RANKS = ["1","2","3","4","5","6","7","8"]

def _xy_to_alg(x: int, y: int) -> str:
    file_ = FILES[y]
    rank_ = RANKS[7 - x]
    return f"{file_}{rank_}"

def _alg_to_xy(sq: str) -> Tuple[int,int]:
    sq = sq.strip().lower()
    f = sq[0]
    r = sq[1]
    y = FILES.index(f)
    x = 7 - RANKS.index(r)
    return x, y

def _board_array(board) -> List[List[str]]:
    arr: List[List[str]] = []
    for x in range(8):
        row: List[str] = []
        for y in range(8):
            row.append(board[x][y])
        arr.append(row)
    return arr

def _board_to_string(board) -> str:
    """Convert board to string for position comparison"""
    return ''.join(''.join(row) for row in board)

def _would_repeat_position(board, fx: int, fy: int, tx: int, ty: int) -> bool:
    """Check if a move would create a threefold repetition"""
    # Create a temporary board with the proposed move
    temp = _clone_board(board)
    move_piece(temp, fx, fy, tx, ty)
    new_position = _board_to_string(temp)

    # Count how many times this position has occurred
    position_count = STATE["position_history"].count(new_position)

    # If this position has already occurred twice, don't allow it (would be third time)
    return position_count >= 2

def _is_immediate_reversal(fx: int, fy: int, tx: int, ty: int) -> bool:
    """Check if move immediately reverses the last move"""
    if not STATE["last_move"]:
        return False

    last = STATE["last_move"]
    last_from = _alg_to_xy(last["from"])
    last_to = _alg_to_xy(last["to"])

    # Check if current move reverses the last move (same piece moving back)
    return (fx, fy) == last_to and (tx, ty) == last_from

def _legal_moves_alg(board, side) -> List[dict]:
    tuples = _collect_legal_moves_for_side(board, side)
    out: List[dict] = []
    for fx, fy, tx, ty in tuples:
        out.append({"from": _xy_to_alg(fx, fy), "to": _xy_to_alg(tx, ty)})
    return out

def _get_ai_system_prompt() -> str:
    """Get improved system prompt for AI chess engines"""
    return (
        "You are an expert chess engine. Your goal is to WIN the game. "
        "Respond ONLY with JSON matching: {\"from\":\"e2\", \"to\":\"e4\", \"promotion\":null}. "
        "Choose strictly from the provided legal_moves list."
    )

def _get_ai_user_prompt(board, side, legal_moves) -> str:
    """Get improved user prompt with strategic priorities"""
    # Check for opponent king position to help AI recognize check opportunities
    opp_side = "black" if side == "white" else "white"
    opp_king = 'k' if opp_side == "black" else 'K'

    king_pos = None
    for x in range(8):
        for y in range(8):
            if board[x][y] == opp_king:
                king_pos = _xy_to_alg(x, y)
                break
        if king_pos:
            break

    is_in_check_now = is_in_check(board, opp_side)

    prompt = (
        f"turn: {side}\n"
        f"opponent_king_position: {king_pos}\n"
        f"opponent_in_check: {is_in_check_now}\n"
        f"legal_moves: {legal_moves}\n"
        f"board_array (8x8 of pieces or '.'): {_board_array(board)}\n\n"
        "PRIORITY ORDER (choose the highest priority available):\n"
        "1. CHECKMATE - If you can checkmate, do it immediately!\n"
        "2. CAPTURE QUEEN - If you can capture opponent's Queen (Q/q), take it!\n"
        "3. CAPTURE ROOK - If you can capture opponent's Rook (R/r), take it!\n"
        "4. CHECK - If you can put opponent's King in check, consider it!\n"
        "5. CAPTURE OTHER PIECES - Take opponent's pieces (Bishop/Knight/Pawn) when advantageous\n"
        "6. PROTECT YOUR PIECES - Move pieces that are under attack to safety\n"
        "7. DEVELOP & CONTROL CENTER - Control center squares (e4, d4, e5, d5)\n\n"
        "Pick the BEST move based on these priorities."
    )

    return prompt

@app.get("/state")
def get_state():
    return {"board": STATE["board"], "turn": STATE["turn"], "last_move": STATE.get("last_move")}

@app.get("/state_array")
def get_state_array():
    return {"board_array": _board_array(STATE["board"]), "turn": STATE["turn"], "last_move": STATE.get("last_move")}

@app.post("/new")
def new_game():
    STATE["board"] = create_board()
    STATE["turn"] = "white"
    STATE["last_move"] = None
    STATE["game_start_time"] = datetime.utcnow()
    STATE["move_count"] = 0
    STATE["game_active"] = True
    STATE["move_history"] = []
    STATE["position_history"] = [_board_to_string(STATE["board"])]
    return {"board": STATE["board"], "turn": STATE["turn"], "last_move": STATE["last_move"]}

@app.post("/reset")
def reset_game():
    STATE["board"] = create_board()
    STATE["turn"] = "white"
    STATE["last_move"] = None
    STATE["game_start_time"] = None
    STATE["move_count"] = 0
    STATE["game_active"] = False
    STATE["move_history"] = []
    STATE["position_history"] = []
    return {"board": STATE["board"], "turn": STATE["turn"], "last_move": STATE["last_move"]}

async def save_completed_game(winner: Optional[str], end_reason: str):
    """Save a completed game to the database"""
    if not STATE["game_active"] or not STATE["game_start_time"]:
        return
    
    duration = int((datetime.utcnow() - STATE["game_start_time"]).total_seconds())
    white_model = BOTS["white"] or "human"
    black_model = BOTS["black"] or "human"
    
    # Create game result
    game_result = GameResult(
        white_model=white_model,
        black_model=black_model,
        winner=winner,
        end_reason=end_reason,
        moves=STATE["move_count"],
        duration=duration
    )
    
    try:
        # Save game result and get the game_id
        game_id = await save_game_result(game_result)
        
        # Update model stats if both players are AI
        if white_model != "human" and black_model != "human":
            white_won = winner == "white"
            black_won = winner == "black"
            draw = winner is None
            
            await update_model_stats(white_model, white_won, draw, STATE["move_count"], duration)
            await update_model_stats(black_model, black_won, draw, STATE["move_count"], duration)
            
            # Update ELO ratings with game_id for history tracking
            await update_elo_ratings(white_model, black_model, winner, game_id)
        elif white_model != "human":
            # Update stats for white AI vs human
            await update_model_stats(white_model, winner == "white", winner is None, STATE["move_count"], duration)
        elif black_model != "human":
            # Update stats for black AI vs human
            await update_model_stats(black_model, winner == "black", winner is None, STATE["move_count"], duration)
            
    except Exception as e:
        print(f"Error saving game result: {e}")
    finally:
        STATE["game_active"] = False

@app.get("/moves")
def get_moves(x: int, y: int):
    board = STATE["board"]
    if not _valid_xy(x, y):
        raise HTTPException(400, "Out of bounds")
    piece = board[x][y]
    if piece == '.':
        return {"moves": []}
    if STATE["turn"] == "white" and piece.islower():
        return {"moves": []}
    if STATE["turn"] == "black" and piece.isupper():
        return {"moves": []}
    moves: List[Tuple[int,int]] = get_piece_moves(board, x, y)
    strict = [(tx, ty) for (tx, ty) in moves if _is_strict_legal(board, STATE["turn"], x, y, tx, ty)]
    return {"moves": strict}

@app.get("/ai/prompt")
def ai_prompt():
    board = STATE["board"]
    turn = STATE["turn"]
    legal = _legal_moves_alg(board, turn)
    pieces = {
        "white": {"P": "pawn", "R": "rook", "N": "knight", "B": "bishop", "Q": "queen", "K": "king"},
        "black": {"p": "pawn", "r": "rook", "n": "knight", "b": "bishop", "q": "queen", "k": "king"},
    }
    schema = {"from": "e2", "to": "e4", "promotion": None}
    instructions = (
        "You are a chess move selector. Output ONLY valid JSON matching the schema {from,to,promotion}. "
        "Use algebraic squares like 'e2'->'e4'. Promotion is one of 'q','r','b','n' or null. "
        "Choose from the provided legal moves."
    )
    return {
        "turn": turn,
        "board_array": _board_array(board),
        "legal_moves": legal,
        "pieces": pieces,
        "output_schema_example": schema,
        "instructions": instructions,
    }

@app.get("/ai/legal-moves")
def ai_legal_moves():
    board = STATE["board"]
    turn = STATE["turn"]
    return {"turn": turn, "legal_moves": _legal_moves_alg(board, turn)}

@app.post("/move")
async def make_move(payload: MovePayload):
    board = STATE["board"]
    turn = STATE["turn"]

    fx, fy = payload.from_sq.x, payload.from_sq.y
    tx, ty = payload.to_sq.x, payload.to_sq.y
    if not (_valid_xy(fx, fy) and _valid_xy(tx, ty)):
        raise HTTPException(400, "Out of bounds")

    piece = board[fx][fy]
    if piece == '.':
        raise HTTPException(400, "No piece at source")
    if turn == "white" and piece.islower():
        raise HTTPException(400, "Not your turn (white)")
    if turn == "black" and piece.isupper():
        raise HTTPException(400, "Not your turn (black)")

    legal = get_piece_moves(board, fx, fy)
    if (tx, ty) not in legal:
        raise HTTPException(400, "Illegal move")

    if not _is_strict_legal(board, turn, fx, fy, tx, ty):
        raise HTTPException(400, "Illegal move (king would be in check)")

    move_piece(board, fx, fy, tx, ty)

    moved = board[tx][ty]
    if moved == 'P' and tx == 0:
        board[tx][ty] = (payload.promotion or 'Q')
        if board[tx][ty] not in {'Q','R','B','N'}:
            board[tx][ty] = 'Q'
    elif moved == 'p' and tx == 7:
        board[tx][ty] = (payload.promotion or 'q')
        if board[tx][ty] not in {'q','r','b','n'}:
            board[tx][ty] = 'q'

    STATE["last_move"] = {"from": _xy_to_alg(fx, fy), "to": _xy_to_alg(tx, ty)}
    STATE["move_count"] += 1
    STATE["move_history"].append(STATE["last_move"])
    STATE["position_history"].append(_board_to_string(board))

    opp = "black" if turn == "white" else "white"
    checkmate = is_checkmate(board, opp)
    stalemate = is_stalemate(board, opp)
    in_check = is_in_check(board, opp)

    STATE["turn"] = opp

    # Handle game completion
    if checkmate:
        winner = "white" if opp == "black" else "black"
        await save_completed_game(winner, "checkmate")
    elif stalemate:
        await save_completed_game(None, "stalemate")

    return {
        "board": board,
        "turn": STATE["turn"],
        "last_move": STATE["last_move"],
        "status": {
            "check": in_check,
            "checkmate": checkmate,
            "stalemate": stalemate
        }
    }

class BotMove(BaseModel):
    from_: str = Field(..., alias="from")  
    to: str
    promotion: Optional[str] = None

    class Config:
        populate_by_name = True

@app.post("/ai/submit")
async def ai_submit(payload: BotMove):
    board = STATE["board"]
    turn = STATE["turn"]
    fx, fy = _alg_to_xy(payload.from_)
    tx, ty = _alg_to_xy(payload.to)
    if not (_valid_xy(fx, fy) and _valid_xy(tx, ty)):
        raise HTTPException(400, "Out of bounds")
    piece = board[fx][fy]
    if piece == '.':
        raise HTTPException(400, f"No piece at source {payload.from_} -> ({fx},{fy})")
    if turn == "white" and piece.islower():
        raise HTTPException(400, "Not your turn (white)")
    if turn == "black" and piece.isupper():
        raise HTTPException(400, "Not your turn (black)")
    legal = get_piece_moves(board, fx, fy)
    if (tx, ty) not in legal:
        raise HTTPException(400, "Illegal move")

    if not _is_strict_legal(board, turn, fx, fy, tx, ty):
        raise HTTPException(400, "Illegal move (king would be in check)")

    move_piece(board, fx, fy, tx, ty)
    moved = board[tx][ty]
    if moved == 'P' and tx == 0:
        promo = (payload.promotion or 'Q')
        board[tx][ty] = promo if promo in {'Q','R','B','N'} else 'Q'
    elif moved == 'p' and tx == 7:
        promo = (payload.promotion or 'q')
        board[tx][ty] = promo if promo in {'q','r','b','n'} else 'q'

    STATE["last_move"] = {"from": payload.from_, "to": payload.to}
    STATE["move_count"] += 1
    STATE["move_history"].append(STATE["last_move"])
    STATE["position_history"].append(_board_to_string(board))

    opp = "black" if turn == "white" else "white"
    checkmate = is_checkmate(board, opp)
    stalemate = is_stalemate(board, opp)
    in_check = is_in_check(board, opp)
    STATE["turn"] = opp

    # Handle game completion
    if checkmate:
        winner = "white" if opp == "black" else "black"
        await save_completed_game(winner, "checkmate")
    elif stalemate:
        await save_completed_game(None, "stalemate")

    return {
        "board": board,
        "turn": STATE["turn"],
        "last_move": STATE["last_move"],
        "status": {"check": in_check, "checkmate": checkmate, "stalemate": stalemate}
    }

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR), html=False), name="static")

from fastapi.responses import FileResponse, HTMLResponse

if FRONTEND_DIR.exists():
    INDEX_PATH = FRONTEND_DIR / "index.html"

    @app.get("/")
    def root():
        if INDEX_PATH.exists():
            return FileResponse(str(INDEX_PATH))
        return HTMLResponse("<h1>AI Arena</h1>")

class SetBotsPayload(BaseModel):
    white: Optional[str] = None
    black: Optional[str] = None

@app.post("/set-bots")
def set_bots(payload: SetBotsPayload):
    for color in ("white", "black"):
        bot_name = getattr(payload, color)
        if bot_name is not None:
            if bot_name == "human":
                BOTS[color] = None
            elif bot_name in ENGINES:
                BOTS[color] = bot_name
            else:
                raise HTTPException(400, f"Unknown bot for {color}: {bot_name}")
    return {"bots": BOTS}


def _apply_move_tuple(board, mv):
    fx, fy, tx, ty = mv
    move_piece(board, fx, fy, tx, ty)
    STATE["last_move"] = {"from": _xy_to_alg(fx, fy), "to": _xy_to_alg(tx, ty)}


@app.post("/ai-step")
async def ai_step():
    board = STATE["board"]
    turn = STATE["turn"]
    bot_name = BOTS[turn]
    if not bot_name:
        raise HTTPException(400, f"No bot assigned for {turn}")
    engine = ENGINES.get(bot_name)
    if not engine:
        raise HTTPException(500, f"Bot engine not found: {bot_name}")

    try:
        mv = engine.choose(board, turn)
    except Exception as e:
        print(f"Engine error for {bot_name}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"{bot_name} engine error: {e}")
    pool = _collect_legal_moves_for_side(board, turn)
    if not pool:
        raise HTTPException(400, "Bot cannot make a move (no legal moves)")

    # Filter out moves that would cause repetition or immediate reversal
    fx, fy, tx, ty = mv if mv in pool else pool[0]

    # Check if the AI's chosen move would repeat or reverse
    if mv in pool and (_is_immediate_reversal(fx, fy, tx, ty) or _would_repeat_position(board, fx, fy, tx, ty)):
        print(f"Warning: {bot_name} tried to repeat/reverse move, finding alternative")
        # Find a non-repeating move
        alternative_found = False
        for candidate in pool:
            cfx, cfy, ctx, cty = candidate
            if not _is_immediate_reversal(cfx, cfy, ctx, cty) and not _would_repeat_position(board, cfx, cfy, ctx, cty):
                mv = candidate
                alternative_found = True
                print(f"Found non-repeating alternative: {_xy_to_alg(cfx, cfy)} -> {_xy_to_alg(ctx, cty)}")
                break

        # If all moves would repeat (very rare), allow it to prevent getting stuck
        if not alternative_found:
            print(f"Warning: All moves would repeat, allowing repetition")
            mv = pool[0]
    elif mv not in pool:
        print(f"Warning: {bot_name} returned invalid move, using fallback")
        # Find a non-repeating fallback
        mv = pool[0]
        for candidate in pool:
            cfx, cfy, ctx, cty = candidate
            if not _is_immediate_reversal(cfx, cfy, ctx, cty) and not _would_repeat_position(board, cfx, cfy, ctx, cty):
                mv = candidate
                break

    _apply_move_tuple(board, mv)
    STATE["move_count"] += 1
    STATE["move_history"].append(STATE["last_move"])
    STATE["position_history"].append(_board_to_string(board))

    tx, ty = mv[2], mv[3]
    moved = board[tx][ty]
    if moved == 'P' and tx == 0:
        board[tx][ty] = 'Q'
    elif moved == 'p' and tx == 7:
        board[tx][ty] = 'q'
    opp = "black" if turn == "white" else "white"
    checkmate = is_checkmate(board, opp)
    stalemate = is_stalemate(board, opp)
    in_check = is_in_check(board, opp)
    STATE["turn"] = opp

    # Handle game completion
    if checkmate:
        winner = "white" if opp == "black" else "black"
        await save_completed_game(winner, "checkmate")
    elif stalemate:
        await save_completed_game(None, "stalemate")

    return {
        "board": board,
        "turn": STATE["turn"],
        "last_move": STATE["last_move"],
        "status": {
            "check": in_check,
            "checkmate": checkmate,
            "stalemate": stalemate
        }
    }

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/health")
def api_health():
    return health()

@app.post("/api/reset")
def api_reset():
    return reset_game()

@app.post("/api/set-bots")
def api_set_bots(payload: SetBotsPayload):
    return set_bots(payload)

@app.post("/api/ai-step")
def api_ai_step():
    return ai_step()

@app.post("/api/ai/submit")
def api_ai_submit(payload: BotMove):
    return ai_submit(payload)

@app.get("/api/state")
def api_state():
    return get_state()

@app.get("/api/state_array")
def api_state_array():
    return get_state_array()

@app.get("/api/ai/prompt")
def api_ai_prompt():
    return ai_prompt()

@app.get("/api/ai/legal-moves")
def api_ai_legal_moves():
    return ai_legal_moves()

@app.get("/api/diag")
def api_diag():
    return {
        "ollama_base": os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434"),
        "ollama_models": {
            "ollama_llama3": os.getenv("OLLAMA_MODEL_LLAMA3", "llama3:8b"),
            "ollama_phi35": os.getenv("OLLAMA_MODEL_PHI35", "phi3.5"),
        },
        "bots": BOTS,
        "turn": STATE["turn"],
    }

@app.get("/last-move")
def last_move():
    return {"last_move": STATE.get("last_move")}

@app.get("/api/last-move")
def api_last_move():
    return last_move()

# Statistics endpoints
@app.get("/api/stats/games")
async def get_game_stats(limit: int = 10):
    """Get recent game results"""
    try:
        games = await get_recent_games(limit)
        return {"games": [game.dict() for game in games]}
    except Exception as e:
        print(f"Error fetching game stats: {e}")
        return {"games": []}

@app.get("/api/stats/models")
async def get_model_statistics():
    """Get statistics for all models"""
    try:
        stats = await get_all_model_stats()
        return {"model_stats": [stat.dict() for stat in stats]}
    except Exception as e:
        print(f"Error fetching model stats: {e}")
        return {"model_stats": []}

@app.get("/api/stats/elo-history")
async def get_elo_rating_history(model_id: str = None, limit: int = 50):
    """Get ELO rating history for a specific model or all models"""
    try:
        if model_id:
            history = await get_elo_history(model_id, limit)
        else:
            history = await get_all_elo_history(limit)
        return {"elo_history": [entry.dict() for entry in history]}
    except Exception as e:
        print(f"Error fetching ELO history: {e}")
        return {"elo_history": []}