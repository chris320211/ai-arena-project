# create 8x8 array representing board
#lowercase=black, uppercase=white
def create_board():
    return [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.'],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ]

# print board in terminal
def print_board(board):
    for row in board:
        print(' '.join(row))
    print() 

# pawn logic
def get_pawn_moves(board, x, y):
    piece = board[x][y]
    moves = []
    direction = -1 if piece == 'P' else 1  


    if board[x + direction][y] == '.':
        moves.append((x + direction, y))

        if (piece == 'P' and x == 6) or (piece == 'p' and x == 1):
            if board[x + 2 * direction][y] == '.':
                moves.append((x + 2 * direction, y))

    for dy in [-1, 1]:
        nx, ny = x + direction, y + dy
        if 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if piece.isupper() and target.islower():
                moves.append((nx, ny))
            elif piece.islower() and target.isupper():
                moves.append((nx, ny))

    return moves

#rook move
def get_rook_moves(board, x, y):
    piece = board[x][y]
    moves = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    for dx, dy in directions:
        nx, ny = x + dx, y + dy
        while 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if target == '.':
                moves.append((nx, ny))
            elif (piece.isupper() and target.islower()) or (piece.islower() and target.isupper()):
                moves.append((nx, ny))
                break
            else:
                break
            nx += dx
            ny += dy
    return moves

#knight move
def get_knight_moves(board, x, y):
    piece = board[x][y]
    moves = []
    knight_jumps = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                    (1, -2), (1, 2), (2, -1), (2, 1)]

    for dx, dy in knight_jumps:
        nx, ny = x + dx, y + dy
        if 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if target == '.' or (piece.isupper() and target.islower()) or (piece.islower() and target.isupper()):
                moves.append((nx, ny))
    return moves

#bishop move
def get_bishop_moves(board, x, y):
    piece = board[x][y]
    moves = []
    directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]

    for dx, dy in directions:
        nx, ny = x + dx, y + dy
        while 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if target == '.':
                moves.append((nx, ny))
            elif (piece.isupper() and target.islower()) or (piece.islower() and target.isupper()):
                moves.append((nx, ny))
                break
            else:
                break
            nx += dx
            ny += dy
    return moves

#queen move
def get_queen_moves(board, x, y):
    return get_rook_moves(board, x, y) + get_bishop_moves(board, x, y)

#king move
def get_king_moves(board, x, y):
    piece = board[x][y]
    moves = []
    directions = [(-1, -1), (-1, 0), (-1, 1),
                  (0, -1),          (0, 1),
                  (1, -1), (1, 0), (1, 1)]

    for dx, dy in directions:
        nx, ny = x + dx, y + dy
        if 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if target == '.' or (piece.isupper() and target.islower()) or (piece.islower() and target.isupper()):
                moves.append((nx, ny))


    #castling
    if piece == 'K' and x == 7 and y == 4:
        # King-side
        if board[7][5] == board[7][6] == '.' and board[7][7] == 'R':
            if not is_in_check(board, 'white'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 7, 4, 7, 5)
                if not is_in_check(test_board, 'white'):
                    moves.append((7, 6))
        # Queen-side
        if board[7][1] == board[7][2] == board[7][3] == '.' and board[7][0] == 'R':
            if not is_in_check(board, 'white'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 7, 4, 7, 3)
                if not is_in_check(test_board, 'white'):
                    moves.append((7, 2))

    if piece == 'k' and x == 0 and y == 4:
        #kingside
        if board[0][5] == board[0][6] == '.' and board[0][7] == 'r':
            if not is_in_check(board, 'black'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 0, 4, 0, 5)
                if not is_in_check(test_board, 'black'):
                    moves.append((0, 6))
        #queenside
        if board[0][1] == board[0][2] == board[0][3] == '.' and board[0][0] == 'r':
            if not is_in_check(board, 'black'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 0, 4, 0, 3)
                if not is_in_check(test_board, 'black'):
                    moves.append((0, 2))

    return moves

