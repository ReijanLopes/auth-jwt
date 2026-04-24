"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type ViewButtonProps = {
  initialVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  className?: string;
};

export function ViewButton({
  initialVisible = false,
  onToggle,
  className = "",
}: ViewButtonProps) {
  const [visible, setVisible] = useState(initialVisible);

  function handleToggle() {
    const newValue = !visible;
    setVisible(newValue);
    onToggle?.(newValue);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-lg cursor-pointer transition ${className}`}
      aria-label={visible ? "Ocultar" : "Visualizar"}
    >
      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );
}