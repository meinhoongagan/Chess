import chess
import chess.engine
import math

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
        self.mate_score = 9999
        self.near_mate_threshold = 5.0
        self.engine = chess.engine.SimpleEngine.popen_uci(
            "/mnt/c/users/gagan/onedrive/desktop/chess/backend/stockfish-windows-x86-64-avx2/stockfish/stockfish-windows-x86-64-avx2.exe"
        )
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
        """
        Calculate winning chances using sigmoid scaling and proper mate handling.
        
        Args:
            evaluation (float): Position evaluation score
            
        Returns:
            dict: Winning chances for white and black as percentages
        """
        # Handle checkmate positions
        if abs(evaluation) >= self.mate_score:
            if evaluation > 0:
                return {"white": 100.0, "black": 0.0}
            else:
                return {"white": 0.0, "black": 100.0}

        # Handle drawn positions
        if evaluation == 0:
            return {"white": 50.0, "black": 50.0}

        # Calculate winning chances using sigmoid scaling
        if evaluation >= 0:
            white_chances = round(self.sigmoid_scale(evaluation), 2)
            black_chances = round(100 - white_chances, 2)
        else:
            black_chances = round(self.sigmoid_scale(abs(evaluation)), 2)
            white_chances = round(100 - black_chances, 2)

        # Handle near-mate positions
        if abs(evaluation) >= self.near_mate_threshold:
            if evaluation > 0:
                white_chances = min(99.9, white_chances)
                black_chances = 100 - white_chances
            else:
                black_chances = min(99.9, black_chances)
                white_chances = 100 - black_chances

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