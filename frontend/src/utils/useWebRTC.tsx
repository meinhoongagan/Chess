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
    send_answer,
    send_ice_candidate 
}: UseWebRTCProps) => {
    // Always define all hooks, regardless of initialization state
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [rtcFailureCount, setRtcFailureCount] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    const MAX_RTC_FAILURES = 3;

    // Debug function to test microphone access
    const testAudioOnly = async () => {
        try {
            console.log("Testing microphone access only");
            // Check permission status
            const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log("Microphone permission status:", permissions.state);
            
            if (permissions.state === 'denied') {
                console.error("Microphone permission denied by user");
                return false;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            
            console.log("Got microphone stream:", stream.getAudioTracks());
            
            setLocalStream(stream);
            return true;
        } catch (error) {
            console.error("Microphone access test failed:", error);
            return false;
        }
    };

    // Setup WebRTC when component mounts and username/opponent are available
    useEffect(() => {
        console.log("useWebRTC hook called with:", {
            username, 
            opponent, 
            white, 
            hasSendOffer: !!send_offer,
            hasSendAnswer: !!send_answer,
            hasSendIceCandidate: !!send_ice_candidate
        });
        
        if (!username || !opponent || !white) {
            console.log("Missing required data for WebRTC setup:", {username, opponent, white});
            return;
        }

        // Run basic audio test to check permissions
        testAudioOnly();
        setIsInitialized(true);

        const setupWebRTC = async () => {
            try {
                console.log("Creating RTCPeerConnection");
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ],
                    iceCandidatePoolSize: 10
                });
                
                pc.onconnectionstatechange = () => {
                    console.log("📡 Connection State:", pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        console.log("🎉 WebRTC connected successfully!");
                    } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                        console.warn("⚠️ WebRTC connection state changed to:", pc.connectionState);
                        setRtcFailureCount(prev => prev + 1);
                    }
                };
    
                pc.oniceconnectionstatechange = () => {
                    console.log("❄️ ICE Connection State:", pc.iceConnectionState);
                };
    
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('Sending ICE candidate to:', opponent, 
                            event.candidate.candidate.substring(0, 50) + '...');
                        send_ice_candidate(opponent, event.candidate);
                    } else {
                        console.log('All ICE candidates have been sent');
                    }
                };
                
                // Debug ICE failures
                pc.onicecandidateerror = (event) => {
                    console.error('ICE candidate error:', event);
                };
    
                console.log("Getting user media");
                try {
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
                        console.log("Audio track initialized (muted):", track.label);
                    });
                    
                    if (localAudioRef.current) {
                        console.log("Setting local audio stream");
                        localAudioRef.current.srcObject = stream;
                        localAudioRef.current.muted = true; // Local audio is always muted to prevent feedback
                    } else {
                        console.warn("Local audio ref is null");
                    }
        
                    stream.getTracks().forEach(track => {
                        console.log("Adding track to peer connection:", track.kind);
                        pc.addTrack(track, stream);
                    });
                    
                    setLocalStream(stream);
                } catch (err) {
                    console.error("Error accessing microphone:", err);
                    alert("Could not access microphone. Voice chat will not be available.");
                }
    
                pc.ontrack = (event) => {
                    console.log("Received remote track:", event.track.kind);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    } else {
                        console.warn("Remote audio ref is null");
                    }
                };
    
                setPeerConnection(pc);
                
                // The white player initiates the call
                if (white === username) {
                    console.log("I am white, creating offer");
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
        
        // Monitor connection state
        const rtcStateTimer = setInterval(() => {
            if (peerConnection) {
                console.log("Checking WebRTC connection state:", peerConnection.connectionState);
                console.log("ICE connection state:", peerConnection.iceConnectionState);
                
                if (peerConnection.iceConnectionState === 'failed' || 
                    peerConnection.iceConnectionState === 'disconnected') {
                    
                    setRtcFailureCount(prev => prev + 1);
                    
                    if (rtcFailureCount >= MAX_RTC_FAILURES) {
                        console.log("⚠️ WebRTC connection failed repeatedly, trying to reconnect");
                        
                        // Try to restart ICE
                        if (white === username && peerConnection.signalingState !== 'closed') {
                            peerConnection.createOffer({ iceRestart: true })
                            .then(offer => peerConnection.setLocalDescription(offer))
                            .then(() => {
                                if (opponent) {
                                    send_offer(opponent, peerConnection.localDescription as RTCSessionDescriptionInit);
                                }
                            })
                            .catch(err => console.error("Error restarting ICE:", err));
                        }
                    }
                }
            }
        }, 10000); // Check every 10 seconds
    
        return () => {
            clearInterval(rtcStateTimer);
            console.log("Cleaning up WebRTC resources");
            localStream?.getTracks().forEach(track => {
                console.log("Stopping track:", track.kind);
                track.stop();
            });
            
            if (peerConnection) {
                console.log("Closing peer connection");
                peerConnection.close();
            }
        };
    }, [username, opponent, white, send_offer, send_answer, send_ice_candidate, rtcFailureCount]);

    const toggleLocalAudio = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const audioTrack = audioTracks[0];
                audioTrack.enabled = !audioTrack.enabled;
                console.log("Local audio track enabled:", audioTrack.enabled);
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    return {
        peerConnection,
        localAudioRef,
        remoteAudioRef,
        isMuted,
        toggleLocalAudio,
        isInitialized
    };
};