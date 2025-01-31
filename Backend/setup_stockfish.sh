# setup_stockfish.sh
# Update system and install dependencies
sudo apt-get update
sudo apt-get install -y build-essential

# Clone the Stockfish repository and build it
cd /app
git clone https://github.com/bagatur/chess-engine.git
cd chess-engine/src
make
