import { useEffect } from "react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
      <button onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}
