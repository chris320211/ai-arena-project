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

castling_rights = {
    'white': {'K': True, 'Q': True},
    'black': {'K': True, 'Q': True}
}

def print_board(board):
    for row in board:
        print(' '.join(row))
    print() 

def _update_castling_rights_on_capture(to_x, to_y, captured_piece):
    if captured_piece == 'R':
        if (to_x, to_y) == (7, 0):
            castling_rights['white']['Q'] = False
        elif (to_x, to_y) == (7, 7):
            castling_rights['white']['K'] = False
    elif captured_piece == 'r':
        if (to_x, to_y) == (0, 0):
            castling_rights['black']['Q'] = False
        elif (to_x, to_y) == (0, 7):
            castling_rights['black']['K'] = False

def get_pawn_moves(board, x, y):
    piece = board[x][y]
    moves = []
    direction = -1 if piece == 'P' else 1  

    fwd1 = x + direction
    if 0 <= fwd1 < 8 and board[fwd1][y] == '.':
        moves.append((fwd1, y))

        if (piece == 'P' and x == 6) or (piece == 'p' and x == 1):
            fwd2 = x + 2 * direction
            if 0 <= fwd2 < 8 and board[fwd2][y] == '.':
                moves.append((fwd2, y))

    for dy in [-1, 1]:
        nx, ny = x + direction, y + dy
        if 0 <= nx < 8 and 0 <= ny < 8:
            target = board[nx][ny]
            if piece.isupper() and target.islower():
                moves.append((nx, ny))
            elif piece.islower() and target.isupper():
                moves.append((nx, ny))

    return moves

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

def get_queen_moves(board, x, y):
    return get_rook_moves(board, x, y) + get_bishop_moves(board, x, y)

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


    if piece == 'K' and x == 7 and y == 4:
        if castling_rights['white']['K'] and board[7][5] == board[7][6] == '.' and board[7][7] == 'R':
            if not is_in_check(board, 'white'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 7, 4, 7, 5)
                if not is_in_check(test_board, 'white'):
                    moves.append((7, 6))
        if castling_rights['white']['Q'] and board[7][1] == board[7][2] == board[7][3] == '.' and board[7][0] == 'R':
            if not is_in_check(board, 'white'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 7, 4, 7, 3)
                if not is_in_check(test_board, 'white'):
                    moves.append((7, 2))

    if piece == 'k' and x == 0 and y == 4:
        if castling_rights['black']['K'] and board[0][5] == board[0][6] == '.' and board[0][7] == 'r':
            if not is_in_check(board, 'black'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 0, 4, 0, 5)
                if not is_in_check(test_board, 'black'):
                    moves.append((0, 6))
        if castling_rights['black']['Q'] and board[0][1] == board[0][2] == board[0][3] == '.' and board[0][0] == 'r':
            if not is_in_check(board, 'black'):
                test_board = [row.copy() for row in board]
                move_piece(test_board, 0, 4, 0, 3)
                if not is_in_check(test_board, 'black'):
                    moves.append((0, 2))

    return moves

def get_attack_squares(board, x, y):
    piece = board[x][y]
    if piece == '.':
        return []
    attacks = []
    is_white = piece.isupper()
    p = piece.lower()

    def on_board(i, j):
        return 0 <= i < 8 and 0 <= j < 8

    if p == 'p':
        dir = -1 if is_white else 1
        for dy in (-1, 1):
            nx, ny = x + dir, y + dy
            if on_board(nx, ny):
                attacks.append((nx, ny))

    elif p == 'n':
        for dx, dy in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
            nx, ny = x + dx, y + dy
            if on_board(nx, ny):
                attacks.append((nx, ny))

    elif p == 'b' or p == 'r' or p == 'q':
        directions = []
        if p in ('b','q'):
            directions += [(-1,-1),(-1,1),(1,-1),(1,1)]
        if p in ('r','q'):
            directions += [(-1,0),(1,0),(0,-1),(0,1)]
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            while on_board(nx, ny):
                attacks.append((nx, ny))
                if board[nx][ny] != '.':
                    break
                nx += dx
                ny += dy

    elif p == 'k':
        for dx, dy in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
            nx, ny = x + dx, y + dy
            if on_board(nx, ny):
                attacks.append((nx, ny))

    return attacks

