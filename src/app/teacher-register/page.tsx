"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MASTER_CLUBS } from "@/config/clubs";

export default function TeacherRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [teachingClub, setTeachingClub] = useState(MASTER_CLUBS[0] || "");
  const [teacherCode, setTeacherCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !password ||
      !teachingClub ||
      !teacherCode.trim()
    ) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/teacher-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          password,
          teachingClubName: teachingClub,
          teacherCode: teacherCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register faculty member");
      }

      router.push("/teacher");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Teacher registration failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Faculty Advisor Portal
          </h1>
          <p className="text-xs text-zinc-500">
            Authorized teacher registration for school clubs
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          {errorMessage && (
            <div className="p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label
                htmlFor="teacherName"
                className="block text-xs font-medium text-zinc-700"
              >
                Teacher Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="teacherName"
                type="text"
                required
                placeholder="Dr. Robert Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label
                htmlFor="teacherPhone"
                className="block text-xs font-medium text-zinc-700"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="teacherPhone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="e.g. 555-0188"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="teacherPassword"
                className="block text-xs font-medium text-zinc-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="teacherPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Teaching Club */}
            <div className="space-y-1">
              <label
                htmlFor="teachingClub"
                className="block text-xs font-medium text-zinc-700"
              >
                Club to Lead <span className="text-red-500">*</span>
              </label>
              <select
                id="teachingClub"
                value={teachingClub}
                onChange={(e) => setTeachingClub(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              >
                {MASTER_CLUBS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Code */}
            <div className="space-y-1">
              <label
                htmlFor="teacherCode"
                className="block text-xs font-medium text-zinc-700"
              >
                Teacher Invite Code <span className="text-red-500">*</span>
              </label>
              <input
                id="teacherCode"
                type="text"
                required
                placeholder="Enter invite code"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono placeholder:font-sans placeholder:text-zinc-400"
              />
              <p className="text-[11px] text-zinc-500">
                Provided by school administrator
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 pt-2.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Registering..." : "Register Faculty Advisor"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
