import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardContent() {
  const { userId, profile } = await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      {/* Eyebrow */}
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
        Dev · Placeholder
      </p>

      {/* Title */}
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Dashboard
      </h1>

      {/* Debug card */}
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
        <DebugRow label="Clerk user" value={userId} mono />
        <DebugRow
          label="Neon profile"
          value={profile ? "found" : "none yet"}
          status={profile ? "ok" : "muted"}
        />
      </div>

      {/* Footnote */}
      <p className="text-xs text-neutral-500">
        This is a placeholder. The real dashboard will live here.
      </p>
    </div>
  );
}

function DebugRow({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: "ok" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>

      <span className="flex items-center gap-2">
        {status && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "ok" ? "bg-emerald-400" : "bg-neutral-600"
            }`}
          />
        )}
        <span
          className={`truncate text-sm ${
            status === "ok"
              ? "text-emerald-300"
              : status === "muted"
                ? "text-neutral-400"
                : "text-neutral-200"
          } ${mono ? "font-mono text-[12px]" : ""}`}
        >
          {value}
        </span>
      </span>
    </div>
  );
}