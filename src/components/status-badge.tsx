export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-white/10 text-slate-200",
    queued: "bg-amber-100 text-amber-800",
    sending: "bg-blue-100 text-blue-800",
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`badge ${styles[status] ?? "bg-white/10 text-slate-200"}`}>
      {status}
    </span>
  );
}
