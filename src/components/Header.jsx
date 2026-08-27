import ConnectionStatus from "./ConnectionStatus";

function Header({ socketConnected }) {
  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <svg
          className="header-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h1 className="header-title">FleetDash</h1>
      </div>
      <div className="header-right">
        <span className="header-subtitle">Fleet Telemetry Dashboard</span>
        <ConnectionStatus socketConnected={socketConnected} />
      </div>
    </header>
  );
}

export default Header;
