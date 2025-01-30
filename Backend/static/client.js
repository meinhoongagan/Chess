// Frontend code (client.js)
class ChessAudioChat {
    constructor(playerName) {
        this.playerName = playerName;
        this.peerConnection = null;
        this.ws = new WebSocket('ws://localhost:8000/ws');
        this.isConnected = false;
        this.messageQueue = [];
        this.iceCandidatesQueue = [];
        this.localStream = null;
        this.remoteStream = null;
        this.hasRemoteDescription = false;
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            this.isConnected = true;
            this.updateStatus('Connected to signaling server');
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.ws.send(message);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.isConnected = false;
            this.updateStatus('Disconnected from server');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('Connection error');
        };

        this.ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            
            switch (data.event) {
                case 'GAME_STARTED':
                    this.updateStatus('Game started! Connecting audio...');
                    this.opponent = data.data.opponent;
                    await this.initializePeerConnection();
                    // Only the first player (turn holder) creates the offer
                    if (data.turn === this.playerName) {
                        console.log('We are the initiator, creating offer...');
                        await this.createAndSendOffer();
                    } else {
                        console.log('Waiting for offer from opponent...');
                    }
                    break;
                case 'OFFER':
                    console.log('Received offer:', data.data.offer);
                    this.updateStatus('Received offer from opponent');
                    await this.handleOffer(data.data.offer);
                    break;
                case 'ANSWER':
                    console.log('Received answer:', data.data.answer);
                    this.updateStatus('Received answer from opponent');
                    await this.handleAnswer(data.data.answer);
                    break;
                case 'ICE_CANDIDATE':
                    console.log('Received ICE candidate:', data.data.candidate);
                    this.handleIceCandidate(data.data.candidate);
                    break;
                case 'WAITING':
                    this.updateStatus('Waiting for opponent...');
                    break;
            }
        };
    }

    async createAndSendOffer() {
        try {
            console.log('Creating offer...');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            console.log('Created offer:', offer);
            
            console.log('Setting local description...');
            await this.peerConnection.setLocalDescription(offer);
            
            this.updateStatus('Sending offer to opponent');
            console.log('Sending offer to:', this.opponent);
            this.sendMessage({
                event: 'OFFER',
                data: {
                    offer: offer,
                    target: this.opponent
                }
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            this.updateStatus('Error creating offer');
        }
    }

    async handleOffer(offer) {
        try {
            console.log('Setting remote description (offer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            this.hasRemoteDescription = true;
            await this.processIceCandidateQueue();
            
            console.log('Creating answer...');
            const answer = await this.peerConnection.createAnswer();
            console.log('Created answer:', answer);
            
            console.log('Setting local description (answer)...');
            await this.peerConnection.setLocalDescription(answer);
            
            this.updateStatus('Sending answer to opponent');
            console.log('Sending answer to:', this.opponent);
            this.sendMessage({
                event: 'ANSWER',
                data: {
                    answer: answer,
                    target: this.opponent
                }
            });
        } catch (error) {
            console.error('Error handling offer:', error);
            this.updateStatus('Error handling offer');
        }
    }

    async handleAnswer(answer) {
        try {
            console.log('Setting remote description (answer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            this.hasRemoteDescription = true;
            await this.processIceCandidateQueue();
            this.updateStatus('Audio connection established');
            if (this.peerConnection.connectionState === 'connected') {
                console.log('Connection fully established');
                this.updateStatus('Audio connected - You can speak now');
                // Dispatch event for UI update
                const event = new Event('audioReady');
                document.dispatchEvent(event);
                document.getElementById('localIndicator').classList.add('active');
            }
        } catch (error) {
            console.error('Error handling answer:', error);
            this.updateStatus('Error handling answer');
        }
    }

    


    async processIceCandidateQueue() {
        if (this.hasRemoteDescription) {
            while (this.iceCandidatesQueue.length > 0) {
                const candidate = this.iceCandidatesQueue.shift();
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Added queued ICE candidate');
                } catch (error) {
                    console.error('Error adding queued ICE candidate:', error);
                }
            }
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    sendMessage(message) {
        const messageString = JSON.stringify(message);
        if (this.isConnected) {
            this.ws.send(messageString);
        } else {
            console.log('Connection not ready, queueing message');
            this.messageQueue.push(messageString);
        }
    }

    async initializePeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);
        this.hasRemoteDescription = false;
        this.iceCandidatesQueue = [];

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                this.sendMessage({
                    event: 'ICE_CANDIDATE',
                    data: {
                        candidate: event.candidate,
                        target: this.opponent
                    }
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            this.updateStatus(`Connection state: ${this.peerConnection.connectionState}`);
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
                this.updateStatus(`Connection state: ${this.peerConnection.connectionState}`);
                
                if (this.peerConnection.connectionState === 'connected') {
                    this.updateStatus('Audio connected - You can speak now');
                    const event = new Event('audioReady');
                    document.dispatchEvent(event);
                    document.getElementById('localIndicator').classList.add('active');
                } else if (this.peerConnection.connectionState === 'disconnected') {
                    this.updateStatus('Audio disconnected');
                    document.getElementById('localIndicator').classList.remove('active');
                    document.getElementById('remoteIndicator').classList.remove('active');
                }
            };
        };

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            
            const localAudio = document.createElement('audio');
            localAudio.id = 'localAudio';
            localAudio.muted = true;
            localAudio.srcObject = this.localStream;
            document.body.appendChild(localAudio);
            
            this.localStream.getTracks().forEach(track => {
                console.log('Adding local track:', track.kind);
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.updateStatus('Microphone connected');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            this.updateStatus('Error accessing microphone');
        }

        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            this.remoteStream = event.streams[0];
            
            let remoteAudio = document.getElementById('remoteAudio');
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remoteAudio';
                remoteAudio.autoplay = true;
                remoteAudio.controls = true;
                document.body.appendChild(remoteAudio);
            }
            remoteAudio.srcObject = this.remoteStream;
            this.updateStatus('Remote audio connected');
            this.peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                this.remoteStream = event.streams[0];
                document.getElementById('remoteIndicator').classList.add('active');
            };
        };
    }

    async createAndSendOffer() {
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await this.peerConnection.setLocalDescription(offer);
            
            this.updateStatus('Sending offer to opponent');
            this.sendMessage({
                event: 'OFFER',
                data: {
                    offer: offer,
                    target: this.opponent
                }
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            this.updateStatus('Error creating offer');
        }
    }

    async handleOffer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            this.hasRemoteDescription = true;
            await this.processIceCandidateQueue();
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.updateStatus('Sending answer to opponent');
            this.sendMessage({
                event: 'ANSWER',
                data: {
                    answer: answer,
                    target: this.opponent
                }
            });
        } catch (error) {
            console.error('Error handling offer:', error);
            this.updateStatus('Error handling offer');
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            this.hasRemoteDescription = true;
            await this.processIceCandidateQueue();
            this.updateStatus('Audio connection established');
        } catch (error) {
            console.error('Error handling answer:', error);
            this.updateStatus('Error handling answer');
        }
    }

    

    handleIceCandidate(candidate) {
        if (candidate) {
            if (this.hasRemoteDescription) {
                // If we have the remote description, add the candidate immediately
                this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(error => console.error('Error adding ICE candidate:', error));
            } else {
                // Otherwise, queue the candidate
                console.log('Queueing ICE candidate');
                this.iceCandidatesQueue.push(candidate);
            }
        }
    }

    

    startGame() {
        this.sendMessage({
            event: 'INIT_GAME',
            data: {
                player_name: this.playerName,
                total_time: 600,
                increment: 5
            }
        });
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    } 
}