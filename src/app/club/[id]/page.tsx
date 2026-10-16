"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageModal } from "@/components/ImageModal";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  Check,
  XCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Maximize2,
  TrendingUp,
} from "lucide-react";

interface ClubInfo {
  id: string;
  name: string;
  teacherName: string;
}

interface ClubStats {
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
}

interface OpenSession {
  id: string;
  title: string;
  sessionDate: string;
  isOpen: boolean;
  submission: {
    id: string;
    photo_url: string | null;
    description: string;
    status: "pending" | "approved" | "rejected";
    submitted_at: string;
  } | null;
}

interface SessionHistoryItem {
  id: string;
  title: string;
  sessionDate: string;
  isOpen: boolean;
  isApplicableToGrade?: boolean;
  status: "approved" | "pending" | "rejected" | "absent";
  submission: {
    photo_url: string | null;
    description: string;
    submitted_at: string;
  } | null;
}

export default function StudentClubPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [openSession, setOpenSession] = useState<OpenSession | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Attendance Form State
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");

  // Modal image viewer
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const fetchClubData = async () => {
    try {
      const [clubRes, userRes] = await Promise.all([
        fetch(`/api/student/club/${clubId}`),
        fetch("/api/auth/me"),
      ]);

      const clubData = await clubRes.json();
      const userData = await userRes.json();

      if (!clubRes.ok) {
        throw new Error(clubData.error || "Failed to load club details");
      }

      setClub(clubData.club);
      setOpenSession(clubData.openSessionToday);
      setHistory(clubData.sessionHistory || []);
      setStats(clubData.stats || null);
      setCurrentUser(userData.user);
    } catch (err: any) {
      console.error("Fetch club error:", err);
      setError(err.message || "Failed to load club details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, [clubId]);

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openSession) return;
    setError(null);
    setSuccessMessage(null);

    if (!description.trim()) {
      setError("Please explain what you worked on today.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/student/submit-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: openSession.id,
          photoUrl: photoUrl || null,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit attendance");
      }

      setSuccessMessage("Attendance submitted successfully!");
      setPhotoUrl("");
      setDescription("");
      await fetchClubData();
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      setError(err.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading club details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      <Navbar
        userName={currentUser?.fullName || "Student"}
        role="student"
        grade={currentUser?.grade}
        avatarUrl={currentUser?.avatarUrl}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back navigation & Club header */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                {club?.name}
              </h1>
              <p className="text-xs text-zinc-500">
                Faculty Advisor:{" "}
                <span className="text-zinc-700 font-medium">
                  {club?.teacherName}
                </span>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TOP SECTION: Today's Session Check-in Box */}
        {openSession ? (
          <section className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                  Today&apos;s Session: {openSession.title}
                </h2>
              </div>
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {openSession.sessionDate}
              </span>
            </div>

            {/* Check if student already submitted */}
            {openSession.submission ? (
              <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Your Submission Status:
                  </span>
                  <StatusBadge status={openSession.submission.status} />
                </div>

                <div className="flex gap-4 items-start">
                  {openSession.submission.photo_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImage({
                          url: openSession.submission!.photo_url!,
                          alt: `Attendance photo for ${openSession.title}`,
                        })
                      }
                      className="relative w-20 h-20 rounded border border-zinc-200 overflow-hidden flex-shrink-0 group hover:opacity-90 transition-opacity bg-zinc-100"
                    >
                      <Image
                        src={openSession.submission.photo_url}
                        alt="Attendance submission"
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium">
                        View
                      </span>
                    </button>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-zinc-700">
                      Work completed:
                    </p>
                    <p className="text-xs text-zinc-900 leading-relaxed whitespace-pre-wrap">
                      {openSession.submission.description}
                    </p>
                    <p className="text-[11px] text-zinc-400 pt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Submitted at{" "}
                      {new Date(
                        openSession.submission.submitted_at
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Check-in form */
              <form onSubmit={handleSubmitAttendance} className="space-y-4">
                <ImageUploader
                  bucket="attendance-photos"
                  label="Attendance Photo (Optional proof of work)"
                  onUploaded={(url) => setPhotoUrl(url)}
                />

                <div className="space-y-1">
                  <label
                    htmlFor="description"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    What did you work on today?{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={3}
                    placeholder="Briefly describe your progress, project tasks, or topics discussed during today's session..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {submitting ? "Submitting..." : "Submit Attendance"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center justify-between text-xs text-zinc-500">
            <span>No attendance sessions are currently open today.</span>
            <span className="font-medium text-zinc-600">
              Check back during club hours
            </span>
          </div>
        )}

        {/* BOTTOM SECTION: Complete Club Sessions History with Visual Checklist & Progress Graph */}
        <section className="space-y-4">
          {/* Header & Overview Card */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-700" />
                  <span>Attendance Checklist & History</span>
                </h2>
                <p className="text-xs text-zinc-500">
                  Track your weekly participation and faculty-verified attendance records
                </p>
              </div>

              {(() => {
                const applicable = history.filter((s) => s.isApplicableToGrade !== false);
                const approved = applicable.filter((s) => s.status === "approved").length;
                const total = applicable.length;
                const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

                return (
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-lg font-bold text-zinc-900 leading-none">
                        {rate}%
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        Attendance Rate
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        rate >= 75
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : rate >= 50
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {rate >= 75 ? "Excellent" : rate >= 50 ? "In Progress" : "Low"}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Visual Progress Bar */}
            {(() => {
              const applicable = history.filter((s) => s.isApplicableToGrade !== false);
              const approved = applicable.filter((s) => s.status === "approved").length;
              const pending = applicable.filter((s) => s.status === "pending").length;
              const absent = applicable.filter((s) => s.status === "absent").length;
              const total = applicable.length;
              const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

              return (
                <div className="space-y-3">
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden flex">
                    <div
                      style={{ width: `${rate}%` }}
                      className="bg-emerald-600 transition-all duration-500"
                    />
                    {pending > 0 && total > 0 && (
                      <div
                        style={{ width: `${Math.round((pending / total) * 100)}%` }}
                        className="bg-amber-400 transition-all duration-500"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{approved} Verified Present</span>
                    </div>
                    {pending > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{pending} Under Review</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{absent} Missed</span>
                    </div>
                    <div className="text-zinc-400 font-mono text-[11px]">
                      {total} eligible {total === 1 ? "session" : "sessions"}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VISUAL TIMELINE STREAK GRAPH */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-zinc-100">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Timeline Streak Graph
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="flex items-center gap-3 min-w-max py-2 px-1">
                    {history.map((s, idx) => {
                      let nodeBg = "bg-zinc-100 border-zinc-300 text-zinc-400";
                      let icon = <span className="text-[10px] font-mono">○</span>;
                      let label = "Missed";

                      if (s.isApplicableToGrade === false) {
                        nodeBg = "bg-zinc-50 border-dashed border-zinc-300 text-zinc-300";
                        icon = <span className="text-[10px] font-mono">—</span>;
                        label = "Other Cohort";
                      } else if (s.status === "approved") {
                        nodeBg = "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-100";
                        icon = <Check className="w-3.5 h-3.5 stroke-[2.5]" />;
                        label = "Verified";
                      } else if (s.status === "pending") {
                        nodeBg = "bg-amber-500 border-amber-500 text-white shadow-sm ring-2 ring-amber-100";
                        icon = <Clock className="w-3.5 h-3.5 animate-pulse" />;
                        label = "Reviewing";
                      } else if (s.status === "rejected") {
                        nodeBg = "bg-red-500 border-red-500 text-white shadow-sm ring-2 ring-red-100";
                        icon = <XCircle className="w-3.5 h-3.5" />;
                        label = "Rejected";
                      }

                      return (
                        <div key={s.id} className="flex items-center">
                          <div className="flex flex-col items-center gap-1.5 group cursor-default">
                            <div
                              title={`${s.title} (${s.sessionDate}): ${label}`}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110 ${nodeBg}`}
                            >
                              {icon}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 font-medium">
                              {s.sessionDate.slice(5)}
                            </span>
                            <span className="text-[9px] text-zinc-400">
                              {label}
                            </span>
                          </div>

                          {idx < history.length - 1 && (
                            <div
                              className={`w-6 h-0.5 mx-1 transition-colors ${
                                s.status === "approved"
                                  ? "bg-emerald-300"
                                  : "bg-zinc-200"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CHECKLIST CARDS (Everyday Sessions, Newest First) */}
          <div className="space-y-3">
            {[...history].reverse().map((session) => {
              const isApproved = session.status === "approved";
              const isPending = session.status === "pending";
              const isRejected = session.status === "rejected";
              const isNotApplicable = session.isApplicableToGrade === false;

              let cardBorder = "border-zinc-200";
              if (isApproved) cardBorder = "border-emerald-200 bg-white";
              else if (isPending) cardBorder = "border-amber-200 bg-white";
              else if (isRejected) cardBorder = "border-red-200 bg-white";
              else if (isNotApplicable) cardBorder = "border-zinc-200 bg-zinc-50/50 opacity-60";

              return (
                <div
                  key={session.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-sm ${cardBorder}`}
                >
                  {/* Top Bar: Checklist Status Pill & Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified Present ✅</span>
                        </div>
                      )}
                      {isPending && (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Pending Faculty Review ⏳</span>
                        </div>
                      )}
                      {isRejected && (
                        <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Needs Resubmission ❌</span>
                        </div>
                      )}
                      {!isApproved && !isPending && !isRejected && !isNotApplicable && (
                        <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-500 border border-zinc-200 px-2.5 py-1 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Missed Session ⭕</span>
                        </div>
                      )}
                      {isNotApplicable && (
                        <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-400 border border-zinc-200 px-2.5 py-1 rounded-full text-xs font-medium">
                          <span>Not in Grade Cohort</span>
                        </div>
                      )}

                      <span className="text-xs font-semibold text-zinc-900">
                        {session.title}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {session.sessionDate}
                    </span>
                  </div>

                  {/* Submission Body */}
                  {session.submission ? (
                    <div className="pt-3 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start gap-3 bg-zinc-50 border border-zinc-200/80 rounded-md p-3">
                        {session.submission.photo_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImage({
                                url: session.submission!.photo_url!,
                                alt: `Attendance proof for ${session.title}`,
                              })
                            }
                            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded border border-zinc-200 overflow-hidden flex-shrink-0 group hover:opacity-90 transition-opacity bg-zinc-100"
                            title="Click to view full photo"
                          >
                            <Image
                              src={session.submission.photo_url}
                              alt="Thumbnail"
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                            What you worked on:
                          </div>
                          <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                            {session.submission.description}
                          </p>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1 pt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Submitted at{" "}
                              {new Date(
                                session.submission.submitted_at
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isApproved && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded px-2.5 py-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Approved by Faculty Advisor · Attendance Recorded</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-3">
                      <p className="text-xs text-zinc-400 italic">
                        {isNotApplicable
                          ? "This session was scheduled for a different grade cohort."
                          : "No attendance proof was submitted for this date."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-xs text-zinc-500">
                No past sessions recorded yet for this club.
              </div>
            )}
          </div>
        </section>
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
