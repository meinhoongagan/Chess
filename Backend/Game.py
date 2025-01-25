import chess
import pydantic
import chess.engine

# Start Stockfish engine
engine = chess.engine.SimpleEngine.popen_uci(
    "/mnt/c/users/gagan/onedrive/desktop/chess/backend/stockfish-windows-x86-64-avx2/stockfish/stockfish-windows-x86-64-avx2.exe"
)

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
        self.flag = False

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
        move = self.board.parse_san(move).uci()
        return chess.Move.from_uci(move) in self.board.legal_moves

    def get_board(self):
        return self.board
    
    def get_status(self):
        return self.status
    
    def get_moves(self):
        return self.moves

    def get_evaluation(self):
        evaluation = engine.analyse(self.board, chess.engine.Limit(time=0.2))
        score = evaluation['score'].relative.score(mate_score=10000)
        return score / 100.0  

    def suggest_move(self):
        result = engine.play(self.board, chess.engine.Limit(time=0.5))
        return result.move.uci()

    def analyze_position(self):
        evaluation = self.get_evaluation()
        best_move = self.suggest_move()
        # winning_chances = self.get_winning_chances(evaluation)
        return {"evaluation": evaluation, "best_move": best_move}

    def get_winning_chances(self, evaluation):
        if evaluation is 0:
            return {"white": 50.0, "black": 50.0}
        if(self.flag):
            if evaluation >= 0:
                white_chances = round(50 + evaluation, 2)
                black_chances = round(100 - white_chances, 2)
            else:
                black_chances = round(50 + abs(evaluation), 2)
                white_chances = round(100 - black_chances, 2)
            self.flag = False
        else:
            if evaluation >= 0:
                black_chances = round(50 + evaluation * 10, 2)
                white_chances = round(100 - black_chances, 2)
            else:
                white_chances = round(50 + abs(evaluation) * 10, 2)
                black_chances = round(100 - white_chances, 2)
            self.flag = True
        
        return {"white": white_chances, "black": black_chances}


    def get_pv_moves(self):
        analysis = engine.analyse(self.board, chess.engine.Limit(time=1.0)) 
        pv_moves = analysis.get("pv", [])
        return [move.uci() for move in pv_moves]