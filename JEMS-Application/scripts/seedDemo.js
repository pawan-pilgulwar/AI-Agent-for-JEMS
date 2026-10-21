/**
 * Seeds a fully-populated demo student so anyone can sign in and see what a
 * "lived-in" Jems account looks like across every section.
 *
 *   Login:    demo@jems.dev
 *   Password: Demo@1234
 *
 * Run with:  npm run seed-demo
 * Safe to re-run — it wipes and re-creates the demo account each time.
 */

const { MongoClient, ObjectId } = require("mongodb");
const { randomBytes, scryptSync } = require("crypto");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "jems_production";

const DEMO_EMAIL = "demo@jems.dev";
const DEMO_PASSWORD = "Demo@1234";

/** Mirror of lib/auth/password.ts so the demo login verifies correctly. */
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seed() {
  if (!MONGODB_URI) {
    console.error("✗ MONGODB_URI not set. Run via: npm run seed-demo");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  // Works around Node DNS servers that refuse SRV lookups (see lib/db/dns-fallback.cjs).
  await require("../lib/db/dns-fallback.cjs").ensureSrvDns(process.env.MONGODB_URI);
  await client.connect();
  console.log("✓ Connected to MongoDB");
  const db = client.db(DB_NAME);

  try {
    // ── Wipe any previous demo data ──────────────────────────────
    const existing = await db.collection("users").findOne({ email: DEMO_EMAIL });
    if (existing) {
      const sid = existing._id;
      await Promise.all([
        db.collection("studentProfiles").deleteMany({ userId: sid }),
        db.collection("resumes").deleteMany({ studentId: sid }),
        db.collection("candidateMatches").deleteMany({ studentId: sid }),
        db.collection("jobApplications").deleteMany({ studentId: sid }),
        db.collection("savedJobs").deleteMany({ studentId: sid }),
        db.collection("mockInterviews").deleteMany({ studentId: sid }),
        db.collection("learningPaths").deleteMany({ studentId: sid }),
        db.collection("studentAnalytics").deleteMany({ studentId: sid }),
        db.collection("activityLogs").deleteMany({ userId: sid }),
      ]);
      await db.collection("jobPostings").deleteMany({ demo: true });
      await db.collection("users").deleteOne({ _id: sid });
      console.log("• Cleared previous demo data");
    }

    const now = new Date();

    // ── User ─────────────────────────────────────────────────────
    const userRes = await db.collection("users").insertOne({
      name: "Rahul Verma",
      email: DEMO_EMAIL,
      role: "student",
      authProvider: "credentials",
      passwordHash: hashPassword(DEMO_PASSWORD),
      phone: "+91 98765 43210",
      image: null,
      emailVerified: now,
      createdAt: daysAgo(40),
      updatedAt: now,
    });
    const studentId = userRes.insertedId;
    console.log("✓ Demo user created");

    // ── Profile (skills feed the dashboard + progress) ───────────
    await db.collection("studentProfiles").insertOne({
      userId: studentId,
      username: "rahul.verma",
      firstName: "Rahul",
      lastName: "Verma",
      nickname: "Rahul",
      displayName: "Rahul Verma",
      displayRole: "Student",
      bio: "Aspiring frontend developer passionate about building delightful, accessible web experiences with React and TypeScript. Looking for my first full-time role.",
      location: "Bengaluru, India",
      website: "rahulverma.dev",
      linkedin: "https://linkedin.com/in/rahulverma",
      github: "https://github.com/rahulverma",
      whatsapp: "@rahul-verma",
      telegram: "@rahul-verma",
      phone: "+91 98765 43210",
      avatar:
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9",
      experienceLevel: "Entry level",
      targetRole: "Frontend Developer",
      learningStyle: "Hands-on projects",
      yearsOfExperience: "0-1 years",
      skills: [
        { name: "React", level: 80 },
        { name: "JavaScript", level: 75 },
        { name: "CSS / Tailwind", level: 70 },
        { name: "TypeScript", level: 55 },
        { name: "Node.js", level: 40 },
      ],
      createdAt: daysAgo(40),
      updatedAt: now,
    });

    // ── Job postings (shared catalogue, tagged demo) ─────────────
    const jobsRes = await db.collection("jobPostings").insertMany(
      [
        { role: "Frontend Developer", company: "Stripe", location: "Remote", type: "Full-time", salary: "$120k–150k", remote: true, postedAt: daysAgo(2) },
        { role: "React Engineer", company: "Airbnb", location: "Bengaluru", type: "Full-time", salary: "₹18–24 LPA", remote: false, postedAt: daysAgo(4) },
        { role: "UI Engineer", company: "Razorpay", location: "Hybrid", type: "Full-time", salary: "₹14–20 LPA", remote: true, postedAt: daysAgo(7) },
        { role: "Junior Web Developer", company: "Zoho", location: "Chennai", type: "Full-time", salary: "₹8–12 LPA", remote: false, postedAt: daysAgo(7) },
        { role: "Frontend Engineer", company: "Vercel", location: "Remote", type: "Full-time", salary: "$110k–140k", remote: true, postedAt: daysAgo(3) },
        { role: "Software Engineer I", company: "Swiggy", location: "Bengaluru", type: "Full-time", salary: "₹16–22 LPA", remote: false, postedAt: daysAgo(5) },
      ].map((j) => ({ ...j, status: "open", demo: true, createdAt: j.postedAt })),
    );
    const job = jobsRes.insertedIds; // { 0: id, 1: id, ... }

    // ── Candidate matches (per-student scores) ───────────────────
    const matchScores = [92, 88, 81, 76, 90, 79];
    await db.collection("candidateMatches").insertMany(
      Object.values(job).map((jobId, i) => ({
        studentId,
        jobId,
        matchScore: matchScores[i],
        createdAt: daysAgo(7 - i),
      })),
    );

    // ── Applications ─────────────────────────────────────────────
    await db.collection("jobApplications").insertMany([
      { studentId, jobId: job[0], role: "Frontend Developer", company: "Stripe", status: "Interview", createdAt: daysAgo(8) },
      { studentId, jobId: job[1], role: "React Engineer", company: "Airbnb", status: "In review", createdAt: daysAgo(10) },
      { studentId, jobId: job[2], role: "UI Engineer", company: "Razorpay", status: "Offer", createdAt: daysAgo(12) },
      { studentId, jobId: job[4], role: "Frontend Engineer", company: "Vercel", status: "Applied", createdAt: daysAgo(15) },
      { studentId, jobId: job[5], role: "Software Engineer I", company: "Swiggy", status: "Rejected", createdAt: daysAgo(20) },
    ]);

    // ── Saved jobs ───────────────────────────────────────────────
    await db.collection("savedJobs").insertMany([
      { studentId, jobId: job[0], createdAt: daysAgo(2) },
      { studentId, jobId: job[4], createdAt: daysAgo(3) },
      { studentId, jobId: job[2], createdAt: daysAgo(5) },
    ]);

    // ── Mock interviews ──────────────────────────────────────────
    await db.collection("mockInterviews").insertMany([
      { studentId, type: "Behavioral", score: 78, streak: 3, createdAt: daysAgo(2) },
      { studentId, type: "Technical Coding", score: 65, createdAt: daysAgo(6) },
      { studentId, type: "System Design", score: 74, createdAt: daysAgo(11) },
      { studentId, type: "Role-specific", score: 81, createdAt: daysAgo(16) },
      { studentId, type: "Behavioral", score: 88, createdAt: daysAgo(22) },
    ]);

    // ── Learning paths ───────────────────────────────────────────
    await db.collection("learningPaths").insertMany([
      { studentId, title: "Frontend Developer", category: "Web Development", level: "Intermediate", lessons: 42, hours: 28, progress: 45, createdAt: daysAgo(30) },
      { studentId, title: "React Mastery", category: "Frameworks", level: "Advanced", lessons: 36, hours: 22, progress: 70, createdAt: daysAgo(28) },
      { studentId, title: "TypeScript Essentials", category: "Languages", level: "Beginner", lessons: 24, hours: 14, progress: 0, createdAt: daysAgo(10) },
      { studentId, title: "System Design Basics", category: "Architecture", level: "Advanced", lessons: 18, hours: 16, progress: 0, createdAt: daysAgo(8) },
      { studentId, title: "Data Structures & Algorithms", category: "Fundamentals", level: "Intermediate", lessons: 48, hours: 40, progress: 100, createdAt: daysAgo(35) },
      { studentId, title: "CSS & Tailwind", category: "Styling", level: "Beginner", lessons: 20, hours: 10, progress: 100, createdAt: daysAgo(34) },
    ]);

    // ── Resume ───────────────────────────────────────────────────
    const resumeData = {
      header: {
        fullName: "Rahul Verma",
        title: "Frontend Developer",
        email: DEMO_EMAIL,
        phone: "+91 98765 43210",
        location: "Bengaluru, India",
        portfolio: "rahulverma.dev",
        linkedin: "linkedin.com/in/rahulverma",
      },
      summary:
        "Frontend developer with a strong foundation in React and TypeScript, focused on building accessible, performant web interfaces. Eager to grow into a product-focused engineering role.",
      experience: [
        { id: "exp-1", company: "BrightApps Studio", jobTitle: "Frontend Developer Intern", start: "2024-01", end: "2024-08", current: false, description: "Built and shipped 12+ reusable React components. Improved Lighthouse performance from 71 to 94 and cut bundle size by 28%." },
        { id: "exp-2", company: "Freelance", jobTitle: "Web Developer", start: "2023-03", end: "", current: true, description: "Deliver responsive marketing sites for small businesses using Next.js and Tailwind CSS." },
      ],
      education: [
        { id: "edu-1", school: "PES University", degree: "B.Tech", field: "Computer Science", gradDate: "2025-05", description: "" },
      ],
      skills: [
        { id: "skill-1", name: "React", level: "Advanced" },
        { id: "skill-2", name: "JavaScript", level: "Advanced" },
        { id: "skill-3", name: "TypeScript", level: "Intermediate" },
        { id: "skill-4", name: "CSS / Tailwind", level: "Advanced" },
        { id: "skill-5", name: "Node.js", level: "Beginner" },
      ],
      certifications: [
        { id: "cert-1", name: "Meta Front-End Developer", org: "Coursera", issueDate: "2024-02", expDate: "" },
      ],
      projects: [
        { id: "proj-1", name: "DevBoard", description: "A kanban board for developers with offline support and keyboard-first navigation.", tech: "React, TypeScript, IndexedDB", link: "github.com/rahulverma/devboard" },
      ],
    };
    await db.collection("resumes").insertOne({
      studentId,
      versions: [{ id: "v1", name: "Resume v1", data: resumeData }],
      atsScore: 82,
      createdAt: daysAgo(25),
      updatedAt: now,
    });

    // ── Analytics (readiness, week chart, achievements, upcoming) ─
    await db.collection("studentAnalytics").insertOne({
      studentId,
      readiness: 68,
      lessonsCompleted: 24,
      mockInterviews: 5,
      streak: 3,
      achievements: ["First Resume", "5 Interviews", "Skill Master", "3-Day Streak", "First Application"],
      week: [
        { day: "M", v: 40 }, { day: "T", v: 70 }, { day: "W", v: 55 },
        { day: "T", v: 90 }, { day: "F", v: 65 }, { day: "S", v: 30 }, { day: "S", v: 50 },
      ],
      upcoming: [
        { title: "Mock Interview: System Design", when: "Tomorrow · 3:00 PM", tag: "Interview" },
        { title: "Resume review with mentor", when: "Fri · 11:00 AM", tag: "Mentor" },
        { title: "Live session: React Patterns", when: "Sat · 6:00 PM", tag: "Learning" },
      ],
      updatedAt: now,
    });

    // ── Activity feed ────────────────────────────────────────────
    await db.collection("activityLogs").insertMany([
      { userId: studentId, text: "Completed “React Hooks” lesson", createdAt: daysAgo(0.1) },
      { userId: studentId, text: "Scored 74% on System Design mock interview", createdAt: daysAgo(1) },
      { userId: studentId, text: "Applied to Frontend Developer at Stripe", createdAt: daysAgo(8) },
      { userId: studentId, text: "Updated resume — Experience section", createdAt: daysAgo(3) },
    ]);

    console.log("\n✓✓✓ Demo account ready ✓✓✓");
    console.log(`    Email:    ${DEMO_EMAIL}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
