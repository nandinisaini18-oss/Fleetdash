function StatsPanel({ overview, loading, error }) {
  if (loading) {
    return (
      <div className="stats-bar">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="stat-item" key={i}>
            <span className="skeleton stat-skeleton" />
            <span className="skeleton stat-skeleton-label" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label" style={{ color: "var(--color-inactive)" }}>
            {error ? "Data unavailable" : "No data"}
          </span>
        </div>
      </div>
    );
  }

  const { vehicles, geofence } = overview;
  const stats = [
    { label: "Total", value: vehicles.total, color: "var(--color-primary)" },
    { label: "Active", value: vehicles.active, color: "var(--color-active)" },
    { label: "Inactive", value: vehicles.inactive, color: "var(--color-inactive)" },
    { label: "Maint.", value: vehicles.maintenance, color: "var(--color-maintenance)" },
    { label: "Alerts", value: geofence.totalAlerts, color: "var(--color-accent)" },
  ];

  return (
    <div className="stats-bar">
      {stats.map((stat, i) => (
        <div key={stat.label}>
          <div className="stat-item">
            <span className="stat-dot" style={{ background: stat.color }} />
            <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
          {i < stats.length - 1 && <span className="stat-separator" />}
        </div>
      ))}
    </div>
  );
}

export default StatsPanel;
