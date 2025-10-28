"""
Go game logic implementation
Supports standard Go rules including:
- Stone placement
- Capture (removing stones with no liberties)
- Ko rule (preventing immediate recapture)
- Suicide rule (preventing moves that would result in self-capture without capturing opponent stones)
"""

from typing import List, Tuple, Set, Optional

def create_board(size: int = 19) -> List[List[str]]:
    """Create an empty Go board of given size (default 19x19)"""
    return [['.' for _ in range(size)] for _ in range(size)]

def print_board(board: List[List[str]]):
    """Print the board state"""
    size = len(board)
    # Print column headers
    print('   ', end='')
    for i in range(size):
        print(chr(65 + i), end=' ')
    print()

    # Print rows with row numbers
    for i, row in enumerate(board):
        print(f'{i+1:2d} ', end='')
        for cell in row:
            if cell == '.':
                print('·', end=' ')
            elif cell == 'B':
                print('●', end=' ')
            elif cell == 'W':
                print('○', end=' ')
        print()
    print()

def is_valid_position(board: List[List[str]], x: int, y: int) -> bool:
    """Check if position is within board bounds"""
    size = len(board)
    return 0 <= x < size and 0 <= y < size

def get_neighbors(board: List[List[str]], x: int, y: int) -> List[Tuple[int, int]]:
    """Get valid neighboring positions (up, down, left, right)"""
    neighbors = []
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = x + dx, y + dy
        if is_valid_position(board, nx, ny):
            neighbors.append((nx, ny))
    return neighbors

def get_group(board: List[List[str]], x: int, y: int, visited: Set[Tuple[int, int]] = None) -> Set[Tuple[int, int]]:
    """Get all connected stones of the same color (a group)"""
    if visited is None:
        visited = set()

    if (x, y) in visited:
        return visited

    color = board[x][y]
    if color == '.':
        return visited

    visited.add((x, y))

    for nx, ny in get_neighbors(board, x, y):
        if board[nx][ny] == color and (nx, ny) not in visited:
            get_group(board, nx, ny, visited)

    return visited

def count_liberties(board: List[List[str]], x: int, y: int) -> int:
    """Count the number of liberties (empty adjacent spaces) for a group"""
    color = board[x][y]
    if color == '.':
        return 0

    group = get_group(board, x, y)
    liberties = set()

    for gx, gy in group:
        for nx, ny in get_neighbors(board, gx, gy):
            if board[nx][ny] == '.':
                liberties.add((nx, ny))

    return len(liberties)

def remove_captured_stones(board: List[List[str]], opponent_color: str) -> int:
    """Remove all captured stones (groups with 0 liberties) of the opponent color"""
    size = len(board)
    captured_count = 0
    checked = set()

    for x in range(size):
        for y in range(size):
            if board[x][y] == opponent_color and (x, y) not in checked:
                group = get_group(board, x, y)
                checked.update(group)

                # Check if this group has no liberties
                if count_liberties(board, x, y) == 0:
                    # Remove the group
                    for gx, gy in group:
                        board[gx][gy] = '.'
                        captured_count += 1

    return captured_count

def is_valid_move(board: List[List[str]], x: int, y: int, color: str, last_board_state: Optional[List[List[str]]] = None) -> Tuple[bool, str]:
    """
    Check if a move is valid according to Go rules
    Returns (is_valid, error_message)
    """
    # Check if position is on the board
    if not is_valid_position(board, x, y):
        return False, "Position is out of bounds"

    # Check if position is empty
    if board[x][y] != '.':
        return False, "Position is already occupied"

    # Make a copy of the board to test the move
    test_board = [row[:] for row in board]
    test_board[x][y] = color

    # Determine opponent color
    opponent_color = 'W' if color == 'B' else 'B'

    # Remove any captured opponent stones
    captured = remove_captured_stones(test_board, opponent_color)

    # Check for suicide (placing a stone with no liberties that doesn't capture anything)
    if count_liberties(test_board, x, y) == 0 and captured == 0:
        return False, "Suicide move is not allowed (stone would have no liberties)"

    # Check for Ko rule (preventing immediate recapture that would repeat board state)
    if last_board_state is not None:
        if test_board == last_board_state:
            return False, "Ko rule violation (cannot immediately recapture)"

    return True, ""

