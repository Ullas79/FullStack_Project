// client/src/Login.js

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="App">
      <div className="App-header" style={{ justifyContent: "center" }}>
        <div className="App-title">
          <div className="App-logo">GD</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>Google Docs POC</h1>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Collaborative editor
            </div>
          </div>
        </div>
      </div>

      <div
        className="container"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p style={{ color: "#94a3b8", marginTop: 0 }}>
            Sign in to continue to your documents
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="button" type="submit">
                Sign in
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p style={{ marginTop: 12 }}>
              Don't have an account?{" "}
              <Link className="link" to="/register">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
