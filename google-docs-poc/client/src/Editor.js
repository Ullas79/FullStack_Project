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
  const [documentTitle, setDocumentTitle] = useState("Loading...");
  const [saveStatus, setSaveStatus] = useState("Saved");
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

    // Listen for connection errors (like token expiration)
    s.on("connect_error", (err) => {
      if (err.message.includes("Token expired")) {
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    });

    // Disconnect on unmount
    return () => {
      s.off("connect_error");
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
    socket.once("load-document", (document) => {
      editor.setContents(document.data);
      setDocumentTitle(document.title); // <--- SET THE TITLE
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
      setSaveStatus("Saving...");
      const editor = quillRef.current.getEditor();
      const contents = editor.getContents();
      socket.emit("save-document", contents, documentId, (err, msg) => {
        if (err) {
          setSaveStatus("Error!");
          console.error(err);
          // Optional: Show an alert or a more subtle error indicator
        } else {
          setSaveStatus("Saved");
        }
      });
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

    // --- NEW: Listen for title changes ---
    const renameHandler = (newTitle) => {
      setDocumentTitle(newTitle);
    };
    socket.on("document-renamed", renameHandler);

    // --- NEW: Listen for document deletion ---
    const deleteHandler = () => {
      alert("This document has been deleted.");
      navigate("/dashboard");
    };
    socket.on("document-deleted", deleteHandler);

    // --- NEW: Listen for permission revocation ---
    const permissionHandler = (revokedDocId) => {
      // Check if the permission change affects the *current* document
      if (revokedDocId === documentId) {
        alert("Your permission to view this document has been revoked.");
        navigate("/dashboard");
      }
    };
    socket.on("permission-revoked", permissionHandler);

    return () => {
      socket.off("receive-changes", handler);
      socket.off("document-renamed", renameHandler); // --- NEW ---
      socket.off("document-deleted", deleteHandler); // --- NEW ---
      socket.off("permission-revoked", permissionHandler); // --- NEW ---
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
        title={documentTitle}
        onBack={handleBack}
        onLogout={handleLogout}
      />

      <div className="container editor-container">
        <div className="editor-top">
          <div className="editor-title">
            {/* --- MODIFIED: Use the state for the title --- */}
            <input
              placeholder="Document title"
              className="editor-title-input"
              value={documentTitle}
              // Add an onChange if you want to make it editable from here
              readOnly // For now, it just reflects the state
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

          <div style={{ display: "flex", gap: 8, alignItems: 'center' }}>
            {/* --- NEW: Show the save status --- */}
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{saveStatus}</div>
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
