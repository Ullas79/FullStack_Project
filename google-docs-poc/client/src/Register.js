// client/src/Register.js

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 201) {
        alert(data.message);
        navigate("/login"); // Send user to login page after success
      } else {
        alert(data.message); // Show error (e.g., "User already exists")
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
            <h1 style={{ margin: 0, fontSize: 18 }}>Create your account</h1>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Sign up to collaborate
            </div>
          </div>
        </div>
      </div>

      <div
        className="container"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div className="auth-card">
          <h2>Register</h2>
          <p style={{ color: "#94a3b8", marginTop: 0 }}>Create a new account</p>

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
                Create account
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate("/login")}
              >
                Have an account?
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p style={{ marginTop: 12 }}>
              Already have an account?{" "}
              <Link className="link" to="/login">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
