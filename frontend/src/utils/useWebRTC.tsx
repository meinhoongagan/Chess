import { useState, useEffect, useRef, useCallback } from 'react';

interface WebRTCProps {
  username: string | null;
  opponent: string | null;
  white: string | null;
  send_offer: (to: string, offer: RTCSessionDescriptionInit) => void;
  send_answer: (to: string, answer: RTCSessionDescriptionInit) => void;
  send_ice_candidate: (to: string, candidate: RTCIceCandidateInit) => void;
}

export const useWebRTC = ({ 
  username, 
  opponent, 
  white, 
  send_offer, 
  send_answer, 
  send_ice_candidate 
}: WebRTCProps) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const initializationAttemptRef = useRef<boolean>(false);
  
  // Cleanup function to close connections and release media resources
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setIsInitialized(false);
  }, []);

  // Toggle local audio
  const toggleLocalAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  }, []);

  // Initialize WebRTC connection
  const initializeWebRTC = useCallback(async () => {
    if (!username || !opponent || initializationAttemptRef.current) {
      return;
    }
    
    initializationAttemptRef.current = true;
    console.log("🚀 Initializing WebRTC:", { username, opponent });
    
    try {
      // Clean up any existing connections first
      cleanup();
      
      // Create a new RTCPeerConnection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Get local media stream
      console.log("📱 Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      
      // Add local stream to connection
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });
      
      // Set local audio element
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && opponent) {
          console.log("❄️ Sending ICE candidate to", opponent);
          send_ice_candidate(opponent, event.candidate);
        }
      };
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log("🔄 Connection state changed:", peerConnection.connectionState);
      };
      
      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log("❄️ ICE connection state changed:", peerConnection.iceConnectionState);
      };
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("🎵 Received remote track");
        if (remoteAudioRef.current && event.streams && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };
      
      // If we're white, we'll initiate the connection
      const isInitiator = username === white;
      if (isInitiator && opponent) {
        console.log("📞 Creating offer as initiator");
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        
        await peerConnection.setLocalDescription(offer);
        console.log("📤 Sending offer to", opponent);
        send_offer(opponent, offer);
      }
      
      setIsInitialized(true);
      console.log("✅ WebRTC initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing WebRTC:", error);
      cleanup();
    }
  }, [username, opponent, white, send_offer, send_ice_candidate, cleanup]);

  // Initialize WebRTC when all required props are available
  useEffect(() => {
    if (username && opponent && white) {
      console.log("🔄 WebRTC dependencies changed, checking initialization");
      const timer = setTimeout(() => {
        initializeWebRTC();
      }, 1000); // Small delay to ensure all state is settled
      
      return () => clearTimeout(timer);
    }
  }, [username, opponent, white, initializeWebRTC]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up WebRTC resources");
      cleanup();
    };
  }, [cleanup]);

  return {
    peerConnection: peerConnectionRef.current,
    localAudioRef,
    remoteAudioRef,
    isMuted,
    toggleLocalAudio,
    isInitialized
  };
};