def make_move(board: List[List[str]], x: int, y: int, color: str, last_board_state: Optional[List[List[str]]] = None) -> Tuple[bool, str, int]:
    """
    Make a move on the board
    Returns (success, error_message, captured_count)
    """
    is_valid, error = is_valid_move(board, x, y, color, last_board_state)
    if not is_valid:
        return False, error, 0

    # Place the stone
    board[x][y] = color

    # Determine opponent color
    opponent_color = 'W' if color == 'B' else 'B'

    # Remove captured stones
    captured = remove_captured_stones(board, opponent_color)

    return True, "", captured

def get_all_valid_moves(board: List[List[str]], color: str, last_board_state: Optional[List[List[str]]] = None) -> List[Tuple[int, int]]:
    """Get all valid moves for the given color"""
    size = len(board)
    valid_moves = []

    for x in range(size):
        for y in range(size):
            if board[x][y] == '.':
                is_valid, _ = is_valid_move(board, x, y, color, last_board_state)
                if is_valid:
                    valid_moves.append((x, y))

    return valid_moves

def score_board(board: List[List[str]]) -> Tuple[int, int]:
    """
    Score the board using area scoring (territory + stones)
    Returns (black_score, white_score)
    """
    size = len(board)
    black_score = 0
    white_score = 0
    visited = set()

    # Count stones and territory
    for x in range(size):
        for y in range(size):
            if (x, y) in visited:
                continue

            if board[x][y] == 'B':
                black_score += 1
                visited.add((x, y))
            elif board[x][y] == 'W':
                white_score += 1
                visited.add((x, y))
            elif board[x][y] == '.':
                # Find territory (empty spaces surrounded by one color)
                territory = set()
                territory.add((x, y))
                border_colors = set()

                # Flood fill to find connected empty spaces
                queue = [(x, y)]
                while queue:
                    cx, cy = queue.pop(0)
                    for nx, ny in get_neighbors(board, cx, cy):
                        if (nx, ny) not in territory:
                            if board[nx][ny] == '.':
                                territory.add((nx, ny))
                                queue.append((nx, ny))
                            else:
                                border_colors.add(board[nx][ny])

                # If territory is surrounded by only one color, count it
                if len(border_colors) == 1:
                    territory_size = len(territory)
                    if 'B' in border_colors:
                        black_score += territory_size
                    else:
                        white_score += territory_size

                visited.update(territory)

    return black_score, white_score

def position_to_string(x: int, y: int) -> str:
    """Convert board coordinates to string notation (e.g., A1, B2)"""
    return f"{chr(65 + y)}{x + 1}"

def string_to_position(pos: str) -> Tuple[int, int]:
    """Convert string notation to board coordinates"""
    pos = pos.strip().upper()
    col = ord(pos[0]) - 65
    row = int(pos[1:]) - 1
    return row, col

if __name__ == "__main__":
    # Test the Go logic
    board = create_board(9)  # Use 9x9 for testing
    turn = 'B'  # Black goes first
    last_board = None

    print("Go Game - Enter positions like 'A1', 'B2', etc. Enter 'pass' to pass, 'quit' to exit.")
    print_board(board)

    while True:
        print(f"\n{'Black' if turn == 'B' else 'White'}'s turn")

        try:
            move = input("Enter move: ").strip().lower()

            if move == 'quit':
                break

            if move == 'pass':
                print(f"{'Black' if turn == 'B' else 'White'} passes.")
                turn = 'W' if turn == 'B' else 'B'
                continue

            # Save current board state
            prev_board = [row[:] for row in board]

            x, y = string_to_position(move)
            success, error, captured = make_move(board, x, y, turn, last_board)

            if not success:
                print(f"Invalid move: {error}")
                continue

            if captured > 0:
                print(f"Captured {captured} stone(s)!")

            print_board(board)

            # Update last board state for Ko rule
            last_board = prev_board

            # Switch turns
            turn = 'W' if turn == 'B' else 'B'

        except Exception as e:
            print(f"Error: {e}")
            continue

    # Score the game
    black_score, white_score = score_board(board)
    print(f"\nFinal Score:")
    print(f"Black: {black_score}")
    print(f"White: {white_score}")
    print(f"Winner: {'Black' if black_score > white_score else 'White' if white_score > black_score else 'Tie'}")
