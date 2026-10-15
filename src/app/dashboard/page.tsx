"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

interface ClubCardData {
  id: string;
  name: string;
  teacherName: string;
  totalSessions: number;
  approvedCount: number;
  hasOpenSessionToday: boolean;
  openSessionId: string | null;
}

interface StudentData {
  id: string;
  fullName: string;
  phone: string;
  role: "student";
  grade: number;
  avatarUrl: string | null;
}

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [clubs, setClubs] = useState<ClubCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/student/dashboard");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load dashboard data");
        }

        setStudent(data.student);
        setClubs(data.clubs || []);
      } catch (err: any) {
        console.error("Dashboard load failed:", err);
        setError(err.message || "Failed to load student dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading clubs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar
        userName={student?.fullName || "Student"}
        role="student"
        grade={student?.grade}
        avatarUrl={student?.avatarUrl}
      />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Page Heading */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              My Clubs
            </h1>
            <p className="text-xs text-zinc-500">
              Select a club to submit attendance or view past sessions
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 2 Horizontal Club Cards */}
        <div className="grid grid-cols-1 gap-4">
          {clubs.map((club) => {
            const attendancePercent =
              club.totalSessions > 0
                ? Math.round((club.approvedCount / club.totalSessions) * 100)
                : 0;

            return (
              <div
                key={club.id}
                className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-300 transition-colors"
              >
                {/* Left: Club information */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                      {club.name}
                    </h2>
                    {club.hasOpenSessionToday && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Session Open Today
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500">
                    Faculty Advisor:{" "}
                    <span className="text-zinc-700 font-medium">
                      {club.teacherName}
                    </span>
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-xs text-zinc-600">
                    <span className="font-medium text-zinc-900">
                      Attendance Rate:
                    </span>
                    <span>
                      {club.approvedCount} / {club.totalSessions} sessions (
                      {attendancePercent}%)
                    </span>
                  </div>
                </div>

                {/* Right: Enter Club Action */}
                <div className="flex items-center sm:self-center">
                  <Link
                    href={`/club/${club.id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <span>View Club</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}

          {clubs.length === 0 && !error && (
            <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-700">
                No club enrollments found
              </p>
              <p className="text-xs text-zinc-500">
                You have not joined any school clubs yet. Please contact the
                club advisor.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
