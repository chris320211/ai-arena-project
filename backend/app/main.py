from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Tuple
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware

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
ENGINES = {
    "random": RandomAI(),
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

@app.get("/state")
def get_state():
    return {"board": STATE["board"], "turn": STATE["turn"]}

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

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")


from fastapi import Body
from typing import Dict, Any

class SetBotsPayload(BaseModel):
    white: Optional[str] = None
    black: Optional[str] = None

@app.post("/set-bots")
def set_bots(payload: SetBotsPayload):
    for color in ("white", "black"):
        bot_name = getattr(payload, color)
        if bot_name is not None:
            if bot_name not in ENGINES and bot_name is not None:
                raise HTTPException(400, f"Unknown bot for {color}: {bot_name}")
            BOTS[color] = bot_name
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
    mv = engine.choose(board, turn)
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