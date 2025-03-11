import { useState, useRef, useEffect } from 'react';

interface UseWebRTCProps {
    username: string | null;
    opponent: string | null;
    white: string | null;
    send_offer: (opponent: string, offer: RTCSessionDescriptionInit) => void;
    send_answer: (opponent: string, answer: RTCSessionDescriptionInit) => void;
    send_ice_candidate: (opponent: string, candidate: RTCIceCandidate) => void;
}

export const useWebRTC = ({ 
    username, 
    opponent, 
    white, 
    send_offer, 
    send_ice_candidate 
}: UseWebRTCProps) => {
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // Setup WebRTC when component mounts and username/opponent are available
    useEffect(() => {
        if (!username || !opponent || !white) {
            console.log("Missing required data for WebRTC setup:", {username, opponent, white});
            return;
        }

        // console.log("Setting up WebRTC with:", {username, opponent, white});

        const setupWebRTC = async () => {
            try {
                // console.log("Creating RTCPeerConnection");
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ],
                    iceCandidatePoolSize: 10
                });
                
                pc.onconnectionstatechange = () => {
                    // console.log("📡 Connection State:", pc.connectionState);
                };
    
                pc.oniceconnectionstatechange = () => {
                    // console.log("❄️ ICE Connection State:", pc.iceConnectionState);
                };
    
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        // console.log('Sending ICE candidate to:', opponent);
                        send_ice_candidate(opponent, event.candidate);
                    }
                };
    
                // console.log("Getting user media");
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                // Start with audio muted
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                
                if (localAudioRef.current) {
                    // console.log("Setting local audio stream");
                    localAudioRef.current.srcObject = stream;
                    localAudioRef.current.muted = true; // Local audio is always muted to prevent feedback
                }
    
                stream.getTracks().forEach(track => {
                    // console.log("Adding track to peer connection:", track.kind);
                    pc.addTrack(track, stream);
                });
    
                pc.ontrack = (event) => {
                    // console.log("Received remote track:", event.track.kind);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                };
    
                setPeerConnection(pc);
                setLocalStream(stream);
                
                // The white player initiates the call
                if (white === username) {
                    // console.log("I am white, creating offer");
                    setTimeout(async () => {
                        try {
                            const offer = await pc.createOffer({
                                offerToReceiveAudio: true,
                                iceRestart: true
                            });
                            console.log("Created offer:", offer);
                            await pc.setLocalDescription(offer);
                            console.log("Set local description, sending offer to:", opponent);
                            send_offer(opponent, offer);
                        } catch (error) {
                            console.error("Error creating/sending offer:", error);
                        }
                    }, 1000); // Small delay to ensure everything is set up
                } else {
                    console.log("I am black, waiting for offer");
                }
            } catch (error) {
                console.error("❌ Error in WebRTC setup:", error);
            }
        };

        setupWebRTC();
    
        return () => {
            // console.log("Cleaning up WebRTC resources");
            localStream?.getTracks().forEach(track => {
                // console.log("Stopping track:", track.kind);
                track.stop();
            });
            
            if (peerConnection) {
                // console.log("Closing peer connection");
                peerConnection.close();
            }
        };
    }, [username, opponent, white, send_offer, send_ice_candidate]);

    const toggleLocalAudio = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const audioTrack = audioTracks[0];
                audioTrack.enabled = !audioTrack.enabled;
                // console.log("Local audio track enabled:", audioTrack.enabled);
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    return {
        peerConnection,
        localAudioRef,
        remoteAudioRef,
        isMuted,
        toggleLocalAudio
    };
};