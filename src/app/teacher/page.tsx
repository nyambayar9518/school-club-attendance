"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageModal } from "@/components/ImageModal";
import {
  Plus,
  Users,
  CalendarCheck,
  Calendar,
  Trash2,
  Check,
  X,
  Loader2,
  Lock,
  Unlock,
  ChevronRight,
  Phone,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface ScheduleSlotItem {
  id: string;
  club_id: string;
  teacher_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  min_grade: number;
  max_grade: number;
}

interface TeacherClub {
  id: string;
  name: string;
}

interface SessionSummary {
  id: string;
  title: string;
  sessionDate: string;
  isOpen: boolean;
  submissionCount: number;
  pendingCount: number;
  approvedCount: number;
  enrolledCount: number;
}

interface SubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  grade: number | null;
  phone: string;
  avatarUrl: string | null;
  photoUrl: string | null;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

interface MissingStudentItem {
  id: string;
  fullName: string;
  grade: number | null;
  phone: string;
  avatarUrl: string | null;
}

interface RosterStudent {
  id: string;
  fullName: string;
  grade: number | null;
  phone: string;
  avatarUrl: string | null;
  approvedCount: number;
  totalSessions: number;
}

export default function TeacherDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [club, setClub] = useState<TeacherClub | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<"sessions" | "roster" | "schedule">("sessions");

  // Selected session for review panel
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [sessionDetail, setSessionDetail] = useState<{
    session: any;
    submitted: SubmissionItem[];
    missing: MissingStudentItem[];
  } | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);
  const [sessionReviewSubTab, setSessionReviewSubTab] = useState<
    "submitted" | "missing"
  >("submitted");

  // Roster data
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Weekly Schedule Slots data
  const [schedules, setSchedules] = useState<ScheduleSlotItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotDay, setSlotDay] = useState("Friday");
  const [slotStart, setSlotStart] = useState("15:00");
  const [slotEnd, setSlotEnd] = useState("16:00");
  const [slotMinGrade, setSlotMinGrade] = useState("7");
  const [slotMaxGrade, setSlotMaxGrade] = useState("9");
  const [savingSlot, setSavingSlot] = useState(false);

  // Create session modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlotForSession, setSelectedSlotForSession] = useState<string>("");
  const [creatingSession, setCreatingSession] = useState(false);

  // Image modal lightbox
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // Fetch teacher dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/dashboard");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load teacher dashboard");
      }

      setCurrentUser(data.teacher);
      setClub(data.club);
      setSessions(data.sessions || []);
      setEnrolledCount(data.enrolledCount || 0);
      loadSchedulesData();
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Fetch single session review data
  const loadSessionDetails = async (id: string) => {
    try {
      setLoadingSessionDetail(true);
      const res = await fetch(`/api/teacher/session/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load session details");
      }
      setSessionDetail(data);
    } catch (err: any) {
      console.error("Session detail error:", err);
      setError(err.message || "Failed to load session");
    } finally {
      setLoadingSessionDetail(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    loadSessionDetails(id);
  };

  // Toggle session open/close
  const handleToggleSession = async () => {
    if (!sessionDetail) return;
    const newStatus = !sessionDetail.session.is_open;

    try {
      const res = await fetch("/api/teacher/session/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionDetail.session.id,
          isOpen: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle session");

      setSessionDetail((prev) =>
        prev
          ? {
              ...prev,
              session: { ...prev.session, is_open: newStatus },
            }
          : null
      );

      // Also update in sessions list
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionDetail.session.id ? { ...s, isOpen: newStatus } : s
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to update session");
    }
  };

  // Inline update submission status (Approve / Reject)
  const handleUpdateStatus = async (
    attendanceId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const res = await fetch("/api/teacher/attendance/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      // Update locally in sessionDetail
      setSessionDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          submitted: prev.submitted.map((sub) =>
            sub.id === attendanceId ? { ...sub, status } : sub
          ),
        };
      });

      // Update pending/approved counts in sessions list
      if (selectedSessionId) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== selectedSessionId) return s;
            return {
              ...s,
              pendingCount: Math.max(0, s.pendingCount - 1),
              approvedCount: status === "approved" ? s.approvedCount + 1 : s.approvedCount,
            };
          })
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to update attendance status");
    }
  };

  // Load roster
  const loadRosterData = async () => {
    try {
      setLoadingRoster(true);
      const res = await fetch("/api/teacher/roster");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load roster");
      setRoster(data.students || []);
    } catch (err: any) {
      console.error("Roster error:", err);
      setError(err.message || "Failed to load student roster");
    } finally {
      setLoadingRoster(false);
    }
  };

  // Load schedules
  const loadSchedulesData = async () => {
    try {
      setLoadingSchedules(true);
      const res = await fetch("/api/teacher/schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleSwitchTab = (tab: "sessions" | "roster" | "schedule") => {
    setActiveTab(tab);
    if (tab === "roster" && roster.length === 0) {
      loadRosterData();
    }
    if (tab === "schedule" && schedules.length === 0) {
      loadSchedulesData();
    }
  };

  const handleCreateScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSlot(true);
      const res = await fetch("/api/teacher/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: slotDay,
          startTime: slotStart,
          endTime: slotEnd,
          minGrade: slotMinGrade,
          maxGrade: slotMaxGrade,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add slot");

      setShowAddSlotModal(false);
      await loadSchedulesData();
    } catch (err: any) {
      alert(err.message || "Failed to create schedule slot");
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteScheduleSlot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    try {
      const res = await fetch(`/api/teacher/schedules?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete slot");
      await loadSchedulesData();
    } catch (err: any) {
      alert(err.message || "Failed to delete slot");
    }
  };

  // Create new session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club || !newTitle.trim()) return;

    try {
      setCreatingSession(true);
      const res = await fetch("/api/teacher/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: club.id,
          title: newTitle.trim(),
          sessionDate: newDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      setShowCreateModal(false);
      setNewTitle("");
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading teacher dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <Navbar
        userName={currentUser?.fullName || "Faculty Advisor"}
        role="teacher"
        clubName={club?.name}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header with Club Name and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Faculty Management
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              {club?.name}
            </h1>
            <p className="text-xs text-zinc-500">
              {enrolledCount} enrolled students · {sessions.length} sessions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-4 py-2 text-sm font-medium transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Attendance Session</span>
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* View Tabs */}
        <div className="flex border-b border-zinc-200 gap-6">
          <button
            onClick={() => handleSwitchTab("sessions")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "sessions"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance Sessions</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {sessions.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab("roster")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "roster"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Roster</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {enrolledCount}
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab("schedule")}
            className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "schedule"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Weekly Schedule</span>
            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded border border-zinc-200">
              {schedules.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ATTENDANCE SESSIONS */}
        {activeTab === "sessions" && (
          <div className="space-y-6">
            {/* If a session is currently selected, show the Review Panel */}
            {selectedSessionId && sessionDetail ? (
              <section className="bg-white border border-zinc-200 rounded-lg p-5 space-y-5">
                {/* Back to list & Session Info */}
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSessionDetail(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to all sessions</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${
                        sessionDetail.session.is_open
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {sessionDetail.session.is_open ? "Session Open" : "Closed"}
                    </span>

                    <button
                      onClick={handleToggleSession}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-50 px-2.5 py-1 rounded transition-colors"
                    >
                      {sessionDetail.session.is_open ? (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Close Session</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>Reopen Session</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                    {sessionDetail.session.title}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Date: {sessionDetail.session.session_date}
                  </p>
                </div>

                {/* Sub-tabs: Submitted vs Missing */}
                <div className="flex border-b border-zinc-200 gap-4">
                  <button
                    onClick={() => setSessionReviewSubTab("submitted")}
                    className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                      sessionReviewSubTab === "submitted"
                        ? "border-zinc-900 text-zinc-900"
                        : "border-transparent text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    Submitted ({sessionDetail.submitted.length})
                  </button>

                  <button
                    onClick={() => setSessionReviewSubTab("missing")}
                    className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                      sessionReviewSubTab === "missing"
                        ? "border-zinc-900 text-zinc-900"
                        : "border-transparent text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    Missing ({sessionDetail.missing.length})
                  </button>
                </div>

                {/* Sub-tab A: Submitted List */}
                {sessionReviewSubTab === "submitted" && (
                  <div className="space-y-3">
                    {sessionDetail.submitted.map((sub) => (
                      <div
                        key={sub.id}
                        className="border border-zinc-200 rounded-md p-4 bg-zinc-50/50 hover:bg-zinc-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between"
                      >
                        {/* Student info and submission content */}
                        <div className="flex gap-3 flex-1 min-w-0">
                          {sub.photoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImage({
                                  url: sub.photoUrl!,
                                  alt: `${sub.studentName}'s attendance photo`,
                                })
                              }
                              className="relative w-16 h-16 rounded border border-zinc-200 overflow-hidden flex-shrink-0 group hover:opacity-90 bg-zinc-100"
                              title="Click to view full photo"
                            >
                              <Image
                                src={sub.photoUrl}
                                alt="Work photo"
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
                            <div className="w-16 h-16 rounded border border-zinc-200 bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400 font-medium flex-shrink-0">
                              No photo
                            </div>
                          )}

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-900 truncate">
                                {sub.studentName}
                              </span>
                              {sub.grade && (
                                <span className="text-[11px] font-medium text-zinc-500 bg-zinc-200/60 px-1.5 py-0.2 rounded">
                                  Grade {sub.grade}
                                </span>
                              )}
                              <StatusBadge status={sub.status} />
                            </div>

                            <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed line-clamp-2">
                              {sub.description}
                            </p>

                            <p className="text-[11px] text-zinc-400 flex items-center gap-1 pt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(sub.submittedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Inline Approve / Reject Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(sub.id, "approved")
                            }
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors ${
                              sub.status === "approved"
                                ? "bg-emerald-600 text-white"
                                : "bg-white border border-zinc-300 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(sub.id, "rejected")
                            }
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors ${
                              sub.status === "rejected"
                                ? "bg-red-600 text-white"
                                : "bg-white border border-zinc-300 text-zinc-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {sessionDetail.submitted.length === 0 && (
                      <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-md">
                        No submissions recorded for this session yet.
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab B: Missing Enrolled Students */}
                {sessionReviewSubTab === "missing" && (
                  <div className="border border-zinc-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">Student Name</th>
                          <th className="py-2.5 px-3 font-medium">Grade</th>
                          <th className="py-2.5 px-3 font-medium">Phone Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {sessionDetail.missing.map((st) => (
                          <tr key={st.id} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-3 font-medium text-zinc-900">
                              {st.fullName}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600">
                              {st.grade ? `Grade ${st.grade}` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 font-mono">
                              {st.phone}
                            </td>
                          </tr>
                        ))}

                        {sessionDetail.missing.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-6 text-center text-zinc-500"
                            >
                              All enrolled students have submitted attendance!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : (
              /* All Sessions List */
              <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className="p-4 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500">
                          {s.sessionDate}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {s.title}
                        </h3>
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                            s.isOpen
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {s.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500">
                        Submissions:{" "}
                        <span className="font-medium text-zinc-800">
                          {s.submissionCount}
                        </span>{" "}
                        / {s.enrolledCount} enrolled ·{" "}
                        <span className="text-emerald-700 font-medium">
                          {s.approvedCount} approved
                        </span>
                        {s.pendingCount > 0 && (
                          <span className="ml-1 text-amber-700 font-medium">
                            · {s.pendingCount} pending review
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-xs font-medium text-zinc-600 hidden sm:inline">
                        Review Session
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                    <p className="font-medium text-zinc-700">
                      No attendance sessions created yet
                    </p>
                    <p>
                      Click &quot;+ New Attendance Session&quot; above to start
                      today&apos;s check-in.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDENT ROSTER */}
        {activeTab === "roster" && (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {loadingRoster ? (
              <div className="p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading roster...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Student Name</th>
                    <th className="py-3 px-4 font-medium">Grade</th>
                    <th className="py-3 px-4 font-medium">Phone Number</th>
                    <th className="py-3 px-4 font-medium text-right">
                      Approved Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {roster.map((student) => {
                    const percent =
                      student.totalSessions > 0
                        ? Math.round(
                            (student.approvedCount / student.totalSessions) *
                              100
                          )
                        : 0;

                    return (
                      <tr key={student.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {student.avatarUrl ? (
                              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0">
                                <Image
                                  src={student.avatarUrl}
                                  alt={student.fullName}
                                  fill
                                  sizes="24px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 font-semibold flex items-center justify-center text-[10px] flex-shrink-0">
                                {student.fullName.substring(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-zinc-900">
                              {student.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          {student.grade ? `Grade ${student.grade}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 font-mono">
                          {student.phone}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-zinc-900">
                            {student.approvedCount}
                          </span>
                          <span className="text-zinc-500">
                            {" "}
                            / {student.totalSessions} sessions ({percent}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        No students are enrolled in this club yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: WEEKLY SCHEDULE SLOTS */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                  Weekly Meeting Schedule
                </h2>
                <p className="text-xs text-zinc-500">
                  Manage recurring weekly meeting days, times, and grade brackets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(true)}
                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Slot</span>
              </button>
            </div>

            {loadingSchedules ? (
              <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading schedules...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {schedules.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 flex flex-col justify-between hover:border-zinc-300 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border bg-zinc-100 text-zinc-900 border-zinc-200">
                          Every {slot.day_of_week}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteScheduleSlot(slot.id)}
                          className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-base font-semibold tracking-tight text-zinc-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-zinc-500" />
                          <span>{slot.start_time} – {slot.end_time}</span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          Target:{" "}
                          <span className="font-medium text-zinc-700">
                            Grades {slot.min_grade} to {slot.max_grade}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {schedules.length === 0 && (
                  <div className="sm:col-span-2 bg-white border border-dashed border-zinc-200 rounded-lg p-8 text-center text-xs text-zinc-500 space-y-2">
                    <p className="font-medium text-zinc-700">No weekly schedule slots configured</p>
                    <p>Click &quot;Add Time Slot&quot; above to add meeting times and grade groups.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE SESSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                New Attendance Session
              </h2>
              <p className="text-xs text-zinc-500">
                Create a check-in session for {club?.name}
              </p>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Pre-fill from schedule slots if available */}
              {schedules.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Schedule Slot / Target Group
                  </label>
                  <select
                    value={selectedSlotForSession}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSlotForSession(val);
                      if (val) {
                        const slot = schedules.find((s) => s.id === val);
                        if (slot) {
                          setNewTitle(`Session for Grades ${slot.min_grade}–${slot.max_grade}`);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="">All Club Members (General)</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.day_of_week} {s.start_time}–{s.end_time} (Grades {s.min_grade}–{s.max_grade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="sessionTitle"
                  className="block text-xs font-medium text-zinc-700"
                >
                  Session Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="sessionTitle"
                  type="text"
                  required
                  placeholder="e.g. Weekly Build #4 or Topic Discussion"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="sessionDate"
                  className="block text-xs font-medium text-zinc-700"
                >
                  Session Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="sessionDate"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {creatingSession && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {creatingSession ? "Creating..." : "Create Session"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SCHEDULE SLOT MODAL */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                Add Weekly Schedule Slot
              </h2>
              <p className="text-xs text-zinc-500">
                Define recurring day, time window, and target grades
              </p>
            </div>

            <form onSubmit={handleCreateScheduleSlot} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Day of Week
                </label>
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                    (d) => (
                      <option key={d} value={d}>
                        Every {d}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Grade Range
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={slotMinGrade}
                    onChange={(e) => setSlotMinGrade(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-zinc-400">to</span>
                  <select
                    value={slotMaxGrade}
                    onChange={(e) => setSlotMaxGrade(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {savingSlot && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingSlot ? "Saving..." : "Save Time Slot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={selectedImage?.url || null}
        altText={selectedImage?.alt || "Photo"}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
