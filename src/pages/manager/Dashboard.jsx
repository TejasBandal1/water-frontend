import { useMemo } from "react";

const ManagerDashboard = () => {
  const now = useMemo(() => new Date(), []);

  const dateLabel = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });

  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata"
  });

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-eyebrow">Management</p>
            <h1 className="page-title">Manager Overview</h1>
            <p className="page-subtitle">Track operational status, handoffs, and priority coordination points.</p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/25">
            {dateLabel} | {timeLabel}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <InfoCard title="Operations" value="Stable" note="Trip and delivery workflows are active." />
        <InfoCard title="Pending Reviews" value="Check Admin Logs" note="Audit and invoice reviews are handled in admin panel." />
        <InfoCard title="Team Sync" value="In Progress" note="Coordinate driver and client escalations." />
      </div>

      <div className="panel mt-8 p-6">
        <h2 className="section-title">Manager Notes</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use this screen as the command center for handoff updates. If you want dedicated manager modules,
          we can add manager routes for approvals, dispatch tracking, and escalation queues.
        </p>
      </div>
    </div>
  );
};

const InfoCard = ({ title, value, note }) => (
  <div className="stat-card p-6">
    <p className="stat-label">{title}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-600">{note}</p>
  </div>
);

export default ManagerDashboard;