def is_in_check(board, color):
    king_symbol = 'K' if color == 'white' else 'k'
    king_pos = None
    for i in range(8):
        for j in range(8):
            if board[i][j] == king_symbol:
                king_pos = (i, j)
                break
        if king_pos:
            break

    for i in range(8):
        for j in range(8):
            piece = board[i][j]
            if piece == '.':
                continue
            if color == 'white' and piece.islower():
                if king_pos in get_attack_squares(board, i, j):
                    return True
            elif color == 'black' and piece.isupper():
                if king_pos in get_attack_squares(board, i, j):
                    return True
    return False

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
    captured = board[to_x][to_y]

    if captured in {'R', 'r'}:
        _update_castling_rights_on_capture(to_x, to_y, captured)

    if piece == 'K' and (from_x, from_y) == (7, 4):
        if (to_x, to_y) == (7, 6):
            board[7][5] = 'R'
            board[7][7] = '.'
        elif (to_x, to_y) == (7, 2):
            board[7][3] = 'R'
            board[7][0] = '.'
        castling_rights['white']['K'] = False
        castling_rights['white']['Q'] = False

    elif piece == 'k' and (from_x, from_y) == (0, 4):
        if (to_x, to_y) == (0, 6):
            board[0][5] = 'r'
            board[0][7] = '.'
        elif (to_x, to_y) == (0, 2):
            board[0][3] = 'r'
            board[0][0] = '.'
        castling_rights['black']['K'] = False
        castling_rights['black']['Q'] = False

    if piece == 'R':
        if (from_x, from_y) == (7, 0):
            castling_rights['white']['Q'] = False
        elif (from_x, from_y) == (7, 7):
            castling_rights['white']['K'] = False

    if piece == 'r':
        if (from_x, from_y) == (0, 0):
            castling_rights['black']['Q'] = False
        elif (from_x, from_y) == (0, 7):
            castling_rights['black']['K'] = False

    board[to_x][to_y] = piece
    board[from_x][from_y] = '.'

def handle_pawn_promotion(board, x, y):
    piece = board[x][y]
    
    if piece == 'P' and x == 0:
        choice = input("Promote pawn to (Q,R,B,N) [Q]: ").strip().upper()
        if choice not in {'Q', 'R', 'B', 'N'}:
            choice = 'Q'
        board[x][y] = choice
    
    elif piece == 'p' and x == 7:
        choice = input("Promote pawn to (q,r,b,n) [q]: ").strip().lower()
        if choice not in {'q', 'r', 'b', 'n'}:
            choice = 'q'
        board[x][y] = choice

def get_piece_moves(board, x, y):
    piece = board[x][y]
    if piece == '.':
        return []
    color = 'white' if piece.isupper() else 'black'
    if piece.lower() == 'p':
        raw_moves = get_pawn_moves(board, x, y)
    elif piece.lower() == 'r':
        raw_moves = get_rook_moves(board, x, y)
    elif piece.lower() == 'n':
        raw_moves = get_knight_moves(board, x, y)
    elif piece.lower() == 'b':
        raw_moves = get_bishop_moves(board, x, y)
    elif piece.lower() == 'q':
        raw_moves = get_queen_moves(board, x, y)
    elif piece.lower() == 'k':
        raw_moves = get_king_moves(board, x, y)
    else:
        raw_moves = []

    filtered_moves = []
    for to_x, to_y in raw_moves:
        test_board = [row.copy() for row in board]
        move_piece(test_board, x, y, to_x, to_y)
        if not is_in_check(test_board, color):
            filtered_moves.append((to_x, to_y))
    return filtered_moves

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
            handle_pawn_promotion(board, to_x, to_y)

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