import chess
import chess.engine
import os
import sys
import traceback
import math

# Get Stockfish path with extensive logging

stockfish_path = os.getenv("STOCKFISH_PATH", "app/backend/stockfish/stockfish-ubuntu-x86-64-avx2")
# stockfish_path = "/mnt/c/users/gagan/onedrive/desktop/chess/backend/stockfish/stockfish-ubuntu-x86-64-avx2"
# stockfish_path = os.path.join(os.path.dirname(__file__), '..', 'stockfish', 'stockfish-ubuntu-x86-64-avx2')

# stockfish_path = "/usr/local/bin/stockfish"

# Add extensive logging
print("Stockfish Configuration:")
print(f"STOCKFISH_PATH: {stockfish_path}")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Stockfish exists: {os.path.exists(stockfish_path)}")
print(f"Stockfish is executable: {os.access(stockfish_path, os.X_OK)}")

class Game:
    def __init__(self, game_id: int):
        try:
            # Add more detailed logging
            print(f"Attempting to launch Stockfish from: {stockfish_path}")
            
        #     # Verify file exists and is executable
            if not os.path.exists(stockfish_path):
                raise FileNotFoundError(f"Stockfish not found at {stockfish_path}")
            
            if not os.access(stockfish_path, os.X_OK):
                raise PermissionError(f"Stockfish at {stockfish_path} is not executable")
            
        #     # Attempt to launch Stockfish with verbose error handling
            self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
            print("Stockfish engine successfully launched")
        
        except Exception as e:
            print(f"CRITICAL ERROR launching Stockfish: {e}")
            traceback.print_exc()
            
        #     # Additional diagnostic information
            print("\nDiagnostic Information:")
            print(f"Current User: {os.getuid()}")
            print(f"File Permissions: {oct(os.stat(stockfish_path).st_mode)[-3:]}")
            
            # raise
        self.id = game_id
        self.player1 = None
        self.player2 = None
        self.player1_socket = None
        self.player2_socket = None
        self.current_turn = None
        self.board = None
        self.status = None
        self.moves = None
        self.mate_score = 9999
        self.near_mate_threshold = 5.0
        self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
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
            # print(self.board)
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

    def suggest_move(self):
        result = self.engine.play(self.board, chess.engine.Limit(time=0.5))
        return result.move.uci()


    def get_pv_moves(self):
        analysis = self.engine.analyse(self.board, chess.engine.Limit(time=1.0)) 
        pv_moves = analysis.get("pv", [])
        return [move.uci() for move in pv_moves]
    
    def get_evaluation(self):
        """Get evaluation from engine and handle mate scores"""
        if self.board.is_checkmate():
            return -self.mate_score if self.board.turn else self.mate_score
            
        analysis = self.engine.analyse(self.board, chess.engine.Limit(time=0.2))
        score = analysis['score'].relative
        
        if score.is_mate():
            # Handle mate scores
            mate_in = score.mate()
            return self.mate_score if mate_in > 0 else -self.mate_score
            
        return score.score(mate_score=10000) / 100.0

    def sigmoid_scale(self, x):
        """Apply sigmoid scaling to evaluation scores"""
        scale_factor = 0.2
        return 50 * (1 + math.tanh(scale_factor * x))

    def get_winning_chances(self, evaluation):
        normalized_eval = evaluation / (abs(evaluation) + 1)
        if(self.flag):
            if evaluation >= 0:
                white_chances = round(50 + (normalized_eval * 50), 2)
                black_chances = round(100 - white_chances, 2)
            else:
                black_chances = round(50 + (abs(normalized_eval) * 50), 2)
                white_chances = round(100 - black_chances, 2)
            self.flag = False
        else:
            if evaluation >= 0:
                black_chances = round(50 + (normalized_eval * 50), 2)
                white_chances = round(100 - black_chances, 2)
            else:
                white_chances = round(50 + (abs(normalized_eval) * 50), 2)
                black_chances = round(100 - white_chances, 2)
            self.flag = True
        
        return {"white": white_chances, "black": black_chances}

    def analyze_position(self):
        """Analyze current position with evaluation and best move"""
        evaluation = self.get_evaluation()
        best_move = self.suggest_move()
        winning_chances = self.get_winning_chances(evaluation)
        
        return {
            "evaluation": evaluation,
            "best_move": best_move,
            "winning_chances": winning_chances
        }

    def __del__(self):
        """Cleanup engine when object is destroyed"""
        if hasattr(self, 'engine'):
            self.engine.quit()