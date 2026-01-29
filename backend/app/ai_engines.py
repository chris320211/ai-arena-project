"""
AI Engine implementations for chess and go games.

This module contains all AI engine classes that can play chess and go.
Each engine implements:
- choose(board, side) -> (fx, fy, tx, ty) for chess
- choose_go_move(board, color, valid_moves) -> (x, y) for go
"""

from __future__ import annotations

import os
import json
import re
import random
import requests
from typing import Optional, List, Tuple
from fastapi import HTTPException

# AI provider imports
from openai import OpenAI

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Import game logic
from .chess_logic import get_piece_moves, move_piece, is_in_check
from .go_logic import position_to_string as go_pos_to_string


class RandomAI:
    """Random move selector for baseline comparison"""

    def choose(self, board, side):
        """Choose a random legal chess move"""
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
                    # Check if move is legal (doesn't leave king in check)
                    temp = [row[:] for row in board]
                    move_piece(temp, x, y, tx, ty)
                    if not is_in_check(temp, side):
                        moves.append((x, y, tx, ty))

        if not moves:
            raise HTTPException(400, "No legal moves available")
        return random.choice(moves)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a random valid move for Go"""
        if not valid_moves:
            return None
        return random.choice(valid_moves)


class OllamaAI:
    """Ollama local LLM engine"""

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
        """Choose chess move using Ollama"""
        from .utils import _legal_moves_alg, _get_ai_system_prompt, _get_ai_user_prompt, _alg_to_xy

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
                snippet = txt[:160].replace("\n", " ")
                raise HTTPException(500, f"Ollama bad JSON; got: {snippet}...")

        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Ollama AI"""
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


class OpenAIAI:
    """OpenAI GPT engine"""

    def __init__(self, model: str):
        self.model = model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def choose(self, board, side):
        """Choose chess move using OpenAI"""
        from .utils import _legal_moves_alg, _get_ai_system_prompt, _get_ai_user_prompt, _alg_to_xy

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
                snippet = txt[:160].replace("\n", " ")
                raise HTTPException(500, f"OpenAI bad JSON; got: {snippet}...")

        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using OpenAI"""
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


class AnthropicAI:
    """Anthropic Claude engine"""

    def __init__(self, model: str):
        if not anthropic:
            raise ImportError("anthropic package not installed. Install with: pip install anthropic")
        self.model = model
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def choose(self, board, side):
        """Choose chess move using Claude"""
        from .utils import _legal_moves_alg, _get_ai_system_prompt, _get_ai_user_prompt, _alg_to_xy

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
                snippet = txt[:160].replace("\n", " ")
                raise HTTPException(500, f"Anthropic bad JSON; got: {snippet}...")

        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Anthropic Claude"""
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


class GeminiAI:
    """Google Gemini engine"""

    def __init__(self, model: str):
        if not genai:
            raise ImportError("google-generativeai package not installed. Install with: pip install google-generativeai")
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel(model)

    def choose(self, board, side):
        """Choose chess move using Gemini"""
        from .utils import _legal_moves_alg, _get_ai_system_prompt, _get_ai_user_prompt, _alg_to_xy

        legal = _legal_moves_alg(board, side)
        system_text = _get_ai_system_prompt()
        user_text = _get_ai_user_prompt(board, side, legal)

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
                    if isinstance(o, dict) and "to" in o and ("from" in o or "from_" in o):
                        obj = o
                        break
                except Exception:
                    continue
            if obj is None:
                snippet = txt[:160].replace("\n", " ")
                raise HTTPException(500, f"Gemini bad JSON; got: {snippet}...")

        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using Gemini"""
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


class HttpAI:
    """Generic HTTP API AI engine for custom providers"""

    def __init__(self, name: str, url: str, headers: dict, model: str):
        self.name = name
        self.url = url
        self.headers = headers
        self.model = model

    def choose(self, board, side):
        """Choose chess move using HTTP API"""
        from .utils import _legal_moves_alg, _get_ai_system_prompt, _get_ai_user_prompt, _alg_to_xy

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
                snippet = txt[:160].replace("\n", " ")
                raise HTTPException(500, f"{self.name} bad JSON; got: {snippet}...")

        if "from" in obj and "from_" not in obj:
            obj["from_"] = obj["from"]
        fx, fy = _alg_to_xy(obj["from_"])
        tx, ty = _alg_to_xy(obj["to"])
        return (fx, fy, tx, ty)

    def choose_go_move(self, board, color, valid_moves):
        """Choose a Go move using HTTP AI"""
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


def create_ai_engine(engine_type, *args, **kwargs):
    """Factory function to safely create AI engines"""
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
