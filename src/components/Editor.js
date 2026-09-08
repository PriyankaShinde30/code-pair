import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";

import ACTIONS from "../actions.js";

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);

  // Initialize CodeMirror editor
  useEffect(() => {
    const textarea = document.getElementById("realtimeEditor");

    if (!textarea) {
      return;
    }

    const editor = Codemirror.fromTextArea(textarea, {
      mode: { name: "javascript", json: true },
      theme: "dracula",
      autoCloseTags: true,
      autoCloseBrackets: true,
      lineNumbers: true,
    });

    editorRef.current = editor;

    // Listen for changes in the editor
    editor.on("change", (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();

      // Update parent with current code
      onCodeChange(code);

      // Send user changes to other users
      if (origin !== "setValue" && socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
        });
      }
    });

    // Cleanup CodeMirror
    return () => {
      editor.toTextArea();
      editorRef.current = null;
    };
  }, [onCodeChange, roomId, socketRef]);

  // Listen for incoming code changes
  useEffect(() => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    const handleCodeChange = ({ code }) => {
      if (code !== null && editorRef.current) {
        editorRef.current.setValue(code);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

    // Cleanup socket listener
    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
    };
  }, [socketRef]);

  return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
