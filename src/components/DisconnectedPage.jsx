function DisconnectedPage({ accent }) {
  return (
    <main className="disconnected-shell" style={{ '--orange': accent }}>
      <section className="disconnected-card" aria-live="polite" role="status">
        <div className="disconnected-signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="eyebrow">/api/v2/status</span>
        <h1>Disconnected</h1>
        <p>Unable to reach qBittorrent. Waiting for the connection to return.</p>
      </section>
    </main>
  );
}

export default DisconnectedPage;
