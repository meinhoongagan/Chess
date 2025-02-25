import { useState, useRef, useEffect } from 'react';

interface UseWebRTCProps {
    username: string | null;
    opponent: string | null;
    white: string | null;
    send_offer: (opponent: string, offer: RTCSessionDescriptionInit) => void;
    send_answer: (opponent: string, answer: RTCSessionDescriptionInit) => void;
    send_ice_candidate: (opponent: string, candidate: RTCIceCandidate) => void;
    isGameReady?: boolean; // new prop to control initialization
}

export const useWebRTC = ({ username, opponent, white, send_offer, send_ice_candidate, isGameReady = false }: UseWebRTCProps) => {
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection>();
    const [localStream, setLocalStream] = useState<MediaStream>();
    const [isMuted, setIsMuted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (!isGameReady || isInitialized) return;

        const initializeWithDelay = () => {
            setTimeout(() => {
                setupWebRTC();
                setIsInitialized(true);
            }, 1000); // 1 second delay
        };

        const setupWebRTC = async () => {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ],
                    iceCandidatePoolSize: 10
                });
                
                pc.onconnectionstatechange = () => {
                    console.log("📡 Connection State:", pc.connectionState);
                };
    
                pc.oniceconnectionstatechange = () => {
                    console.log("❄️ ICE Connection State:", pc.iceConnectionState);
                };
    
                pc.onicecandidate = (event) => {
                    if (event.candidate && opponent) {
                        send_ice_candidate(opponent, event.candidate);
                    }
                };
    
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
                setIsMuted(true);

                if (localAudioRef.current) {
                    localAudioRef.current.srcObject = stream;
                    localAudioRef.current.muted = true;
                }
    
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });
    
                pc.ontrack = (event) => {
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                };
    
                setPeerConnection(pc);
                setLocalStream(stream);
    
                if (white === username && opponent) {
                    const offer = await pc.createOffer({
                        offerToReceiveAudio: true,
                        iceRestart: true
                    });
                    await pc.setLocalDescription(offer);
                    send_offer(opponent, offer);
                }
    
            } catch (error) {
                console.error("❌ Error in WebRTC setup:", error);
            }
        };

        initializeWithDelay();
    
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            peerConnection?.close();
        };
    }, [isGameReady, isInitialized, username, opponent, white, send_offer, send_ice_candidate]);

    const toggleLocalAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
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