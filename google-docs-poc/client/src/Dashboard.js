// client/src/Dashboard.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

function Navbar({ onCreate }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="App-header">
      <div className="App-title">
        <div className="App-logo">GD</div>
        <h1>Google Docs POC</h1>
      </div>

      <div className="dashboard-actions">
        <button className="ghost" onClick={() => navigate("/dashboard")}>
          My Documents
        </button>
        <button onClick={onCreate}>+ Create New</button>
        <button className="ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // This effect runs when the component loads
  useEffect(() => {
    if (!token) {
      // If no token, kick user back to login
      navigate("/login");
      return;
    }

    // Fetch the user's documents
    const fetchDocuments = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/documents", {
          method: "GET",
          headers: {
            "x-auth-token": token, // Send the auth token!
          },
        });

        if (!res.ok) {
          throw new Error("Could not fetch documents");
        }

        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error(err);
        navigate("/login"); // If token is bad, kick to login
      }
    };

    fetchDocuments();
  }, [token, navigate]);

  // This runs when the "Create" button is clicked
  const createNewDocument = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        headers: {
          "x-auth-token": token,
        },
        // No body is needed, the server creates it
      });

      if (!res.ok) {
        throw new Error("Could not create document");
      }

      const newDoc = await res.json();
      // Immediately navigate to the new document's editor page
      navigate(`/docs/${newDoc._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="App">
      <Navbar onCreate={createNewDocument} />

      <div className="container">
        <div
          className="dashboard-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2>Your Documents</h2>
          <div className="dashboard-actions">
            <button onClick={createNewDocument}>+ Create New Document</button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="empty">
            <p>You have no documents. Create one!</p>
          </div>
        ) : (
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc._id} className="doc-item">
                {/* Link to the specific document's editor page */}
                <Link to={`/docs/${doc._id}`}>{doc.title || "Untitled"}</Link>
                <p>Last updated: {new Date(doc.updatedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
