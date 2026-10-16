"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageModal } from "@/components/ImageModal";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Check,
  X,
  LogOut,
  Loader2,
  Eye,
} from "lucide-react";

interface AdminMetrics {
  totalClubs: number;
  totalTeachers: number;
  totalStudents: number;
  totalSessions: number;
  totalSubmissions: number;
  totalApproved: number;
  overallAttendanceRate: number;
}

interface TeacherInfo {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  clubId: string | null;
  clubName: string;
  enrolledStudentsCount: number;
  sessionsCount: number;
  schedules: Array<{
    id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    min_grade: number;
    max_grade: number;
  }>;
}

interface StudentInfo {
  id: string;
  fullName: string;
  grade: number | null;
  phone: string;
  avatarUrl: string | null;
  enrolledClubs: string[];
  approvedAttendanceCount: number;
  totalPossibleSessions: number;
  attendanceRate: number;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  grade: number | null;
  phone: string;
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  clubName: string;
  photoUrl: string | null;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Overview data
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    "teachers" | "students" | "attendance"
  >("teachers");

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Photo viewer lightbox
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // Check admin session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        setIsAuthenticated(!!data.authenticated);
        if (data.authenticated) {
          fetchAdminOverview();
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");

      setMetrics(data.metrics);
      setTeachers(data.teachers || []);
      setStudents(data.students || []);
      setAttendance(data.attendance || []);
      setClubs(data.clubs || []);
    } catch (err: any) {
      console.error("Overview error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!passcode.trim()) {
      setAuthError("Please enter the administrator passcode.");
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid administrator passcode");
      }

      setIsAuthenticated(true);
      await fetchAdminOverview();
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAuthenticated(false);
      setPasscode("");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleStatusOverride = async (
    attendanceId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const res = await fetch("/api/admin/attendance/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Override failed");

      // Update locally
      setAttendance((prev) =>
        prev.map((a) => (a.id === attendanceId ? { ...a, status } : a))
      );
    } catch (err: any) {
      alert(err.message || "Failed to override status");
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.phone.includes(studentSearch);
    const matchesGrade =
      gradeFilter === "all" || s.grade?.toString() === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  // Filter attendance feed
  const filteredAttendance = attendance.filter((a) => {
    const matchesClub = clubFilter === "all" || a.clubName === clubFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesClub && matchesStatus;
  });

  // Loading screen before checking session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Passcode gate modal / card
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 bg-zinc-50">
        <div className="max-w-sm w-full mx-auto space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Administrator Access
            </h1>
            <p className="text-xs text-zinc-500">
              Enter the master administrator passcode to inspect all records
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
            {authError && (
              <div className="p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded">
                {authError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="passcode"
                  className="block text-xs font-medium text-zinc-700"
                >
                  Admin Passcode
                </label>
                <input
                  id="passcode"
                  type="password"
                  required
                  placeholder="Enter admin passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono placeholder:font-sans placeholder:text-zinc-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{authLoading ? "Verifying..." : "Access Admin Panel"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-zinc-900">
                School Administrator Panel
              </span>
              <span className="text-[11px] text-zinc-400 ml-2">Audit &amp; Check</span>
            </div>
          </div>

          <button
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* METRICS CARDS */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1">
              <span className="text-xs text-zinc-500">Clubs</span>
              <p className="text-xl font-semibold tracking-tight text-zinc-900">
                {metrics.totalClubs}
              </p>
              <p className="text-[11px] text-zinc-400">Master active clubs</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1">
              <span className="text-xs text-zinc-500">Teachers</span>
              <p className="text-xl font-semibold tracking-tight text-zinc-900">
                {metrics.totalTeachers}
              </p>
              <p className="text-[11px] text-zinc-400">Faculty leaders</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1">
              <span className="text-xs text-zinc-500">Students</span>
              <p className="text-xl font-semibold tracking-tight text-zinc-900">
                {metrics.totalStudents}
              </p>
              <p className="text-[11px] text-zinc-400">Total enrolled</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1">
              <span className="text-xs text-zinc-500">Overall Attendance</span>
              <p className="text-xl font-semibold tracking-tight text-emerald-700">
                {metrics.overallAttendanceRate}%
              </p>
              <p className="text-[11px] text-zinc-400">
                {metrics.totalApproved} / {metrics.totalSubmissions} approved
              </p>
            </div>
          </div>
        )}

        {/* ADMIN VIEW TABS */}
        <div className="flex border-b border-zinc-200 gap-6">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "teachers"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Teachers &amp; Schedules</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "students"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students Directory</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "attendance"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Master Attendance Feed</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {attendance.length}
            </span>
          </button>
        </div>

        {/* TAB 1: TEACHERS & SCHEDULES */}
        {activeTab === "teachers" && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Teacher</th>
                    <th className="py-3 px-4 font-medium">Assigned Club</th>
                    <th className="py-3 px-4 font-medium">Weekly Meeting Schedule &amp; Grades</th>
                    <th className="py-3 px-4 font-medium text-right">Enrolled Students</th>
                    <th className="py-3 px-4 font-medium text-right">Total Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-zinc-900">{t.fullName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{t.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-zinc-100 text-zinc-800 border-zinc-200">
                          {t.clubName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {t.schedules.length > 0 ? (
                          <div className="space-y-1">
                            {t.schedules.map((s) => (
                              <div
                                key={s.id}
                                className="text-[11px] text-zinc-700 flex items-center gap-1.5"
                              >
                                <span className="font-semibold">{s.day_of_week}</span>
                                <span className="text-zinc-500">
                                  {s.start_time}–{s.end_time}
                                </span>
                                <span className="text-zinc-400">
                                  (Grades {s.min_grade}–{s.max_grade})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">No schedule slots set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-zinc-900">
                        {t.enrolledStudentsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-zinc-900">
                        {t.sessionsCount}
                      </td>
                    </tr>
                  ))}

                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        No faculty members registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENTS DIRECTORY */}
        {activeTab === "students" && (
          <div className="space-y-4">
            {/* Search and Grade Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search students by name or phone..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="all">All Grades</option>
                {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Student Name</th>
                    <th className="py-3 px-4 font-medium">Grade</th>
                    <th className="py-3 px-4 font-medium">Phone Number</th>
                    <th className="py-3 px-4 font-medium">Enrolled Clubs</th>
                    <th className="py-3 px-4 font-medium text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {s.avatarUrl ? (
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0">
                              <Image
                                src={s.avatarUrl}
                                alt={s.fullName}
                                fill
                                sizes="24px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 font-semibold flex items-center justify-center text-[10px] flex-shrink-0">
                              {s.fullName.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-zinc-900">
                            {s.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {s.grade ? `Grade ${s.grade}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-mono">
                        {s.phone}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.enrolledClubs.map((club, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 border border-zinc-200"
                            >
                              {club}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-zinc-900">
                          {s.approvedAttendanceCount}
                        </span>
                        <span className="text-zinc-500">
                          {" "}
                          / {s.totalPossibleSessions} ({s.attendanceRate}%)
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        No students match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MASTER ATTENDANCE FEED */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="all">All Clubs</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Present / Approved</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Feed List */}
            <div className="space-y-3">
              {filteredAttendance.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between hover:border-zinc-300 transition-colors"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    {item.photoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage({
                            url: item.photoUrl!,
                            alt: `Attendance photo from ${item.studentName}`,
                          })
                        }
                        className="relative w-16 h-16 rounded border border-zinc-200 overflow-hidden flex-shrink-0 group hover:opacity-90 bg-zinc-100"
                        title="Click to view photo"
                      >
                        <Image
                          src={item.photoUrl}
                          alt="Submission thumbnail"
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium">
                          Zoom
                        </span>
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded border border-zinc-200 bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0">
                        No photo
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-900">
                          {item.studentName}
                        </span>
                        {item.grade && (
                          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded">
                            Grade {item.grade}
                          </span>
                        )}
                        <span className="text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {item.clubName}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>

                      <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                        <span>Session: {item.sessionTitle}</span>
                        <span>·</span>
                        <span>Date: {item.sessionDate}</span>
                        <span>·</span>
                        <span>
                          {new Date(item.submittedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Override Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStatusOverride(item.id, "approved")}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors ${
                        item.status === "approved"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-zinc-300 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                      title="Set as Present"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusOverride(item.id, "rejected")}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors ${
                        item.status === "rejected"
                          ? "bg-red-600 text-white"
                          : "bg-white border border-zinc-300 text-zinc-700 hover:bg-red-50 hover:text-red-700"
                      }`}
                      title="Set as Rejected"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}

              {filteredAttendance.length === 0 && (
                <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-xs text-zinc-500">
                  No attendance records found matching the filters.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={selectedImage?.url || null}
        altText={selectedImage?.alt || "Photo"}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
