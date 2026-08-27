function StatsPanel({ overview, loading, error }) {
  if (loading) {
    return (
      <div className="stats-panel">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="stat-card stat-card--loading" key={i}>
            <span className="stat-value stat-skeleton" />
            <span className="stat-label stat-skeleton-label" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-panel">
        <div className="stat-card stat-card--error">
          <span className="stat-label">Dashboard unavailable</span>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="stats-panel">
        <div className="stat-card">
          <span className="stat-value" style={{ color: "var(--color-inactive)" }}>—</span>
          <span className="stat-label">No data</span>
        </div>
      </div>
    );
  }

  const { vehicles, geofence } = overview;

  const cards = [
    {
      label: "Total Vehicles",
      value: vehicles.total,
      color: "var(--color-primary)",
    },
    {
      label: "Active",
      value: vehicles.active,
      color: "var(--color-active)",
    },
    {
      label: "Inactive",
      value: vehicles.inactive,
      color: "var(--color-inactive)",
    },
    {
      label: "Maintenance",
      value: vehicles.maintenance,
      color: "var(--color-maintenance)",
    },
    {
      label: "Alerts",
      value: geofence.totalAlerts,
      color: "var(--color-accent)",
    },
  ];

  return (
    <div className="stats-panel">
      {cards.map((card) => (
        <div className="stat-card" key={card.label}>
          <span className="stat-value" style={{ color: card.color }}>
            {card.value}
          </span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

export default StatsPanel;
