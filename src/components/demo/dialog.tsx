"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="demo-dialog"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <button
        className="modal-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="eyebrow">STAFTIFY DEMO WORKSPACE</span>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
