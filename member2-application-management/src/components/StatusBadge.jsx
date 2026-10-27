export default function StatusBadge({ status }) {
  const cls = "badge badge-" + status.toLowerCase().replace(/\s+/g, "-");
  return <span className={cls}>{status}</span>;
}
