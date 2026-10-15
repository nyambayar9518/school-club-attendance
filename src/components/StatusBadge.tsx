import React from "react";

export type AttendanceStatus = "approved" | "pending" | "rejected" | "absent" | "present";

interface StatusBadgeProps {
  status: AttendanceStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  if (normalized === "approved" || normalized === "present") {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 ${className}`}
      >
        Present
      </span>
    );
  }

  if (normalized === "pending") {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 ${className}`}
      >
        Pending Review
      </span>
    );
  }

  if (normalized === "rejected") {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 ${className}`}
      >
        Rejected
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 ${className}`}
    >
      Absent
    </span>
  );
}
