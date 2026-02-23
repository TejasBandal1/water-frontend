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
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Manager Overview</h1>
          <p className="text-sm text-slate-500">Track operational status and handoffs.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          {dateLabel} | {timeLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <InfoCard title="Operations" value="Stable" note="Trip and delivery workflows are active." />
        <InfoCard title="Pending Reviews" value="Check Admin Logs" note="Audit and invoice reviews are handled in admin panel." />
        <InfoCard title="Team Sync" value="In Progress" note="Coordinate driver and client escalations." />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manager Notes</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use this screen as the command center for handoff updates. If you want dedicated manager modules,
          we can add manager routes for approvals, dispatch tracking, and escalation queues.
        </p>
      </div>
    </div>
  );
};

const InfoCard = ({ title, value, note }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-600">{note}</p>
  </div>
);

export default ManagerDashboard;
