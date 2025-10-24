// client/src/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // This effect runs when the component loads
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchDocuments = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/documents', {
          method: 'GET',
          headers: {
            'x-auth-token': token,
          },
        });

        if (!res.ok) {
          throw new Error('Could not fetch documents');
        }

        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    };

    fetchDocuments();
  }, [token, navigate]);

  // This runs when the "Create" button is clicked
  const createNewDocument = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/documents', {
        method: 'POST',
        headers: {
          'x-auth-token': token,
        },
      });

      if (!res.ok) {
        throw new Error('Could not create document');
      }

      const newDoc = await res.json();
      navigate(`/docs/${newDoc._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  // --- NEW: Function to handle deleting a document ---
  const handleDelete = async (documentId) => {
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Could not delete document');
      }

      // If successful, remove the document from the state to update the UI
      setDocuments(documents.filter(doc => doc._id !== documentId));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- NEW: Function to handle renaming a document ---
  const handleRename = async (documentId, currentTitle) => {
    const newTitle = window.prompt('Enter new document title:', currentTitle);

    if (newTitle === null || newTitle === '' || newTitle === currentTitle) {
      return; // User cancelled or didn't change the name
    }

    try {
      const res = await fetch(`http://localhost:3001/api/documents/${documentId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Could not rename document');
      }

      const updatedDoc = await res.json();

      // If successful, update the document in the state to refresh the UI
      setDocuments(
        documents.map(doc => (doc._id === documentId ? updatedDoc : doc))
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>Your Documents</h2>
      <button onClick={createNewDocument}>+ Create New Document</button>
      <hr />
      {documents.length === 0 ? (
        <p>You have no documents. Create one!</p>
      ) : (
        <ul>
          {/* --- UPDATED: The document list now has buttons --- */}
          {documents.map((doc) => (
            <li key={doc._id} style={{ marginBottom: '10px' }}>
              <Link to={`/docs/${doc._id}`}>{doc.title}</Link>
              <p>Last updated: {new Date(doc.updatedAt).toLocaleString()}</p>
              
              <button onClick={() => handleRename(doc._id, doc.title)} style={{ marginLeft: '10px' }}>
                Rename
              </button>
              <button onClick={() => handleDelete(doc._id)} style={{ marginLeft: '10px' }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dashboard;