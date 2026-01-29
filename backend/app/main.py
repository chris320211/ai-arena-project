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

from .tictactoe_logic import TicTacToeGame, TicTacToeMove, TicTacToeState

from .go_logic import (
    create_board as create_go_board,
    make_move as make_go_move,
    get_all_valid_moves as get_go_valid_moves,
    position_to_string as go_pos_to_string,
    string_to_position as go_string_to_pos,
    score_board as score_go_board,
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
    """Random move selector for baseline comparison"""
    def choose(self, board, side):
        import random
        # Inline legal move collection to avoid circular dependency
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
                from .chess_logic import get_piece_moves
                for tx, ty in get_piece_moves(board, x, y):
                    # Check if move is legal (doesn't leave king in check)
                    temp = [row[:] for row in board]
                    from .chess_logic import move_piece, is_in_check
                    move_piece(temp, x, y, tx, ty)
                    if not is_in_check(temp, side):
                        moves.append((x, y, tx, ty))
        if not moves:
            raise HTTPException(400, "No legal moves available")
        return random.choice(moves)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a random valid move for Go"""
        import random
        if not valid_moves:
            return None
        return random.choice(valid_moves)


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
            "options": {"temperature": 0.7}
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

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Ollama AI"""
        import json, re, random
        if not valid_moves:
            return None

        legal_moves_str = [{"x": x, "y": y, "position": go_pos_to_string(x, y)} for x, y in valid_moves]
        system_text = (
            "You are an AGGRESSIVE Go game AI. Your PRIMARY OBJECTIVE is to SURROUND and CAPTURE opponent stones. "
            "Respond ONLY with JSON: {\"x\": <row>, \"y\": <col>} where x and y are integers. "
            "WINNING STRATEGY:\n"
            "1. SURROUND opponent groups - cut off their liberties (empty spaces around them)\n"
            "2. CAPTURE stones by reducing opponent groups to 0 liberties\n"
            "3. Play moves that attack and threaten opponent stones\n"
            "4. Control territory by surrounding empty areas\n"
            "5. Connect your own stones to build strong groups"
        )
        board_size = len(board)
        opponent_color = 'W' if color == 'B' else 'B'
        user_text = (
            f"You are playing as: {color} ({'Black' if color == 'B' else 'White'})\n"
            f"Opponent color: {opponent_color}\n"
            f"Board size: {board_size}x{board_size}\n"
            f"Valid moves (x=row, y=col): {legal_moves_str}\n"
            f"Board state (B=Black, W=White, .=Empty): {board}\n\n"
            f"INSTRUCTIONS: Look for opponent {opponent_color} stones on the board. "
            f"Play aggressively to SURROUND them and reduce their liberties. "
            f"Choose a move that attacks opponent groups or captures stones. "
            f"Prioritize moves that cut off escape routes for opponent stones!"
        )
        prompt = system_text + "\n\n" + user_text
        try:
            data = self._post({
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.7}
            })
            txt = data.get("response", "")
            try:
                obj = json.loads(txt)
            except Exception:
                candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
                obj = None
                for c in candidates:
                    try:
                        o = json.loads(c)
                        if isinstance(o, dict) and "x" in o and "y" in o:
                            obj = o
                            break
                    except Exception:
                        continue
            if obj and "x" in obj and "y" in obj:
                x, y = int(obj["x"]), int(obj["y"])
                if (x, y) in valid_moves:
                    return (x, y)
        except Exception as e:
            print(f"Ollama Go AI error: {e}")

        # Fallback to random
        return random.choice(valid_moves)


