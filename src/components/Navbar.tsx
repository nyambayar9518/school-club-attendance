"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";

interface NavbarProps {
  userName: string;
  role: "student" | "teacher";
  grade?: number | null;
  avatarUrl?: string | null;
  clubName?: string | null;
}

export function Navbar({
  userName,
  role,
  grade,
  avatarUrl,
  clubName,
}: NavbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: User identity & role context */}
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0">
              <Image
                src={avatarUrl}
                alt={userName}
                fill
                sizes="32px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 flex-shrink-0">
              {getInitials(userName || "User")}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">
              {userName}
            </span>

            {role === "student" && grade && (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-zinc-100 text-zinc-600 border-zinc-200">
                Grade {grade}
              </span>
            )}

            {role === "teacher" && clubName && (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-zinc-100 text-zinc-700 border-zinc-200">
                {clubName} Leader
              </span>
            )}
          </div>
        </div>

        {/* Right: Logout Action */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-2.5 py-1.5 rounded-md transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? "Signing out..." : "Log out"}</span>
        </button>
      </div>
    </header>
  );
}
