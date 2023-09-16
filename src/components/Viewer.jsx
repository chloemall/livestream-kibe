import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, Modal } from 'antd'; // Import Input and Modal from 'antd' for username prompt
import './Viewer.css'; // Import your CSS file for styling

const { Meta } = Card;

const Viewer = () => {
  const { uid } = useParams();
  const [peer, setPeer] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [viewerUsername, setViewerUsername] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false); // State for showing the username prompt
  const videoRef = useRef(null);

  useEffect(() => {
    if (isJoining) {
      init();
    }
  }, [isJoining]);

  useEffect(() => {
    // Query the Firestore to check if the viewer already has a username
    const checkUsername = async () => {
      const viewerQuery = query(
        collection(db, 'livestreams', uid, 'viewerusernames'),
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(viewerQuery);

      if (querySnapshot.size > 0) {
        // If a username is already set, retrieve it
        const usernameDoc = querySnapshot.docs[0];
        setViewerUsername(usernameDoc.data().username);
      } else {
        // If no username is set, prompt the viewer to enter one
        setShowUsernamePrompt(true);
      }
    };

    checkUsername();
  }, [uid]);

  const init = async () => {
    const peer = createPeer();
    peer.addTransceiver('video', { direction: 'recvonly' });
    setPeer(peer);

    try {
      const { data } = await axios.post('http://localhost:5000/join-stream', {
        uid,
      });
      const desc = new RTCSessionDescription(data.sdp);
      peer.setRemoteDescription(desc);
    } catch (error) {
      console.error(error);
    }
  };

  const createPeer = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org',
        },
      ],
    });
    peerConnection.ontrack = handleTrackEvent;
    peerConnection.onnegotiationneeded = () =>
      handleNegotiationNeededEvent(peerConnection);

    return peerConnection;
  };

  const handleNegotiationNeededEvent = async (peerConnection) => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const payload = {
      sdp: peerConnection.localDescription,
    };

    try {
      const { data } = await axios.post('http://localhost:5000/consumer', payload);
      const desc = new RTCSessionDescription(data.sdp);
      peerConnection.setRemoteDescription(desc).catch((e) => console.log(e));
    } catch (error) {
      console.error(error);
    }
  };

  const handleTrackEvent = (e) => {
    if (videoRef.current) {
      videoRef.current.srcObject = e.streams[0];
    }
  };

  // Function to save the viewer's username to Firestore
  const saveViewerUsername = async () => {
    if (viewerUsername) {
      const viewerData = {
        uid,
        username: viewerUsername,
      };

      // Create a document in the 'viewerusernames' subcollection
      const viewerUsernameDocRef = doc(
        collection(db, 'livestreams', uid, 'viewerusernames')
      );
      try {
        await setDoc(viewerUsernameDocRef, viewerData);
        setShowUsernamePrompt(false); // Hide the username prompt
      } catch (error) {
        console.error('Error saving viewer username:', error);
      }
    }
  };

  return (
    <div className="viewer-container">
      <div className="viewer-content">
        <Card className="viewer-card">
          <video id="video" ref={videoRef} autoPlay />
          <Button id="my-button" onClick={() => setIsJoining(true)}>
            Join Stream
          </Button>
        <p>Your Username: {viewerUsername}</p>

        </Card>
        <Modal
          title="Enter Your Username"
          visible={showUsernamePrompt}
          onOk={saveViewerUsername}
          onCancel={() => setShowUsernamePrompt(false)}
        >
          <Input
            placeholder="Username"
            value={viewerUsername}
            onChange={(e) => setViewerUsername(e.target.value)}
          />
        </Modal>
        {/* Display the viewer's username below the video */}
        <p>Your Username: {viewerUsername}</p>
      </div>
    </div>
  );
};

export default Viewer;