# Add OpenAIAI class
class OpenAIAI:
    def __init__(self, model: str):
        self.model = model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def choose(self, board, side):
        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)

        # Use completions API for instruct models
        if "instruct" in self.model.lower():
            prompt = system_text + "\n\n" + user_text
            resp = self.client.completions.create(
                model=self.model,
                prompt=prompt,
                temperature=0.7,
                max_tokens=150,
            )
            txt = resp.choices[0].text
        else:
            # Use chat completions API for other models
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": user_text},
                ],
                temperature=0.7,
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

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using OpenAI"""
        import json, re, random
        if not valid_moves:
            return None

        legal_moves_str = [{"x": x, "y": y, "position": go_pos_to_string(x, y)} for x, y in valid_moves]
        system_text = (
            "You are an AGGRESSIVE Go game AI. Your PRIMARY OBJECTIVE is to SURROUND and CAPTURE opponent stones. "
            "Respond ONLY with JSON: {\"x\": <row>, \"y\": <col>} where x and y are integers. "
            "WINNING STRATEGY:\n"
            "1. SURROUND opponent groups - cut off their liberties (empty spaces around them)\n"
            "2. CAPTURE stones by reducing opponent groups to 0 liberties\n"
            "3. Play moves that attack and threaten opponent stones\n"
            "4. Control territory by surrounding empty areas\n"
            "5. Connect your own stones to build strong groups"
        )
        board_size = len(board)
        opponent_color = 'W' if color == 'B' else 'B'
        user_text = (
            f"You are playing as: {color} ({'Black' if color == 'B' else 'White'})\n"
            f"Opponent color: {opponent_color}\n"
            f"Board size: {board_size}x{board_size}\n"
            f"Valid moves (x=row, y=col): {legal_moves_str}\n"
            f"Board state (B=Black, W=White, .=Empty): {board}\n\n"
            f"INSTRUCTIONS: Look for opponent {opponent_color} stones on the board. "
            f"Play aggressively to SURROUND them and reduce their liberties. "
            f"Choose a move that attacks opponent groups or captures stones. "
            f"Prioritize moves that cut off escape routes for opponent stones!"
        )
        try:
            # Use completions API for instruct models
            if "instruct" in self.model.lower():
                prompt = system_text + "\n\n" + user_text
                resp = self.client.completions.create(
                    model=self.model,
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=150,
                )
                txt = resp.choices[0].text
            else:
                # Use chat completions API for other models
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_text},
                        {"role": "user", "content": user_text},
                    ],
                    temperature=0.7,
                )
                txt = resp.choices[0].message.content
            try:
                obj = json.loads(txt)
            except Exception:
                candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
                obj = None
                for c in candidates:
                    try:
                        o = json.loads(c)
                        if isinstance(o, dict) and "x" in o and "y" in o:
                            obj = o
                            break
                    except Exception:
                        continue
            if obj and "x" in obj and "y" in obj:
                x, y = int(obj["x"]), int(obj["y"])
                if (x, y) in valid_moves:
                    return (x, y)
        except Exception as e:
            print(f"OpenAI Go AI error: {e}")

        # Fallback to random
        return random.choice(valid_moves)


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
            temperature=0.7,
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

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Anthropic Claude"""
        import json, re, random
        if not valid_moves:
            return None

        legal_moves_str = [{"x": x, "y": y, "position": go_pos_to_string(x, y)} for x, y in valid_moves]
        system_text = (
            "You are an AGGRESSIVE Go game AI. Your PRIMARY OBJECTIVE is to SURROUND and CAPTURE opponent stones. "
            "Respond ONLY with JSON: {\"x\": <row>, \"y\": <col>} where x and y are integers. "
            "WINNING STRATEGY:\n"
            "1. SURROUND opponent groups - cut off their liberties (empty spaces around them)\n"
            "2. CAPTURE stones by reducing opponent groups to 0 liberties\n"
            "3. Play moves that attack and threaten opponent stones\n"
            "4. Control territory by surrounding empty areas\n"
            "5. Connect your own stones to build strong groups"
        )
        board_size = len(board)
        opponent_color = 'W' if color == 'B' else 'B'
        user_text = (
            f"You are playing as: {color} ({'Black' if color == 'B' else 'White'})\n"
            f"Opponent color: {opponent_color}\n"
            f"Board size: {board_size}x{board_size}\n"
            f"Valid moves (x=row, y=col): {legal_moves_str}\n"
            f"Board state (B=Black, W=White, .=Empty): {board}\n\n"
            f"INSTRUCTIONS: Look for opponent {opponent_color} stones on the board. "
            f"Play aggressively to SURROUND them and reduce their liberties. "
            f"Choose a move that attacks opponent groups or captures stones. "
            f"Prioritize moves that cut off escape routes for opponent stones!"
        )
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=150,
                temperature=0.7,
                system=system_text,
                messages=[{"role": "user", "content": user_text}]
            )
            txt = message.content[0].text
            try:
                obj = json.loads(txt)
            except Exception:
                candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
                obj = None
                for c in candidates:
                    try:
                        o = json.loads(c)
                        if isinstance(o, dict) and "x" in o and "y" in o:
                            obj = o
                            break
                    except Exception:
                        continue
            if obj and "x" in obj and "y" in obj:
                x, y = int(obj["x"]), int(obj["y"])
                if (x, y) in valid_moves:
                    return (x, y)
        except Exception as e:
            print(f"Anthropic Go AI error: {e}")

        # Fallback to random
        return random.choice(valid_moves)


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

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Gemini"""
        import json, re, random
        if not valid_moves:
            return None

        legal_moves_str = [{"x": x, "y": y, "position": go_pos_to_string(x, y)} for x, y in valid_moves]
        system_text = (
            "You are an AGGRESSIVE Go game AI. Your PRIMARY OBJECTIVE is to SURROUND and CAPTURE opponent stones. "
            "Respond ONLY with JSON: {\"x\": <row>, \"y\": <col>} where x and y are integers. "
            "WINNING STRATEGY:\n"
            "1. SURROUND opponent groups - cut off their liberties (empty spaces around them)\n"
            "2. CAPTURE stones by reducing opponent groups to 0 liberties\n"
            "3. Play moves that attack and threaten opponent stones\n"
            "4. Control territory by surrounding empty areas\n"
            "5. Connect your own stones to build strong groups"
        )
        board_size = len(board)
        opponent_color = 'W' if color == 'B' else 'B'
        user_text = (
            f"You are playing as: {color} ({'Black' if color == 'B' else 'White'})\n"
            f"Opponent color: {opponent_color}\n"
            f"Board size: {board_size}x{board_size}\n"
            f"Valid moves (x=row, y=col): {legal_moves_str}\n"
            f"Board state (B=Black, W=White, .=Empty): {board}\n\n"
            f"INSTRUCTIONS: Look for opponent {opponent_color} stones on the board. "
            f"Play aggressively to SURROUND them and reduce their liberties. "
            f"Choose a move that attacks opponent groups or captures stones. "
            f"Prioritize moves that cut off escape routes for opponent stones!"
        )
        try:
            prompt = system_text + "\n\n" + user_text
            response = self.model.generate_content(prompt)
            txt = response.text
            try:
                obj = json.loads(txt)
            except Exception:
                candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
                obj = None
                for c in candidates:
                    try:
                        o = json.loads(c)
                        if isinstance(o, dict) and "x" in o and "y" in o:
                            obj = o
                            break
                    except Exception:
                        continue
            if obj and "x" in obj and "y" in obj:
                x, y = int(obj["x"]), int(obj["y"])
                if (x, y) in valid_moves:
                    return (x, y)
        except Exception as e:
            print(f"Gemini Go AI error: {e}")

        # Fallback to random
        return random.choice(valid_moves)


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
            "temperature": 0.7,
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

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using HTTP AI"""
        import json, re, random
        if not valid_moves:
            return None

        legal_moves_str = [{"x": x, "y": y, "position": go_pos_to_string(x, y)} for x, y in valid_moves]
        system_text = (
            "You are an AGGRESSIVE Go game AI. Your PRIMARY OBJECTIVE is to SURROUND and CAPTURE opponent stones. "
            "Respond ONLY with JSON: {\"x\": <row>, \"y\": <col>} where x and y are integers. "
            "WINNING STRATEGY:\n"
            "1. SURROUND opponent groups - cut off their liberties (empty spaces around them)\n"
            "2. CAPTURE stones by reducing opponent groups to 0 liberties\n"
            "3. Play moves that attack and threaten opponent stones\n"
            "4. Control territory by surrounding empty areas\n"
            "5. Connect your own stones to build strong groups"
        )
        board_size = len(board)
        opponent_color = 'W' if color == 'B' else 'B'
        user_text = (
            f"You are playing as: {color} ({'Black' if color == 'B' else 'White'})\n"
            f"Opponent color: {opponent_color}\n"
            f"Board size: {board_size}x{board_size}\n"
            f"Valid moves (x=row, y=col): {legal_moves_str}\n"
            f"Board state (B=Black, W=White, .=Empty): {board}\n\n"
            f"INSTRUCTIONS: Look for opponent {opponent_color} stones on the board. "
            f"Play aggressively to SURROUND them and reduce their liberties. "
            f"Choose a move that attacks opponent groups or captures stones. "
            f"Prioritize moves that cut off escape routes for opponent stones!"
        )
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_text},
                {"role": "user", "content": user_text}
            ],
            "temperature": 0.7,
            "max_tokens": 150
        }

        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Handle different response formats
            txt = ""
            if "choices" in data and len(data["choices"]) > 0:
                if "message" in data["choices"][0]:
                    txt = data["choices"][0]["message"]["content"]
                elif "text" in data["choices"][0]:
                    txt = data["choices"][0]["text"]
            elif "content" in data:
                txt = data["content"]
            elif "response" in data:
                txt = data["response"]

            try:
                obj = json.loads(txt)
            except Exception:
                candidates = re.findall(r"\{.*?\}", txt, flags=re.S)
                obj = None
                for c in candidates:
                    try:
                        o = json.loads(c)
                        if isinstance(o, dict) and "x" in o and "y" in o:
                            obj = o
                            break
                    except Exception:
                        continue
            if obj and "x" in obj and "y" in obj:
                x, y = int(obj["x"]), int(obj["y"])
                if (x, y) in valid_moves:
                    return (x, y)
        except Exception as e:
            print(f"{self.name} Go AI error: {e}")

        # Fallback to random
        return random.choice(valid_moves)

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
    "openai_gpt35_turbo_instruct": create_ai_engine("openai", "gpt-3.5-turbo-instruct") if os.getenv("OPENAI_API_KEY") else None,
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

