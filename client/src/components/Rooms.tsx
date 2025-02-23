import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const Room: React.FC = () => {
  const location = useLocation();
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const userStream = useRef<MediaStream | null>(null);
  const partnerVideo = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  const openCamera = async () => {
    const constraints: MediaStreamConstraints = {
      video: true,
      audio: true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
      userStream.current = stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  useEffect(() => {
    openCamera().then(async () => {
      const roomID = location.pathname.split('/');
      webSocketRef.current = new WebSocket(`ws://localhost:8000/join?roomID=${roomID[2]}`);

      webSocketRef.current.addEventListener('open', () => {
        webSocketRef.current?.send(JSON.stringify({ join: true }));
      });

      webSocketRef.current.addEventListener('message', async (e) => {
        const message = JSON.parse(e.data);

        if (message.join) {
          callUser();
        }

        if (message.offer) {
          handleOffer(message.offer);
        }

        if (message.answer && peerRef.current) {
          console.log('Receiving Answer');
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(message.answer));
        }

        if (message.iceCandidate && peerRef.current) {
          console.log('Receiving and Adding ICE Candidate');
          try {
            await peerRef.current.addIceCandidate(message.iceCandidate);
          } catch (err) {
            console.error('Error adding ICE Candidate:', err);
          }
        }
      });
    });
  }, [location.pathname]);

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    console.log('Received Offer, Creating Answer');
    peerRef.current = createPeer();

    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

      userStream.current?.getTracks().forEach((track) => {
        peerRef.current?.addTrack(track, userStream.current!);
      });

      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);

      webSocketRef.current?.send(JSON.stringify({ answer: peerRef.current.localDescription }));
    }
  };

  const callUser = async () => {
    console.log('Calling Other User');
    peerRef.current = createPeer();

    if (peerRef.current && userStream.current) {
      userStream.current.getTracks().forEach((track) => {
        peerRef.current?.addTrack(track, userStream.current!);
      });
    }
  };

  const createPeer = (): RTCPeerConnection => {
    console.log('Creating Peer Connection');
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidateEvent;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const handleNegotiationNeeded = async () => {
    console.log('Creating Offer');

    try {
      if (peerRef.current) {
        const myOffer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(myOffer);

        webSocketRef.current?.send(JSON.stringify({ offer: peerRef.current.localDescription }));
      }
    } catch (err) {
      console.error('Error during negotiation:', err);
    }
  };

  const handleIceCandidateEvent = async (e: RTCPeerConnectionIceEvent) => {
    console.log('Found Ice Candidate');
    if (e.candidate && webSocketRef.current) {
      console.log(e.candidate);
      webSocketRef.current.send(JSON.stringify({ iceCandidate: e.candidate }));
    }
  };

  const handleTrackEvent = (e: RTCTrackEvent) => {
    console.log('Received Tracks');
    if (partnerVideo.current && e.streams[0]) {
      partnerVideo.current.srcObject = e.streams[0];
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'whitesmoke',
          height: '200px',
          width: '100%',
        }}
      >
        <h1>Golang {"&"} React</h1>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          top: '100px',
          right: '100px',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <video playsInline autoPlay muted controls={true} ref={userVideo} />
        <video playsInline autoPlay controls={true} ref={partnerVideo} />
      </div>
    </div>
  );
};

export default Room;
