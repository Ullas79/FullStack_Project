// client/src/Editor.js

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import router hooks
import io from "socket.io-client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const SAVE_INTERVAL_MS = 2000;

// Small Navbar component used in the editor for navigation/actions
function EditorNavbar({ title, onBack, onLogout }) {
  return (
    <div className="App-header">
      <div className="App-title">
        <div className="App-logo">GD</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>{title}</h1>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Collaborative editor
          </div>
        </div>
      </div>

      <div className="dashboard-actions" style={{ gap: 8 }}>
        <button className="ghost" onClick={onBack}>
          Back
        </button>
        <button className="ghost" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

function Editor() {
  const { id: documentId } = useParams(); // Get document ID from URL
  const [socket, setSocket] = useState();
  const [value, setValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const quillRef = useRef();
  const navigate = useNavigate();

  // 1. Effect to connect to Socket.io
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login"); // Kick if no token
      return;
    }

    // Connect to socket server, passing the token for auth
    const s = io("http://localhost:3001", {
      auth: {
        token: token,
      },
    });
    setSocket(s);

    // Disconnect on unmount
    return () => {
      s.disconnect();
    };
  }, [navigate]);

  // 2. Effect to load the document
  useEffect(() => {
    if (!socket || !documentId) return; // Wait for socket and ID

    const editor = quillRef.current.getEditor();
    editor.disable();
    editor.setText("Loading document...");

    // Listen for load event (only once)
    socket.once("load-document", (data) => {
      editor.setContents(data);
      editor.enable();
      setIsLoaded(true);
    });

    // Listen for errors
    socket.on("error", (errorMessage) => {
      console.error(errorMessage);
      alert(errorMessage);
      navigate("/dashboard"); // Go back to safety
    });

    // Tell server we want the document
    socket.emit("get-document", documentId);

    // Clean up listener
    return () => {
      socket.off("error");
    };
  }, [socket, documentId, navigate]);

  // 3. Effect for auto-saving
  useEffect(() => {
    if (!socket || !documentId || !isLoaded) return;

    const interval = setInterval(() => {
      const editor = quillRef.current.getEditor();
      const contents = editor.getContents();
      socket.emit("save-document", contents, documentId);
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, documentId, isLoaded]);

  // 4. Effect for receiving changes from others
  useEffect(() => {
    if (!socket) return;

    const handler = (delta) => {
      const editor = quillRef.current.getEditor();
      editor.updateContents(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket]);

  // 5. Change handler for sending changes
  const handleChange = (content, delta, source, editor) => {
    if (source !== "user" || !socket) return;

    setValue(content);
    socket.emit("send-changes", delta, documentId);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="App">
      <EditorNavbar
        title={isLoaded ? "Document" : "Loading..."}
        onBack={handleBack}
        onLogout={handleLogout}
      />

      <div className="container editor-container">
        <div className="editor-top">
          <div className="editor-title">
            {/* simple inline editable title (could be wired to document metadata later) */}
            <input
              placeholder="Document title"
              className="editor-title-input"
              defaultValue=""
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 18,
                fontWeight: 600,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="button ghost" onClick={handleBack}>
              Back
            </button>
            <button
              className="button"
              onClick={() => {
                // manual save: emit current contents
                if (!quillRef.current) return;
                const editor = quillRef.current.getEditor();
                const contents = editor.getContents();
                if (socket) socket.emit("save-document", contents, documentId);
              }}
            >
              Save
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}

export default Editor;
