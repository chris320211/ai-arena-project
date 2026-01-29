"""
Utility functions for chess game operations.

This module contains helper functions for:
- Board manipulation and validation
- Algebraic notation conversion
- Move history tracking
- AI prompt generation
"""

from typing import List, Tuple
from .chess_logic import get_piece_moves, move_piece, is_in_check


# Chess board helper functions

def _clone_board(board):
    """Create a deep copy of the chess board"""
    return [row[:] for row in board]


def _is_strict_legal(board, side: str, fx: int, fy: int, tx: int, ty: int) -> bool:
    """
    Check if a move is strictly legal (doesn't leave king in check).

    Args:
        board: Current board state
        side: 'white' or 'black'
        fx, fy: From coordinates
        tx, ty: To coordinates

    Returns:
        True if move is legal, False otherwise
    """
    if (tx, ty) not in get_piece_moves(board, fx, fy):
        return False
    temp = _clone_board(board)
    move_piece(temp, fx, fy, tx, ty)
    return not is_in_check(temp, side)


def _collect_legal_moves_for_side(board, side):
    """
    Collect all legal moves for a given side.

    Args:
        board: Current board state
        side: 'white' or 'black'

    Returns:
        List of tuples (fx, fy, tx, ty) representing legal moves
    """
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


# Algebraic notation conversion

FILES = ["a", "b", "c", "d", "e", "f", "g", "h"]
RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"]


def _xy_to_alg(x: int, y: int) -> str:
    """
    Convert board coordinates to algebraic notation.

    Args:
        x: Row (0-7)
        y: Column (0-7)

    Returns:
        Algebraic notation (e.g., 'e4')
    """
    file_ = FILES[y]
    rank_ = RANKS[7 - x]
    return f"{file_}{rank_}"


def _alg_to_xy(sq: str) -> Tuple[int, int]:
    """
    Convert algebraic notation to board coordinates.

    Args:
        sq: Algebraic notation (e.g., 'e4')

    Returns:
        Tuple of (x, y) coordinates
    """
    sq = sq.strip().lower()
    f = sq[0]
    r = sq[1]
    y = FILES.index(f)
    x = 7 - RANKS.index(r)
    return x, y


def _board_array(board) -> List[List[str]]:
    """
    Convert board to 2D array format.

    Args:
        board: Current board state

    Returns:
        2D list representation of board
    """
    arr: List[List[str]] = []
    for x in range(8):
        row: List[str] = []
        for y in range(8):
            row.append(board[x][y])
        arr.append(row)
    return arr


def _board_to_string(board) -> str:
    """
    Convert board to string for position comparison.

    Args:
        board: Current board state

    Returns:
        String representation of board
    """
    return ''.join(''.join(row) for row in board)


def _legal_moves_alg(board, side) -> List[dict]:
    """
    Get all legal moves in algebraic notation.

    Args:
        board: Current board state
        side: 'white' or 'black'

    Returns:
        List of dicts with 'from' and 'to' in algebraic notation
    """
    tuples = _collect_legal_moves_for_side(board, side)
    out: List[dict] = []
    for fx, fy, tx, ty in tuples:
        out.append({"from": _xy_to_alg(fx, fy), "to": _xy_to_alg(tx, ty)})
    return out


# Move history and position tracking

def _would_repeat_position(board, fx: int, fy: int, tx: int, ty: int, position_history: list) -> bool:
    """
    Check if a move would create a threefold repetition.

    Args:
        board: Current board state
        fx, fy: From coordinates
        tx, ty: To coordinates
        position_history: List of previous board positions

    Returns:
        True if move would cause threefold repetition
    """
    # Create a temporary board with the proposed move
    temp = _clone_board(board)
    move_piece(temp, fx, fy, tx, ty)
    new_position = _board_to_string(temp)

    # Count how many times this position has occurred
    position_count = position_history.count(new_position)

    # If this position has already occurred twice, don't allow it (would be third time)
    return position_count >= 2


def _is_immediate_reversal(fx: int, fy: int, tx: int, ty: int, last_move: dict) -> bool:
    """
    Check if move immediately reverses the last move.

    Args:
        fx, fy: From coordinates
        tx, ty: To coordinates
        last_move: Dictionary with 'from' and 'to' keys

    Returns:
        True if move reverses last move
    """
    if not last_move:
        return False

    last_from = _alg_to_xy(last_move["from"])
    last_to = _alg_to_xy(last_move["to"])

    # Check if current move reverses the last move (same piece moving back)
    return (fx, fy) == last_to and (tx, ty) == last_from


# PGN (Portable Game Notation) functions

def _move_to_pgn(move: dict, board, move_number: int, is_white: bool) -> str:
    """
    Convert a move dict to PGN algebraic notation (simplified).

    Args:
        move: Dict with 'from' and 'to' keys
        board: Current board state
        move_number: Move number
        is_white: True if white's move

    Returns:
        PGN notation string
    """
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
    """
    Convert move history to strict PGN format (moves only, no metadata).

    Args:
        move_history: List of move dicts with 'from' and 'to' keys

    Returns:
        PGN format string
    """
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


# AI prompt generation

def _get_ai_system_prompt() -> str:
    """
    Get improved system prompt for AI chess engines with in-context examples.

    Returns:
        System prompt string with examples
    """
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


def _get_ai_user_prompt(board, side, legal_moves, move_history=None) -> str:
    """
    Get user prompt with strict PGN format.

    Args:
        board: Current board state
        side: 'white' or 'black'
        legal_moves: List of legal moves
        move_history: Optional list of previous moves

    Returns:
        User prompt string with game history
    """
    if move_history:
        return _get_ai_user_prompt_with_history(board, side, legal_moves, move_history)

    # Fallback for no history
    legal_moves_str = str(legal_moves)
    prompt = (
        f"Game: [Game start]\n\n"
        f"Legal moves: {legal_moves_str}\n\n"
        f"Provide your next move as JSON: {{\"from\":\"XX\", \"to\":\"YY\", \"promotion\":null}}"
    )
    return prompt


def _get_ai_user_prompt_with_history(board, side, legal_moves, move_history) -> str:
    """
    Get user prompt with strict PGN format including move history.

    Args:
        board: Current board state
        side: 'white' or 'black'
        legal_moves: List of legal moves
        move_history: List of previous moves

    Returns:
        User prompt string with game history
    """
    # Convert move history to strict PGN format
    pgn_game = _moves_to_pgn(move_history)

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
