import React from "react";

export function CollisionTextbox({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.75)",
        borderRadius: 12,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