#king check
def is_in_check(board, color):
    king_symbol = 'K' if color == 'white' else 'k'
    king_pos = None
    for x in range(8):
        for y in range(8):
            if board[x][y] == king_symbol:
                king_pos = (x, y)
                break
        if king_pos:
            break

    for x in range(8):
        for y in range(8):
            piece = board[x][y]
            if piece == '.' or (color == 'white' and piece.isupper()) or (color == 'black' and piece.islower()):
                continue
            moves = get_piece_moves(board, x, y)
            if king_pos in moves:
                return True
    return False

#checkmate check
def is_checkmate(board, color):
    if not is_in_check(board, color):
        return False

    for x in range(8):
        for y in range(8):
            piece = board[x][y]
            if piece == '.' or (color == 'white' and piece.islower()) or (color == 'black' and piece.isupper()):
                continue

            moves = get_piece_moves(board, x, y)
            for move in moves:
                test_board = [row.copy() for row in board]
                move_piece(test_board, x, y, move[0], move[1])

                if not is_in_check(test_board, color):
                    return False  

    return True

#stalemate check
def is_stalemate(board, color):
    if is_in_check(board, color):
        return False

    for x in range(8):
        for y in range(8):
            piece = board[x][y]
            if piece == '.' or (color == 'white' and piece.islower()) or (color == 'black' and piece.isupper()):
                continue

            moves = get_piece_moves(board, x, y)
            for move in moves:
                test_board = [row.copy() for row in board]
                move_piece(test_board, x, y, move[0], move[1])
                if not is_in_check(test_board, color):
                    return False
    return True

def move_piece(board, from_x, from_y, to_x, to_y):
    piece = board[from_x][from_y]
    board[to_x][to_y] = piece
    board[from_x][from_y] = '.'

def get_piece_moves(board, x, y):
    piece = board[x][y]
    if piece.lower() == 'p':
        return get_pawn_moves(board, x, y)
    elif piece.lower() == 'r':
        return get_rook_moves(board, x, y)
    elif piece.lower() == 'n':
        return get_knight_moves(board, x, y)
    elif piece.lower() == 'b':
        return get_bishop_moves(board, x, y)
    elif piece.lower() == 'q':
        return get_queen_moves(board, x, y)
    elif piece.lower() == 'k':
        return get_king_moves(board, x, y)
    return []

#  RUNNING COMMAND
if __name__ == "__main__":
    board = create_board()
    turn = 'white'  
    while True:
        print_board(board)
        print(f"\n{turn.capitalize()}'s turn")

        try:
            
            x = int(input("Enter piece row (0-7): "))
            y = int(input("Enter piece column (0-7): "))
            piece = board[x][y]

            
            if piece == '.':
                print("No piece at that position.")
                continue
            if turn == 'white' and piece.islower():
                print("That's a black piece. It's white's turn.")
                continue
            if turn == 'black' and piece.isupper():
                print("That's a white piece. It's black's turn.")
                continue

            
            moves = get_piece_moves(board, x, y)
            if not moves:
                print("No valid moves for that piece.")
                continue

            print("Valid moves:", moves)

            
            to_x = int(input("Enter destination row: "))
            to_y = int(input("Enter destination column: "))

            if (to_x, to_y) not in moves:
                print("Invalid move.")
                continue

            move_piece(board, x, y, to_x, to_y)

            if is_checkmate(board, turn):
                print_board(board)
                print(f"Checkmate! {('White' if turn == 'black' else 'Black')} wins!")
                break
            elif is_stalemate(board, turn):
                print_board(board)
                print("Stalemate! The game is a draw.")
                break
            elif is_in_check(board, turn):
                print(f"{turn.capitalize()} is in check!")

            turn = 'black' if turn == 'white' else 'white'

        except Exception as e:
            print("⚠️ Error:", e)
            continue