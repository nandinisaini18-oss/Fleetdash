import ConnectionStatus from "./ConnectionStatus";

function Header({ overview, socketConnected }) {
  const vehicles = overview?.vehicles;

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h1 className="header-title">FleetDash</h1>
        <span className="header-tag">Live</span>
      </div>

      <div className="header-center">
        {vehicles && (
          <>
            <div className="header-stat">
              <span className="header-stat-value" style={{ color: "var(--color-primary)" }}>{vehicles.total}</span>
              <span className="header-stat-label">Total</span>
            </div>
            <span className="header-stat-separator" />
            <div className="header-stat">
              <span className="header-stat-value" style={{ color: "var(--color-active)" }}>{vehicles.active}</span>
              <span className="header-stat-label">Active</span>
            </div>
            <span className="header-stat-separator" />
            <div className="header-stat">
              <span className="header-stat-value" style={{ color: "var(--color-inactive)" }}>{vehicles.inactive}</span>
              <span className="header-stat-label">Inactive</span>
            </div>
            <span className="header-stat-separator" />
            <div className="header-stat">
              <span className="header-stat-value" style={{ color: "var(--color-maintenance)" }}>{vehicles.maintenance}</span>
              <span className="header-stat-label">Maint.</span>
            </div>
          </>
        )}
      </div>

      <div className="header-right">
        <ConnectionStatus socketConnected={socketConnected} />
      </div>
    </header>
  );
}

export default Header;
