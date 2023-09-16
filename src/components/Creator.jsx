import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { Button, Input, Card } from 'antd';
import './Creator.css';

const { Meta } = Card;

const Creator = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const yourVideoRef = useRef(null);
  const yourAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [user, setUser] = useState(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamUsername, setStreamUsername] = useState('');
  const [isTitleUsernameSet, setIsTitleUsernameSet] = useState(false);

  const { uid } = useParams();
  const streamLink = `${window.location.origin}/viewer/${uid}`;
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isStreaming) {
      startStream();
    } else {
      stopStream();
    }
  }, [isStreaming]);

  async function startStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isMicrophoneOn,
      });
      setIsStreaming(true);

      if (yourVideoRef.current) {
        yourVideoRef.current.srcObject = stream;
      }
      if (yourAudioRef.current) {
        yourAudioRef.current.srcObject = stream;
      }

      const peerConnection = createPeer();
      peerConnectionRef.current = peerConnection;
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      handleNegotiationNeededEvent(peerConnection, streamLink);

      saveStreamCreator(uid, streamTitle, streamUsername);

      alert('Stream saved successfully.');
    } catch (error) {
      console.error('Error accessing camera and microphone:', error);
    }
  }

  function stopStream() {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setIsStreaming(false);
  }

  function createPeer() {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org',
        },
      ],
    });
    peerConnection.onnegotiationneeded = () => handleNegotiationNeededEvent(peerConnection);

    return peerConnection;
  }

  async function handleNegotiationNeededEvent(peerConnection, link) {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const payload = {
        sdp: peerConnection.localDescription,
        link,
      };

      axios
        .post('http://localhost:5000/broadcast', payload)
        .then((response) => {
          const desc = new RTCSessionDescription(response.data.sdp);
          return peerConnection.setRemoteDescription(desc);
        })
        .catch((error) => console.error(error));
    } catch (error) {
      console.error(error);
    }
  }

  function toggleMicrophone() {
    setIsMicrophoneOn(!isMicrophoneOn);
    if (yourAudioRef.current && yourAudioRef.current.srcObject) {
      const audioTracks = yourAudioRef.current.srcObject.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMicrophoneOn;
      });
    }
  }

  const saveStreamCreator = async (streamUid, title, username) => {
    if (title && username) {
      const streamData = {
        title,
        username,
        createdAt: new Date(),
      };

      try {
        // Create a document with the user's UID as the document ID in 'livestreams' collection
        const streamDocRef = doc(db, 'livestreams', streamUid);
        
        // Set data for the document
        await setDoc(streamDocRef, streamData);

        // Create 'chat' and 'viewerusernames' subcollections within the document
        const chatCollectionRef = collection(streamDocRef, 'chat');
        const viewerUsernamesCollectionRef = collection(streamDocRef, 'viewerusernames');

        // Add some initial data to 'chat' and 'viewerusernames' collections (optional)
        await addDoc(chatCollectionRef, { message: 'Welcome to the chat!', timestamp: new Date() });
        await addDoc(viewerUsernamesCollectionRef, { username: 'SampleViewer', timestamp: new Date() });

        setIsTitleUsernameSet(true);
      } catch (error) {
        console.error('Error saving stream creator data:', error);
      }
    }
  };

  function navigateToViewer() {
    navigate(`/viewer/${uid}`);
  }

  return (
    <div className="creator-container">
      <div className="stream-info">
        {user ? (
          <div>
            <p>User Email: {user.email}</p>
            <p>
              Stream Link: <a href={streamLink}>{streamLink}</a>
            </p>
          </div>
        ) : (
          <p>Please log in to view user information.</p>
        )}
        {isTitleUsernameSet ? (
          <div>
            <p>Stream Title: {streamTitle}</p>
            <p>Username: {streamUsername}</p>
          </div>
        ) : (
          <div>
            <Input
              type="text"
              placeholder="Stream Title"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              disabled={isTitleUsernameSet}
            />
            <Input
              type="text"
              placeholder="Username"
              value={streamUsername}
              onChange={(e) => setStreamUsername(e.target.value)}
              disabled={isTitleUsernameSet}
            />
          </div>
        )}
        <Button onClick={() => setIsStreaming(!isStreaming)} className="btn">
          {isStreaming ? 'Stop Stream' : 'Start Stream'}
        </Button>
        <Button onClick={toggleMicrophone} className="btn">
          {isMicrophoneOn ? 'Mute Microphone' : 'Unmute Microphone'}
        </Button>
        <Button onClick={navigateToViewer} className="btn">
          Go to Viewer
        </Button>
      </div>
      {isStreaming && (
        <Card className="video-card" cover={<video ref={yourVideoRef} autoPlay playsInline />} bordered={false}>
          <Meta title="Stream Title" description={streamTitle} />
        </Card>
      )}
      {isStreaming && <audio ref={yourAudioRef} autoPlay />}
    </div>
  );
};

export default Creator;