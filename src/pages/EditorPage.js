import React, { useState, useRef, useEffect, useCallback } from "react";

import toast from "react-hot-toast";

import ACTIONS from "../actions.js";
import Client from "../components/Client";
import Editor from "../components/Editor";

import { initSocket } from "../socket";

import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);

  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  const [clients, setClients] = useState([]);
  const [socketReady, setSocketReady] = useState(false);

  // Keep the code reference updated
  const handleCodeChange = useCallback((code) => {
    codeRef.current = code;
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    let socket;

    const init = async () => {
      try {
        socket = await initSocket();

        socketRef.current = socket;

        // Socket connection errors
        const handleErrors = (e) => {
          console.log("socket error", e);
          toast.error("Socket connection failed, try again later.");
          reactNavigator("/");
        };

        socket.on("connect_error", handleErrors);
        socket.on("connect_failed", handleErrors);

        // Join the room
        socket.emit(ACTIONS.JOIN, {
          roomId,
          username: location.state?.username,
        });

        // When another user joins
        const handleJoined = ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }

          setClients(clients);

          // Send current code to the newly joined user
          socket.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        };

        socket.on(ACTIONS.JOINED, handleJoined);

        // When another user leaves
        const handleDisconnected = ({ socketId, username }) => {
          toast.success(`${username} left the room.`);

          setClients((prev) =>
            prev.filter((client) => client.socketId !== socketId),
          );
        };

        socket.on(ACTIONS.DISCONNECTED, handleDisconnected);

        // Tell React that socket is ready
        setSocketReady(true);
      } catch (error) {
        console.log("Socket initialization error:", error);
        toast.error("Unable to connect to the server.");
        reactNavigator("/");
      }
    };

    init();

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }

      socketRef.current = null;
    };
  }, [location.state?.username, reactNavigator, roomId]);

  // Copy Room ID
  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  // Leave room
  function leaveRoom() {
    reactNavigator("/");
  }

  // Redirect if username is missing
  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/innnerlogo.png" alt="logo" />
          </div>

          <h3>Connected</h3>

          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>

        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>

        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        {socketReady && (
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={handleCodeChange}
          />
        )}
      </div>
    </div>
  );
};

export default EditorPage;
