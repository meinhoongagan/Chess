import chess
import pydantic


class Game:
    def __init__(self):
        self.player1 = None
        self.player2 = None
        self.player1_socket = None
        self.player2_socket = None
        self.current_turn = None
        self.board = None
        self.status = None
        self.moves = None

    def start(self, player1: str, player2: str):
        self.player1 = player1
        self.player2 = player2
        self.board = chess.Board()
        self.status = "ongoing"
        self.moves = []

    def end(self, status: str):
        self.status = status

    def move(self, move: str):
        try:    
            uci_move = self.board.parse_san(move).uci()
            self.board.push_uci(uci_move)
            self.moves.append(move)
            print(self.board)
        except ValueError:
            raise ValueError(f"Illegal move: {move}")
    
    def update_status(self: None):
        
        if self.board.is_checkmate():
            self.status = "checkmate"
        elif self.board.is_stalemate():
            self.status = "stalemate"
        elif self.board.is_insufficient_material():
            self.status = "draw"
        else:
            self.status = "ongoing"

    def isValidMove(self, move: str):
        move  = self.board.parse_san(move).uci()
        return chess.Move.from_uci(move) in self.board.legal_moves

    def get_board(self):
        return self.board
    
    def get_status(self):
        return self.status
    
    def get_moves(self):
        return self.moves