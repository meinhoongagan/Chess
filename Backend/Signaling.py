from fastapi.websockets import WebSocket
from typing import Dict, List

class Signaling:
    def __init__(self):
        self.connected_clients: Dict[str, WebSocket] = {}  # Map player names to WebSocket connections

    async def register_client(self, player_name: str, websocket: WebSocket):
        """Register a new player connection."""
        self.connected_clients[player_name] = websocket
        print(f"Player {player_name} connected.")
        await websocket.send_json({"event": "REGISTERED", "data": {"message": f"Welcome, {player_name}!"}})

    async def unregister_client(self, player_name: str):
        """Remove a player connection."""
        if player_name in self.connected_clients:
            del self.connected_clients[player_name]
            print(f"Player {player_name} disconnected.")

    async def send_offer(self, from_player: str, to_player: str, offer: dict):
        """Send SDP offer to the target player."""
        if to_player in self.connected_clients:
            await self.connected_clients[to_player].send_json({
                "event": "OFFER",
                "data": {"from": from_player, "offer": offer}
            })

    async def send_answer(self, from_player: str, to_player: str, answer: dict):
        """Send SDP answer to the target player."""
        if to_player in self.connected_clients:
            await self.connected_clients[to_player].send_json({
                "event": "ANSWER",
                "data": {"from": from_player, "answer": answer}
            })

    async def send_ice_candidate(self, from_player: str, to_player: str, candidate: dict):
        """Send ICE candidate to the target player."""
        if to_player in self.connected_clients:
            await self.connected_clients[to_player].send_json({
                "event": "ICE_CANDIDATE",
                "data": {"from": from_player, "candidate": candidate}
            })

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected players (useful for spectators)."""
        for websocket in self.connected_clients.values():
            await websocket.send_json(message)
