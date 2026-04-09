import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ActionDropdown({
  position,
  isOpen,
  onClose,
  onAssignFaculty,
  onAssignCoordinator,
  onToggleClose,
  isClosed,
  closeLabel,
}) {
  const dropdownRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg transition-all duration-200 ease-out ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      style={{
        top: position?.y ?? 0,
        left: position?.x ?? 0,
      }}
    >
      <button
        type="button"
        onClick={onAssignFaculty}
        className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
      >
        Assign Faculty
      </button>
      <button
        type="button"
        onClick={onAssignCoordinator}
        className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
      >
        Assign Coordinator
      </button>
      <button
        type="button"
        onClick={onToggleClose}
        className={`w-full rounded-lg px-3 py-2 text-left text-xs ${isClosed ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-700 hover:bg-rose-50"}`}
      >
        {closeLabel}
      </button>
    </div>,
    document.body
  );
}
