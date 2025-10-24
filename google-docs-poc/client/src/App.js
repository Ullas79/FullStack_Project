// client/src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Editor from './Editor';
import Dashboard from './Dashboard'; // <-- ADD THIS

function App() {
  // A simple check for a token. A real app would use Context.
  const token = localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        {/* The editor is now at a dynamic route */}
        <Route path="/docs/:id" element={<Editor />} />

        {/* Add the new register, login, and dashboard routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* By default, if you have a token, go to the dashboard.
          If not, go to the login page.
        */}
        <Route 
          path="*" 
          element={<Navigate to={token ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;