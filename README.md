# School Club Attendance Web Application

A minimalist, production-ready "Google Classroom-style" School Club Attendance web application architected for **100% free hosting** on Vercel, Supabase, and GitHub.

---

## 1. Free-Tier Architecture & Storage Optimization

- **Zero-Cost Authentication**: Custom phone number + bcrypt password authentication signed with lightweight `jose` HTTP-only JWT cookies stored in the Supabase PostgreSQL database. Avoids third-party SMS OTP costs.
- **Client-Side Image Compression (<100KB)**: Uses HTML5 `<canvas>` via `src/lib/image-compression.ts` to automatically resize all profile pictures and attendance photos to a maximum width of **1000px** and JPEG quality **0.7** *before* upload. A 4MB phone camera photo is reduced to ~85KB–110KB, guaranteeing that Supabase's 1GB free storage tier accommodates thousands of student check-ins.
- **Utilitarian Monochrome Design**: Linear/Notion-inspired interface without marketing fluff, gradients, glassmorphism, or emojis. Semantic colors are strictly reserved for status badges (`Present`, `Pending Review`, `Rejected`, `Absent`).

---

## 2. 1-Click Supabase Database Setup

1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, and click **Run**.
4. This one script will automatically:
   - Create all 5 relational tables (`clubs`, `users`, `club_members`, `sessions`, `attendance`)
   - Create performance indexes and unique constraints
   - Configure Row Level Security (RLS) policies
   - Seed the initial master club list (`Robotics Club`, `Debate Club`, `Basketball Club`, `Art & Design Club`, `Coding Club`, `Music Club`)
   - Provision public storage buckets: `avatars` and `attendance-photos` with permissive upload/read policies.

---

## 3. Environment Variables

Create a `.env.local` file (or configure in Vercel Project Settings) based on `.env.example`:

```env
# Supabase Project Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication Secret for jose JWT signing (at least 32 characters)
JWT_SECRET=super-secret-jwt-key-min-32-chars-long-change-in-production

# Teacher Registration Security Code
NEXT_PUBLIC_TEACHER_CODE=TEACHER2026
```

---

## Live Production URLs

- **Primary URL**: **[https://nb-attendance.vercel.app](https://nb-attendance.vercel.app)**
- **Short Alias**: **[https://nb-clubs.vercel.app](https://nb-clubs.vercel.app)**
- **Student Sign-Up**: [https://nb-attendance.vercel.app/signup](https://nb-attendance.vercel.app/signup)
- **Teacher Secret Registration**: [https://nb-attendance.vercel.app/teacher-register](https://nb-attendance.vercel.app/teacher-register)

---

## 4. Workflows & Routes

### Student Flow
- **`/` or `/login`**: Minimal phone + password sign-in card.
- **`/signup`**: Public registration for students with Name, Grade (6–12), Phone, Password, optional Profile Picture (auto-compressed), and 2 different club selections from the master list.
- **`/dashboard`**: Shows student's joined clubs, leading teacher's name, attendance rate (`Approved / Total`), and "Session Open Today" badge.
- **`/club/[id]`**:
  - If a session is open today: Clean check-in card with mobile camera photo capture (`accept="image/*"`), "What did you work on today?" text area, and submit button.
  - Session history list with dates, submission thumbnail preview, and status badges (`Present`, `Pending Review`, `Rejected`, `Absent`).

### Faculty Advisor (Teacher) Flow
- **`/teacher-register`** *(Unlisted direct URL)*: Secret teacher registration requiring the club they lead and the teacher invite code (`TEACHER2026`).
- **`/teacher`**:
  - **Attendance Sessions Tab**: View all sessions, create a new attendance session for today, toggle session open/closed, review submissions with photo lightbox and inline `Present` / `Reject` buttons, and view missing students table with contact info.
  - **Student Roster Tab**: Clean table of all enrolled club members, grades, phone numbers, and approved attendance tallies.

---

## 5. Master Club Configuration

To add or modify clubs, update `src/config/clubs.ts`:

```ts
export const MASTER_CLUBS = [
  "Robotics Club",
  "Debate Club",
  "Basketball Club",
  "Art & Design Club",
  "Coding Club",
  "Music Club",
] as const;
```

---

## 6. Deployment to Vercel (100% Free)

1. Push this project to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** -> import your GitHub repository.
3. In **Environment Variables**, paste the keys from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_TEACHER_CODE`
4. Click **Deploy**. Your app is live with zero monthly hosting costs.
