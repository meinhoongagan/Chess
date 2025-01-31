import asyncio
import time
import threading
from Backend.app.Game import Game

class TimeControl:
    def __init__(self, total_time=600, increment=10,game = None, active_games = None):
        self.total_time = total_time
        self.increment = increment
        self.player1 = None
        self.player2 = None
        self.player1_time = total_time
        self.player2_time = total_time
        self.current_player = None
        self.last_move_time = None
        self.timer_active = False
        self.game = game
        self.active_games = active_games

    def start(self, starting_player: str, player1: str, player2: str, websocket1, websocket2):
        """
        Start time tracking with a callback for timeout
        :param starting_player: Player whose turn starts
        :param timeout_callback: Function to call when time runs out
        """
        self.player1 = player1
        self.player2 = player2
        self.current_player = starting_player
        self.last_move_time = time.time()
        self.timer_active = True

        # Start a separate thread to run the timer logic
        threading.Thread(target=self._timer_thread, args=(websocket1, websocket2), daemon=True).start()

    def _timer_thread(self, socket1, socket2):
        """
        Continuously check and update time
        """
        # Start a new asyncio event loop for the thread
        print("Starting timer thread")
        loop = asyncio.new_event_loop()
        print("Setting event loop")
        asyncio.set_event_loop(loop)
        print("Running timer thread")
        loop.run_until_complete(self._async_timer_thread(socket1, socket2))
        print("Timer thread stopped")
        loop.close()

    async def _async_timer_thread(self, socket1, socket2):
        """
        Continuously check and update time asynchronously
        """
        print("Starting async timer thread")
        while self.timer_active:
            await asyncio.sleep(0.1)  # Non-blocking sleep
            if self.game.get_status() != "ongoing":
                break
            current_time = time.time()
            time_spent = current_time - self.last_move_time
            message = None

            # Update current player's time
            if self.current_player == self.player1:
                self.player1_time -= time_spent
                if self.player1_time <= 0:
                    message = self._handle_timeout(self.player2)
                    self.timer_active = False  # Stop the timer
            else:
                self.player2_time -= time_spent
                if self.player2_time <= 0:
                    message = self._handle_timeout(self.player1)
                    self.timer_active = False  # Stop the timer

            self.last_move_time = current_time
            # print("Player 1 time:", self.player1_time)
            # print("Player 2 time:", self.player2_time)
            # print(message)

            if message:
                self.active_games.pop(self.player1, None)
                self.active_games.pop(self.player2, None)

                # Send the timeout message to both sockets
                await socket1.send_json(message)
                await socket2.send_json(message)
                break  # Exit the loop as the game is over

    def _handle_timeout(self, winner: str):
        """
        Stop timer and trigger timeout callback
        :param winner: Player who wins on timeout
        """
        self.timer_active = False
        return {
            "event": "TIMEOUT",
            "data": {"winner": winner}
        }

    def process_move(self, current_player: str):
        """
        Update time after a move
        :param current_player: Player who just moved
        :return: Updated player times
        """
        current_time = time.time()
        time_spent = current_time - self.last_move_time

        if current_player == self.player1:
            self.player1_time -= time_spent
            self.player1_time += self.increment
            self.current_player = self.player2
        else:
            self.player2_time -= time_spent
            self.player2_time += self.increment
            self.current_player = self.player1

        self.last_move_time = current_time

        return {
            self.player1: round(self.player1_time, 2),
            self.player2: round(self.player2_time, 2)
        }

    def is_timer_active(self):
        return self.timer_active
