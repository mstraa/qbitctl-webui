import React, { useState } from 'react';

function LoginPage({ accent, busy, error, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(username.trim(), password);
  }

  return (
    <div className="login-shell" style={{ '--orange': accent }}>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand">
          <span className="prompt-mark">qb</span>
          <div>
            <h1>qbitctl</h1>
            <p>qBittorrent WebUI login</p>
          </div>
        </div>
        <span className="eyebrow">/api/v2/auth/login</span>
        <label className="login-row">
          <span>Username</span>
          <input
            autoComplete="username"
            autoFocus
            onChange={event => setUsername(event.target.value)}
            type="text"
            value={username}
          />
        </label>
        <label className="login-row">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={event => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" disabled={busy} type="submit">
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="settings-hint">Uses your qBittorrent WebUI credentials.</p>
      </form>
    </div>
  );
}

export default LoginPage;
