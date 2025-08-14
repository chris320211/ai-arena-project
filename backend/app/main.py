from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware

import os
import requests

from .chess_logic import (
    create_board, print_board, get_piece_moves, move_piece,
    is_in_check, is_checkmate, is_stalemate,
)

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
        system_text = (
            "You are a chess engine. Pick ONE legal move. Respond ONLY with JSON "
            "matching: {\"from\":\"e2\", \"to\":\"e4\", \"promotion\":null}. "
            "Choose strictly from the provided legal_moves."
        )
        user_text = (
            f"turn: {side}\n"
            f"legal_moves: {legal}\n"
            f"board_array (8x8 of pieces or '.'): {_board_array(board)}\n"
            "If multiple good choices exist, prefer checks, captures, and center control."
        )
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

ENGINES = {
    "random": RandomAI(),
    "ollama_llama3": OllamaAI(os.getenv("OLLAMA_MODEL_LLAMA3", "llama3:8b")),
    "ollama_phi35": OllamaAI(os.getenv("OLLAMA_MODEL_PHI35", "phi3.5")),
}

BOTS = {
    "white": None,
    "black": None,
}

app = FastAPI()
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
    "turn": "white"
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

def _legal_moves_alg(board, side) -> List[dict]:
    tuples = _collect_legal_moves_for_side(board, side)
    out: List[dict] = []
    for fx, fy, tx, ty in tuples:
        out.append({"from": _xy_to_alg(fx, fy), "to": _xy_to_alg(tx, ty)})
    return out

@app.get("/state")
def get_state():
    return {"board": STATE["board"], "turn": STATE["turn"]}

@app.get("/state_array")
def get_state_array():
    return {"board_array": _board_array(STATE["board"]), "turn": STATE["turn"]}

@app.post("/new")
def new_game():
    STATE["board"] = create_board()
    STATE["turn"] = "white"
    return {"board": STATE["board"], "turn": STATE["turn"]}

@app.post("/reset")
def reset_game():
    STATE["board"] = create_board()
    STATE["turn"] = "white"
    return {"board": STATE["board"], "turn": STATE["turn"]}

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
    return {"moves": moves}

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
def make_move(payload: MovePayload):
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

    opp = "black" if turn == "white" else "white"
    checkmate = is_checkmate(board, opp)
    stalemate = is_stalemate(board, opp)
    in_check = is_in_check(board, opp)

    STATE["turn"] = opp

    return {
        "board": board,
        "turn": STATE["turn"],
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
        allow_population_by_field_name = True

@app.post("/ai/submit")
def ai_submit(payload: BotMove):
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
    move_piece(board, fx, fy, tx, ty)
    moved = board[tx][ty]
    if moved == 'P' and tx == 0:
        promo = (payload.promotion or 'Q')
        board[tx][ty] = promo if promo in {'Q','R','B','N'} else 'Q'
    elif moved == 'p' and tx == 7:
        promo = (payload.promotion or 'q')
        board[tx][ty] = promo if promo in {'q','r','b','n'} else 'q'
    opp = "black" if turn == "white" else "white"
    checkmate = is_checkmate(board, opp)
    stalemate = is_stalemate(board, opp)
    in_check = is_in_check(board, opp)
    STATE["turn"] = opp
    return {
        "board": board,
        "turn": STATE["turn"],
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


@app.post("/ai-step")
def ai_step():
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
        raise HTTPException(500, f"{bot_name} engine error: {e}")
    if mv is None:
        raise HTTPException(400, "Bot cannot make a move (no legal moves)")
    _apply_move_tuple(board, mv)
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
    return {
        "board": board,
        "turn": STATE["turn"],
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