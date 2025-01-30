import unittest
from unittest.mock import Mock, patch, AsyncMock
import asyncio
import chess
import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from Game import Game
from TimeControl import TimeControl
from Signaling import Signaling

class TestGame(unittest.TestCase):
    def setUp(self):
        self.game = Game()
        self.game.start("player1", "player2")

    @patch('chess.engine.SimpleEngine.popen_uci')
    def test_game_initialization(self, mock_engine):
        self.assertEqual(self.game.player1, "player1")
        self.assertEqual(self.game.player2, "player2")
        self.assertEqual(self.game.status, "ongoing")
        self.assertEqual(len(self.game.moves), 0)
        self.assertTrue(isinstance(self.game.board, chess.Board))

    def test_valid_move(self):
        # Test a valid pawn move
        self.assertTrue(self.game.isValidMove("e4"))
        self.game.move("e4")
        self.assertEqual(self.game.moves[-1], "e4")

    def test_invalid_move(self):
        # Test an invalid move
        with self.assertRaises(ValueError):
            self.game.move("e5")  # Black can't move first

    def test_game_status_updates(self):
        # Test checkmate scenario
        moves = ["f3", "e5", "g4", "Qh4"]  # Fool's mate
        for move in moves:
            self.game.move(move)
        self.game.update_status()
        self.assertEqual(self.game.get_status(), "checkmate")

    @patch('chess.engine.SimpleEngine.analyse')
    def test_evaluation(self, mock_analyse):
        mock_analyse.return_value = {'score': Mock(relative=Mock(score=lambda mate_score: 100))}
        eval = self.game.get_evaluation()
        self.assertEqual(eval, 1.0)

class TestTimeControl(unittest.TestCase):
    def setUp(self):
        self.game = Mock()
        self.game.get_status.return_value = "ongoing"
        self.active_games = {}
        self.time_control = TimeControl(
            total_time=300,  # 5 minutes
            increment=2,
            game=self.game,
            active_games=self.active_games
        )

    def test_time_control_initialization(self):
        self.assertEqual(self.time_control.total_time, 300)
        self.assertEqual(self.time_control.increment, 2)
        self.assertEqual(self.time_control.player1_time, 300)
        self.assertEqual(self.time_control.player2_time, 300)
        self.assertFalse(self.time_control.timer_active)

    def test_process_move(self):
        self.time_control.start("player1", "player1", "player2", Mock(), Mock())
        self.time_control.last_move_time = self.time_control.last_move_time - 10  # Simulate 10 seconds passed
        
        times = self.time_control.process_move("player1")
        # Player1 should have lost 10 seconds but gained 2 seconds increment
        self.assertAlmostEqual(times["player1"], 292, places=0)
        self.assertEqual(times["player2"], 300)

@pytest.mark.asyncio
async def test_signaling():
    signaling = Signaling()
    mock_websocket1 = AsyncMock(spec=WebSocket)
    mock_websocket2 = AsyncMock(spec=WebSocket)

    # Test registration
    await signaling.register_client("player1", mock_websocket1)
    await signaling.register_client("player2", mock_websocket2)

    assert "player1" in signaling.connected_clients
    assert "player2" in signaling.connected_clients

    # Test sending offer
    test_offer = {"type": "offer", "sdp": "test"}
    await signaling.send_offer("player1", "player2", test_offer)
    
    # Changed this assertion to check the last call
    assert mock_websocket2.send_json.call_args_list[-1].args[0] == {
        "event": "OFFER",
        "data": {"from": "player1", "offer": test_offer}
    }

@pytest.mark.asyncio
async def test_websocket_endpoint():
    from main import app
    
    client = TestClient(app)
    
    with client.websocket_connect("/ws") as websocket:
        # Test game initialization
        websocket.send_json({
            "event": "INIT_GAME",
            "data": {
                "player_name": "test_player",
                "total_time": 300,
                "increment": 2
            }
        })
        
        response = websocket.receive_json()
        assert response["event"] == "WAITING"
        # Updated to match the actual message format
        assert "300s + 2s increment" in response["data"]["message"]
        assert "players in queue" in response["data"]["message"]

def main():
    unittest.main()

if __name__ == '__main__':
    main()