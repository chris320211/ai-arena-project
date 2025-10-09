from typing import List, Optional, Tuple, Literal
from pydantic import BaseModel

PlayerType = Literal['X', 'O']
CellType = Optional[PlayerType]
BoardType = List[List[CellType]]

class TicTacToeMove(BaseModel):
    row: int
    col: int
    player: PlayerType

class TicTacToeState(BaseModel):
    board: BoardType
    current_player: PlayerType
    game_over: bool
    winner: Optional[PlayerType]
    is_draw: bool

class TicTacToeGame:
    def __init__(self):
        self.board: BoardType = [[None for _ in range(3)] for _ in range(3)]
        self.current_player: PlayerType = 'X'
        self.game_over = False
        self.winner: Optional[PlayerType] = None
        self.is_draw = False

    def reset(self):
        """Reset the game to initial state"""
        self.board = [[None for _ in range(3)] for _ in range(3)]
        self.current_player = 'X'
        self.game_over = False
        self.winner = None
        self.is_draw = False

    def get_state(self) -> TicTacToeState:
        """Get current game state"""
        return TicTacToeState(
            board=self.board,
            current_player=self.current_player,
            game_over=self.game_over,
            winner=self.winner,
            is_draw=self.is_draw
        )

    def is_valid_move(self, row: int, col: int) -> bool:
        """Check if a move is valid"""
        if self.game_over:
            return False
        if row < 0 or row >= 3 or col < 0 or col >= 3:
            return False
        return self.board[row][col] is None

    def make_move(self, row: int, col: int) -> bool:
        """Make a move and return True if successful"""
        if not self.is_valid_move(row, col):
            return False

        self.board[row][col] = self.current_player

        # Check for winner
        winner = self.check_winner()
        if winner:
            self.winner = winner
            self.game_over = True
        elif self.is_board_full():
            self.is_draw = True
            self.game_over = True
        else:
            # Switch players
            self.current_player = 'O' if self.current_player == 'X' else 'X'

        return True

    def check_winner(self) -> Optional[PlayerType]:
        """Check if there's a winner"""
        # Check rows
        for row in self.board:
            if row[0] and row[0] == row[1] == row[2]:
                return row[0]

        # Check columns
        for col in range(3):
            if (self.board[0][col] and
                self.board[0][col] == self.board[1][col] == self.board[2][col]):
                return self.board[0][col]

        # Check diagonals
        if (self.board[0][0] and
            self.board[0][0] == self.board[1][1] == self.board[2][2]):
            return self.board[0][0]

        if (self.board[0][2] and
            self.board[0][2] == self.board[1][1] == self.board[2][0]):
            return self.board[0][2]

        return None

    def is_board_full(self) -> bool:
        """Check if the board is full"""
        for row in self.board:
            for cell in row:
                if cell is None:
                    return False
        return True

    def get_valid_moves(self) -> List[Tuple[int, int]]:
        """Get list of valid moves"""
        moves = []
        if not self.game_over:
            for row in range(3):
                for col in range(3):
                    if self.board[row][col] is None:
                        moves.append((row, col))
        return moves