# TicTacToe game state
tictactoe_game = TicTacToeGame()

# Go game state
GO_STATE = {
    "board": create_go_board(19),
    "turn": "black",  # Black goes first in Go
    "last_move": None,
    "game_start_time": None,
    "move_count": 0,
    "game_active": False,
    "last_board_state": None,  # For Ko rule
    "captured": {"black": 0, "white": 0},  # Stones captured by each player
    "board_size": 19,
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

# Configure CORS origins from environment variable or allow all for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    origins = ["*"]
else:
    origins = [origin.strip() for origin in allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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

def _move_to_pgn(move: dict, board, move_number: int, is_white: bool) -> str:
    """Convert a move dict to PGN algebraic notation (simplified)"""
    from_sq = move["from"]
    to_sq = move["to"]

    # Get piece at from square
    fx, fy = _alg_to_xy(from_sq)
    piece = board[fx][fy]

    # Simple conversion - just use from-to notation for now
    # A more sophisticated version would use standard algebraic notation
    move_str = f"{from_sq}{to_sq}"

    if is_white:
        return f"{move_number}. {move_str}"
    else:
        return move_str

def _moves_to_pgn(move_history: List[dict]) -> str:
    """Convert move history to strict PGN format (moves only, no metadata)"""
    if not move_history:
        return ""

    pgn_moves = []

    for idx, move in enumerate(move_history):
        is_white = idx % 2 == 0
        move_number = (idx // 2) + 1

        if is_white:
            pgn_moves.append(f"{move_number}. {move['from']}{move['to']}")
        else:
            pgn_moves.append(f"{move['from']}{move['to']}")

    return " ".join(pgn_moves)

def _get_ai_system_prompt() -> str:
    """Get improved system prompt for AI chess engines with in-context examples"""
    return """You are a chess engine. You must repeat the entire game exactly, then provide ONE legal next move in algebraic notation. No explanations.

Example 1:
Game: 1. e2e4 e7e5 2. Ng1f3 Nb8c6 3. Bf1b5
Your move: a7a6

Example 2:
Game: 1. d2d4 d7d5 2. c2c4 e7e6 3. Nb1c3 Ng8f6 4. Bc1g5
Your move: Bf8e7

Example 3:
Game: 1. e2e4 c7c5 2. Ng1f3 d7d6 3. d2d4 c5d4 4. Nf3d4 Ng8f6 5. Nb1c3
Your move: a7a6

Format: Repeat the entire game in PGN format, then provide your next move as JSON: {"from":"e2", "to":"e4", "promotion":null}"""

def _get_ai_user_prompt(board, side, legal_moves) -> str:
    """Get user prompt with strict PGN format and no metadata"""
    # Convert move history to strict PGN format
    pgn_game = _moves_to_pgn(STATE.get("move_history", []))

    # If no moves yet, start with empty game
    if not pgn_game:
        pgn_game = "[Game start]"

    # Format legal moves as JSON list for clarity
    legal_moves_str = str(legal_moves)

    prompt = (
        f"Game: {pgn_game}\n\n"
        f"Legal moves: {legal_moves_str}\n\n"
        f"Provide your next move as JSON: {{\"from\":\"XX\", \"to\":\"YY\", \"promotion\":null}}"
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

@app.get("/models")
def get_models():
    """Get available AI models"""
    return {"models": {k: k for k in ENGINES.keys()}}

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

    # Validate and potentially fix the AI's chosen move
    if mv not in pool:
        print(f"Warning: {bot_name} returned invalid move {mv}, using fallback")
        # Find a non-repeating fallback
        mv = pool[0]
        for candidate in pool:
            cfx, cfy, ctx, cty = candidate
            if not _is_immediate_reversal(cfx, cfy, ctx, cty) and not _would_repeat_position(board, cfx, cfy, ctx, cty):
                mv = candidate
                break
    else:
        # AI returned a valid move, but check if it would repeat or reverse
        fx, fy, tx, ty = mv
        if _is_immediate_reversal(fx, fy, tx, ty) or _would_repeat_position(board, fx, fy, tx, ty):
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

# TicTacToe API endpoints
@app.get("/tictactoe/state")
def get_tictactoe_state():
    """Get current TicTacToe game state"""
    return tictactoe_game.get_state()

@app.post("/tictactoe/move")
def make_tictactoe_move(move: TicTacToeMove):
    """Make a move in TicTacToe"""
    success = tictactoe_game.make_move(move.row, move.col)
    if not success:
        raise HTTPException(400, "Invalid move")
    return tictactoe_game.get_state()

@app.post("/tictactoe/reset")
def reset_tictactoe():
    """Reset TicTacToe game"""
    tictactoe_game.reset()
    return tictactoe_game.get_state()

@app.get("/tictactoe/valid-moves")
def get_tictactoe_valid_moves():
    """Get valid moves for current TicTacToe state"""
    moves = tictactoe_game.get_valid_moves()
    return {"valid_moves": [{"row": row, "col": col} for row, col in moves]}

# Go API endpoints
@app.get("/go/state")
def get_go_state():
    """Get current Go game state"""
    return {
        "board": GO_STATE["board"],
        "turn": GO_STATE["turn"],
        "last_move": GO_STATE["last_move"],
        "captured": GO_STATE["captured"],
        "board_size": GO_STATE["board_size"],
    }

@app.post("/go/new")
def new_go_game():
    """Start a new Go game"""
    GO_STATE["board"] = create_go_board(GO_STATE["board_size"])
    GO_STATE["turn"] = "black"
    GO_STATE["last_move"] = None
    GO_STATE["game_start_time"] = datetime.utcnow()
    GO_STATE["move_count"] = 0
    GO_STATE["game_active"] = True
    GO_STATE["last_board_state"] = None
    GO_STATE["captured"] = {"black": 0, "white": 0}
    return get_go_state()

@app.post("/go/reset")
def reset_go_game():
    """Reset Go game"""
    GO_STATE["board"] = create_go_board(GO_STATE["board_size"])
    GO_STATE["turn"] = "black"
    GO_STATE["last_move"] = None
    GO_STATE["game_start_time"] = None
    GO_STATE["move_count"] = 0
    GO_STATE["game_active"] = False
    GO_STATE["last_board_state"] = None
    GO_STATE["captured"] = {"black": 0, "white": 0}
    return get_go_state()

class GoMovePayload(BaseModel):
    x: int
    y: int

@app.post("/go/move")
async def make_go_move_endpoint(payload: GoMovePayload):
    """Make a move in Go game"""
    board = GO_STATE["board"]
    turn = GO_STATE["turn"]

    x, y = payload.x, payload.y

    # Check if it's a valid position
    if not (0 <= x < GO_STATE["board_size"] and 0 <= y < GO_STATE["board_size"]):
        raise HTTPException(400, "Position out of bounds")

    # Determine stone color
    color = 'B' if turn == "black" else 'W'

    # Save current board for Ko rule
    prev_board = [row[:] for row in board]

    # Try to make the move
    success, error, captured = make_go_move(board, x, y, color, GO_STATE["last_board_state"])

    if not success:
        raise HTTPException(400, error)

    # Update captured count
    if turn == "black":
        GO_STATE["captured"]["black"] += captured
    else:
        GO_STATE["captured"]["white"] += captured

    # Update game state
    GO_STATE["last_move"] = {"x": x, "y": y, "color": turn}
    GO_STATE["move_count"] += 1
    GO_STATE["last_board_state"] = prev_board

    # Switch turns
    GO_STATE["turn"] = "white" if turn == "black" else "black"

    return {
        "board": board,
        "turn": GO_STATE["turn"],
        "last_move": GO_STATE["last_move"],
        "captured": GO_STATE["captured"],
    }

@app.post("/go/pass")
async def pass_go_move():
    """Pass turn in Go game"""
    GO_STATE["turn"] = "white" if GO_STATE["turn"] == "black" else "black"
    GO_STATE["last_move"] = {"pass": True, "color": "black" if GO_STATE["turn"] == "white" else "white"}
    return get_go_state()

@app.get("/go/score")
def get_go_score():
    """Get current score of the Go game"""
    black_score, white_score = score_go_board(GO_STATE["board"])
    return {
        "black": black_score,
        "white": white_score,
        "captured_by_black": GO_STATE["captured"]["black"],
        "captured_by_white": GO_STATE["captured"]["white"],
    }

@app.get("/go/valid-moves")
def get_go_valid_moves_endpoint():
    """Get all valid moves for current player"""
    board = GO_STATE["board"]
    turn = GO_STATE["turn"]
    color = 'B' if turn == "black" else 'W'

    valid_moves = get_go_valid_moves(board, color, GO_STATE["last_board_state"])

    return {
        "valid_moves": [{"x": x, "y": y} for x, y in valid_moves],
        "count": len(valid_moves)
    }

@app.post("/go/ai-step")
async def go_ai_step():
    """Let AI make a move in Go game"""
    board = GO_STATE["board"]
    turn = GO_STATE["turn"]
    bot_name = BOTS[turn]

    if not bot_name:
        raise HTTPException(400, f"No bot assigned for {turn}")

    engine = ENGINES.get(bot_name)
    if not engine:
        raise HTTPException(500, f"Bot engine not found: {bot_name}")

    # Get valid moves
    color = 'B' if turn == "black" else 'W'
    valid_moves = get_go_valid_moves(board, color, GO_STATE["last_board_state"])

    if not valid_moves:
        # No valid moves, pass
        return await pass_go_move()

    try:
        # Use AI engine to choose a move
        if hasattr(engine, 'choose_go_move'):
            move_result = engine.choose_go_move(board, color, valid_moves)
            if move_result:
                x, y = move_result
            else:
                # Fallback to random if AI returns None
                import random
                x, y = random.choice(valid_moves)
        else:
            # Fallback to random if engine doesn't have choose_go_move method
            print(f"Warning: {bot_name} doesn't have choose_go_move method, using random")
            import random
            x, y = random.choice(valid_moves)

    except Exception as e:
        print(f"Engine error for {bot_name}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to random move
        import random
        x, y = random.choice(valid_moves)

    # Validate the chosen move
    if (x, y) not in valid_moves:
        print(f"Warning: {bot_name} returned invalid move ({x}, {y}), choosing random")
        import random
        x, y = random.choice(valid_moves)

    # Make the move
    prev_board = [row[:] for row in board]
    success, error, captured = make_go_move(board, x, y, color, GO_STATE["last_board_state"])

    if not success:
        raise HTTPException(500, f"AI made invalid move: {error}")

    # Update captured count
    if turn == "black":
        GO_STATE["captured"]["black"] += captured
    else:
        GO_STATE["captured"]["white"] += captured

    # Update game state
    GO_STATE["last_move"] = {"x": x, "y": y, "color": turn}
    GO_STATE["move_count"] += 1
    GO_STATE["last_board_state"] = prev_board

    # Switch turns
    GO_STATE["turn"] = "white" if turn == "black" else "black"

    return {
        "board": board,
        "turn": GO_STATE["turn"],
        "last_move": GO_STATE["last_move"],
        "captured": GO_STATE["captured"],
    }