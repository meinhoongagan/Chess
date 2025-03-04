# Use an official Python runtime as a parent image
FROM python:3.11-slim

# JWT settings
ENV SECRET_KEY = "By_Order_Of_Peaky_Fucking_Blinders"  # Use a secure, long random string in production
ENV ALGORITHM = "HS256"
ENV ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Install required system dependencies for building Stockfish
RUN apt-get update && apt-get install -y \
    wget \
    tar \
    build-essential \
    libstdc++6 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements and install Python dependencies
COPY requirements.txt . 
RUN pip install --no-cache-dir -r requirements.txt

# Download and compile Stockfish
RUN wget https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-ubuntu-x86-64-avx2.tar \
    && tar -xvf stockfish-ubuntu-x86-64-avx2.tar \
    && cd stockfish/src \
    && make build ARCH=x86-64-avx2 \
    && cp stockfish /usr/local/bin/stockfish \
    && chmod a+rx /usr/local/bin/stockfish \
    && cd ../.. \
    && rm -rf stockfish-ubuntu-x86-64-avx2.tar stockfish

# Check if stockfish is correctly installed and set permissions
RUN ls -l /usr/local/bin/stockfish && echo "Stockfish is installed" || echo "Stockfish installation failed"

# Create a non-root user
RUN useradd -m appuser

# Copy the rest of your application
COPY . /app

# Change ownership of the app directory
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Set Stockfish path environment variable
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

# Verify if STOCKFISH_PATH is set correctly
RUN echo "STOCKFISH_PATH=${STOCKFISH_PATH}"

# Create a .env file with the Stockfish path
RUN echo "STOCKFISH_PATH=/usr/local/bin/stockfish" > /app/.env

# Expose the port your FastAPI app will run on
EXPOSE 8000

# Run FastAPI with Uvicorn (ASGI server)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
