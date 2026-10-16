"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Calendar, Clock, GraduationCap } from "lucide-react";
import { MASTER_CLUBS } from "@/config/clubs";

interface ScheduleSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  minGrade: number;
  maxGrade: number;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function TeacherRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [teachingClub, setTeachingClub] = useState(MASTER_CLUBS[0] || "");
  const [teacherCode, setTeacherCode] = useState("");

  // Weekly Schedule Slots Builder
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([
    {
      dayOfWeek: "Friday",
      startTime: "15:00",
      endTime: "16:00",
      minGrade: 7,
      maxGrade: 9,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddSlot = () => {
    // Suggest a smart next slot (e.g. 10-12 at 16:00)
    const lastSlot = schedules[schedules.length - 1];
    setSchedules([
      ...schedules,
      {
        dayOfWeek: lastSlot ? lastSlot.dayOfWeek : "Friday",
        startTime: lastSlot ? lastSlot.endTime : "16:00",
        endTime: "17:00",
        minGrade: 10,
        maxGrade: 12,
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    if (schedules.length <= 1) return;
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleUpdateSlot = (index: number, field: keyof ScheduleSlot, value: any) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

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

    // Validate schedules
    for (let i = 0; i < schedules.length; i++) {
      const slot = schedules[i];
      if (slot.minGrade > slot.maxGrade) {
        setErrorMessage(
          `Schedule slot #${i + 1}: Minimum grade cannot be higher than maximum grade.`
        );
        return;
      }
      if (!slot.startTime || !slot.endTime) {
        setErrorMessage(`Schedule slot #${i + 1}: Start and end times are required.`);
        return;
      }
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
          schedules,
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
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 bg-zinc-50">
      <div className="max-w-lg w-full mx-auto space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Faculty Advisor Portal
          </h1>
          <p className="text-xs text-zinc-500">
            Register your club, define weekly recurring meeting times, and assign grade brackets
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
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

            {/* WEEKLY RECURRING SCHEDULE BUILDER */}
            <div className="pt-3 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">
                    Weekly Schedule & Grade Groups
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Set specific days, times, and target grade levels for your weekly meetings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded border border-zinc-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Time Slot</span>
                </button>
              </div>

              {schedules.map((slot, index) => (
                <div
                  key={index}
                  className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700">
                      Slot #{index + 1}
                    </span>
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                        title="Remove slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day of Week */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-400" /> Day of Week
                      </label>
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) =>
                          handleUpdateSlot(index, "dayOfWeek", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            Every {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Grade Range */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-zinc-400" /> Target Grades
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={slot.minGrade}
                          onChange={(e) =>
                            handleUpdateSlot(
                              index,
                              "minGrade",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        >
                          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-zinc-400">to</span>
                        <select
                          value={slot.maxGrade}
                          onChange={(e) =>
                            handleUpdateSlot(
                              index,
                              "maxGrade",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        >
                          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Time Window */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" /> Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={slot.startTime}
                        onChange={(e) =>
                          handleUpdateSlot(index, "startTime", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" /> End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={slot.endTime}
                        onChange={(e) =>
                          handleUpdateSlot(index, "endTime", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Teacher Code */}
            <div className="pt-2 border-t border-zinc-100 space-y-1">
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
                Provided by school administrator (e.g. TEACHER2026)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 pt-2.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Registering..." : "Complete Faculty Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
