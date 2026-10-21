/**
 * Seeds the multi-role prototype data on top of `seedDemo.js`:
 *
 *  - required skills / type / experience on every demo job posting (the
 *    Matching Agent scores compatibility from these)
 *  - demo logins for the other roles: company, institution, faculty
 *  - a cohort of demo students so the institution dashboard has real aggregates
 *  - industry learning programs (training, certifications, workshops, mentorship)
 *  - industry ↔ academia collaborations (FDPs, guest lectures, research, …)
 *
 * Idempotent: everything it creates is tagged `demo: true` and is wiped first.
 *
 *   node --env-file=.env.local scripts/seedPlatform.js
 */

const { MongoClient } = require("mongodb");
const { randomBytes, scryptSync } = require("crypto");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✗ MONGODB_URI is not set");
  process.exit(1);
}

const PASSWORD = "Demo@1234";
const STUDENT_EMAIL = "demo@jems.dev";
const COMPANY_EMAIL = "company@jems.dev";
const INSTITUTION_EMAIL = "institution@jems.dev";
const FACULTY_EMAIL = "faculty@jems.dev";

/** Mirror of lib/auth/password.ts: `scrypt:<saltHex>:<hashHex>`. */
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ── Required skills per existing demo posting (keyed by company) ──────
const JOB_SKILLS = {
  Stripe: { requiredSkills: ["React", "TypeScript", "JavaScript", "Testing", "Accessibility"], niceToHave: ["Next.js", "GraphQL"], experience: "1–3 years", type: "Full-time" },
  Airbnb: { requiredSkills: ["React", "JavaScript", "CSS3", "Web Performance"], niceToHave: ["TypeScript", "Design Systems"], experience: "1–3 years", type: "Full-time" },
  Razorpay: { requiredSkills: ["React", "CSS3", "Design Systems", "Accessibility"], niceToHave: ["Tailwind CSS"], experience: "0–2 years", type: "Full-time" },
  Zoho: { requiredSkills: ["HTML5", "CSS3", "JavaScript"], niceToHave: ["React"], experience: "0–1 years", type: "Full-time" },
  Vercel: { requiredSkills: ["Next.js", "React", "TypeScript", "SSR"], niceToHave: ["Web Performance", "SEO"], experience: "2+ years", type: "Full-time" },
  Swiggy: { requiredSkills: ["JavaScript", "Node.js", "REST APIs", "SQL"], niceToHave: ["Docker", "Redis"], experience: "0–1 years", type: "Full-time" },
};

async function seed() {
  const client = new MongoClient(uri);
  try {
    // Works around Node DNS servers that refuse SRV lookups (see lib/db/dns-fallback.cjs).
    await require("../lib/db/dns-fallback.cjs").ensureSrvDns(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("jems_production");
    const now = new Date();

    // ── Wipe previous platform seed ──────────────────────────────
    const demoUsers = await db
      .collection("users")
      .find({ $or: [{ demo: true }, { email: { $in: [COMPANY_EMAIL, INSTITUTION_EMAIL, FACULTY_EMAIL] } }] })
      .project({ _id: 1 })
      .toArray();
    const demoIds = demoUsers.map((u) => u._id);
    if (demoIds.length) {
      await Promise.all([
        db.collection("studentProfiles").deleteMany({ userId: { $in: demoIds } }),
        db.collection("companyProfiles").deleteMany({ userId: { $in: demoIds } }),
        db.collection("institutionProfiles").deleteMany({ userId: { $in: demoIds } }),
        db.collection("facultyProfiles").deleteMany({ userId: { $in: demoIds } }),
        db.collection("roadmapProgress").deleteMany({ studentId: { $in: demoIds } }),
        db.collection("studentAnalytics").deleteMany({ studentId: { $in: demoIds } }),
        db.collection("jobApplications").deleteMany({ studentId: { $in: demoIds } }),
        db.collection("studentAnalyses").deleteMany({ studentId: { $in: demoIds } }),
        db.collection("collaborationInterests").deleteMany({ userId: { $in: demoIds } }),
        db.collection("users").deleteMany({ _id: { $in: demoIds } }),
      ]);
    }
    await db.collection("jobPostings").deleteMany({ demo: true, platform: true });
    await db.collection("industryPrograms").deleteMany({ demo: true });
    await db.collection("collaborations").deleteMany({ demo: true });
    console.log("✓ Cleared previous platform seed");

    // ── Enrich the seedDemo job postings with requirements ───────
    for (const [company, fields] of Object.entries(JOB_SKILLS)) {
      await db.collection("jobPostings").updateMany({ company, demo: true }, { $set: fields });
    }
    console.log("✓ Added required skills to demo job postings");

    // ── Company (industry) login: Capgemini ──────────────────────
    const companyRes = await db.collection("users").insertOne({
      name: "Capgemini",
      email: COMPANY_EMAIL,
      role: "company",
      authProvider: "credentials",
      passwordHash: hashPassword(PASSWORD),
      emailVerified: now,
      demo: true,
      createdAt: daysAgo(60),
      updatedAt: now,
    });
    const companyId = companyRes.insertedId;
    await db.collection("companyProfiles").insertOne({
      userId: companyId,
      companyName: "Capgemini",
      industry: "Technology",
      size: "1000+",
      website: "capgemini.com",
      location: "Bengaluru, India",
      about: "Global leader in consulting, technology services and digital transformation.",
      createdAt: daysAgo(60),
      updatedAt: now,
    });

    // Capgemini's own openings — internships, apprenticeships and jobs
    const capJobs = await db.collection("jobPostings").insertMany(
      [
        { role: "Software Developer (Java)", company: "Capgemini", companyId, location: "Bengaluru", type: "Full-time", salary: "₹6–9 LPA", remote: false, experience: "0–2 years", requiredSkills: ["Java", "Spring Boot", "SQL", "REST APIs", "Git"], niceToHave: ["Docker", "Microservices"], description: "Build and maintain enterprise Java services for banking clients.", postedAt: daysAgo(1) },
        { role: "Frontend Developer Intern", company: "Capgemini", companyId, location: "Remote", type: "Internship", salary: "₹25k/month", remote: true, experience: "Students / fresh graduates", requiredSkills: ["HTML5", "CSS3", "JavaScript", "React"], niceToHave: ["TypeScript", "Testing"], description: "6-month internship on a client design-system team. Pre-placement offer for top performers.", postedAt: daysAgo(2) },
        { role: "Full Stack Apprentice", company: "Capgemini", companyId, location: "Pune", type: "Apprenticeship", salary: "₹30k/month", remote: false, experience: "0–1 years", requiredSkills: ["JavaScript", "Node.js", "React", "SQL"], niceToHave: ["Express.js", "MongoDB"], description: "12-month earn-and-learn apprenticeship with a guaranteed conversion interview.", postedAt: daysAgo(3) },
        { role: "Cloud Engineer", company: "Capgemini", companyId, location: "Hyderabad", type: "Full-time", salary: "₹8–12 LPA", remote: false, experience: "1–3 years", requiredSkills: ["AWS", "Linux", "Docker", "CI/CD", "Terraform"], niceToHave: ["Kubernetes"], description: "Own cloud infrastructure for enterprise migrations.", postedAt: daysAgo(4) },
        { role: "Data Engineering Intern", company: "Capgemini", companyId, location: "Remote", type: "Internship", salary: "₹25k/month", remote: true, experience: "Students / fresh graduates", requiredSkills: ["SQL", "Python", "ETL"], niceToHave: ["Apache Airflow", "Pandas"], description: "Build data pipelines for a retail analytics client.", postedAt: daysAgo(5) },
      ].map((j) => ({ ...j, status: "open", demo: true, platform: true, createdAt: j.postedAt })),
    );
    console.log("✓ Company login + 5 Capgemini openings");

    // ── Institution login: PES University ────────────────────────
    const instRes = await db.collection("users").insertOne({
      name: "PES University",
      email: INSTITUTION_EMAIL,
      role: "institution",
      authProvider: "credentials",
      passwordHash: hashPassword(PASSWORD),
      emailVerified: now,
      demo: true,
      createdAt: daysAgo(90),
      updatedAt: now,
    });
    await db.collection("institutionProfiles").insertOne({
      userId: instRes.insertedId,
      institutionName: "PES University",
      type: "University",
      location: "Bengaluru, India",
      departments: ["Computer Science", "Information Science", "Electronics"],
      createdAt: daysAgo(90),
      updatedAt: now,
    });

    // ── Faculty login ────────────────────────────────────────────
    const facRes = await db.collection("users").insertOne({
      name: "Dr. Priya Nair",
      email: FACULTY_EMAIL,
      role: "faculty",
      authProvider: "credentials",
      passwordHash: hashPassword(PASSWORD),
      emailVerified: now,
      demo: true,
      createdAt: daysAgo(80),
      updatedAt: now,
    });
    await db.collection("facultyProfiles").insertOne({
      userId: facRes.insertedId,
      institution: "PES University",
      department: "Computer Science",
      designation: "Associate Professor",
      interests: ["Cloud Computing", "Distributed Systems", "Software Engineering"],
      createdAt: daysAgo(80),
      updatedAt: now,
    });
    console.log("✓ Institution + faculty logins");

    // ── Student cohort (for institution analytics) ───────────────
    const cohort = [
      ["Riya Sharma", "Frontend Developer", "frontend", ["HTML5", "CSS3", "JavaScript", "React"], [1, 2, 3], 72, "Interview"],
      ["Aarav Patel", "Backend Developer", "backend", ["JavaScript", "Node.js", "Git", "SQL"], [1, 2], 58, "Applied"],
      ["Sneha Reddy", "Data Engineer", "data-engineer", ["SQL", "Python", "Pandas"], [1], 49, null],
      ["Karan Mehta", "Full Stack Developer", "fullstack", ["HTML5", "CSS3", "JavaScript", "React", "Node.js", "Express.js"], [1, 2, 3, 4], 81, "Offer"],
      ["Ananya Iyer", "DevOps Engineer", "devops", ["Linux", "Bash", "Git", "Docker"], [1, 2, 3], 66, "Shortlisted"],
      ["Rohan Das", "Frontend Developer", "frontend", ["HTML5", "CSS3"], [1], 34, null],
      ["Meera Krishnan", "QA Engineer", "qa", ["Manual Testing", "JavaScript", "Playwright"], [1, 2, 3], 63, "Applied"],
      ["Vikram Singh", "Backend Developer", "backend", ["Java", "SQL", "Git"], [], 41, null],
      ["Ishita Bose", "AI/ML Engineer", "ai-ml", ["Python", "Statistics", "Pandas", "NumPy"], [1, 2], 57, "Applied"],
      ["Dev Kapoor", "Full Stack Developer", "fullstack", ["JavaScript", "React", "TypeScript", "Node.js", "MongoDB", "REST APIs"], [1, 2, 3, 4, 5], 88, "Offer"],
      ["Nikita Rao", "UI/UX Designer", "ui-ux", ["Figma", "Wireframing"], [1], 45, null],
      ["Arjun Nambiar", "Cloud Architect", "cloud-architect", ["AWS", "Linux", "Networking"], [1, 2], 60, "Rejected"],
    ];
    const capJobIds = Object.values(capJobs.insertedIds);
    let i = 0;
    for (const [name, targetRole, careerPath, skills, passed, readiness, appStatus] of cohort) {
      i++;
      const email = `student${i}@demo.jems`;
      const u = await db.collection("users").insertOne({
        name, email, role: "student", authProvider: "credentials",
        passwordHash: hashPassword(PASSWORD), emailVerified: now, demo: true,
        createdAt: daysAgo(50 - i), updatedAt: now,
      });
      const sid = u.insertedId;
      await db.collection("studentProfiles").insertOne({
        userId: sid, displayName: name, displayRole: "Student", location: "Bengaluru, India",
        experienceLevel: "Entry level", targetRole, institution: "PES University",
        skills: skills.map((s, k) => ({ name: s, level: 55 + ((k * 13) % 35), verified: k < passed.length })),
        goals: { careerPath, careerTitle: targetRole, targetPackage: String(6 + (i % 6)), targetCompany: i % 3 === 0 ? "Capgemini" : "", setAt: daysAgo(30) },
        createdAt: daysAgo(50 - i), updatedAt: now,
      });
      await db.collection("roadmapProgress").insertOne({
        studentId: sid, careerPath, passedModules: passed, lessonsWatched: {}, createdAt: daysAgo(30), updatedAt: now,
      });
      await db.collection("studentAnalytics").insertOne({
        studentId: sid, readiness, lessonsCompleted: passed.length * 4, mockInterviews: i % 4, streak: i % 5,
        achievements: passed.length > 2 ? ["Skill Master", "First Application"] : [], week: [], upcoming: [], updatedAt: now,
      });
      if (appStatus) {
        await db.collection("jobApplications").insertOne({
          studentId: sid, jobId: capJobIds[i % capJobIds.length], role: "Capgemini opening", company: "Capgemini",
          status: appStatus, createdAt: daysAgo(10 + i),
        });
      }
    }
    console.log(`✓ ${cohort.length} cohort students`);

    // ── Industry learning programs ───────────────────────────────
    await db.collection("industryPrograms").insertMany(
      [
        { company: "Capgemini", companyId, title: "Java & Spring Boot Bootcamp", type: "Training", skills: ["Java", "Spring Boot", "REST APIs"], duration: "6 weeks", mode: "Online · live", seats: 60, startsAt: daysAhead(12) },
        { company: "Capgemini", companyId, title: "Cloud Foundations (AWS)", type: "Certification", skills: ["AWS", "Linux", "Networking"], duration: "4 weeks", mode: "Self-paced + exam", seats: 100, startsAt: daysAhead(5) },
        { company: "Capgemini", companyId, title: "Frontend Design Systems Workshop", type: "Workshop", skills: ["React", "Design Systems", "Accessibility"], duration: "2 days", mode: "On campus", seats: 40, startsAt: daysAhead(20) },
        { company: "Capgemini", companyId, title: "Engineer Mentorship Circle", type: "Mentorship", skills: ["System Design", "Technical Interviews"], duration: "8 weeks", mode: "1:1 online", seats: 20, startsAt: daysAhead(9) },
        { company: "Infosys", title: "Infosys Springboard: Python for Data", type: "Certification", skills: ["Python", "Pandas", "SQL"], duration: "5 weeks", mode: "Self-paced", seats: 500, startsAt: daysAhead(3) },
        { company: "TCS", title: "TCS iON Testing Foundations", type: "Training", skills: ["Manual Testing", "Selenium", "API Testing"], duration: "3 weeks", mode: "Online", seats: 200, startsAt: daysAhead(7) },
        { company: "Microsoft", title: "TypeScript for React Developers", type: "Workshop", skills: ["TypeScript", "React", "Testing"], duration: "1 day", mode: "Online · live", seats: 300, startsAt: daysAhead(14) },
        { company: "Razorpay", title: "Node.js & Payments APIs Deep-dive", type: "Training", skills: ["Node.js", "Express.js", "REST APIs", "Security"], duration: "3 weeks", mode: "Online", seats: 80, startsAt: daysAhead(16) },
        { company: "Google", title: "Docker & Kubernetes Essentials", type: "Certification", skills: ["Docker", "Kubernetes", "CI/CD"], duration: "4 weeks", mode: "Self-paced", seats: 1000, startsAt: daysAhead(2) },
      ].map((p) => ({ ...p, demo: true, createdAt: now })),
    );

    // ── Industry ↔ academia collaborations ───────────────────────
    await db.collection("collaborations").insertMany(
      [
        { company: "Capgemini", companyId, title: "FDP: Cloud-Native Architecture for Educators", type: "FDP", domain: ["Cloud Computing", "Microservices"], duration: "5 days", startsAt: daysAhead(18), location: "Bengaluru campus", seats: 30, description: "Hands-on faculty development program covering AWS, containers and CI/CD, with course material faculty can reuse." },
        { company: "Capgemini", companyId, title: "Faculty Industrial Immersion (Summer)", type: "Faculty Internship", domain: ["Software Engineering", "Agile Delivery"], duration: "4 weeks", startsAt: daysAhead(45), location: "Pune delivery centre", seats: 10, description: "Faculty embed with a live delivery team to align teaching with current engineering practice." },
        { company: "Capgemini", companyId, title: "Guest Lecture: How Enterprises Ship Software", type: "Guest Lecture", domain: ["Software Engineering"], duration: "2 hours", startsAt: daysAhead(8), location: "On campus / hybrid", seats: 200, description: "Senior engineers on release management, code review culture and observability." },
        { company: "Infosys", title: "Joint Research: LLMs for Code Review", type: "Research", domain: ["AI/ML", "Software Engineering"], duration: "12 months", startsAt: daysAhead(30), location: "Remote", seats: 4, description: "Co-authored research with a funded PhD-scholar stipend." },
        { company: "TCS", title: "Curriculum Consultancy: Testing & QA Track", type: "Consultancy", domain: ["Quality Engineering"], duration: "3 months", startsAt: daysAhead(25), location: "Remote", seats: 6, description: "Faculty consult on an industry-aligned QA elective; honorarium provided." },
        { company: "Razorpay", title: "Industrial Training: Payments Systems", type: "Industrial Training", domain: ["Fintech", "Backend"], duration: "2 weeks", startsAt: daysAhead(40), location: "Bengaluru", seats: 15, description: "Training for faculty and final-year students on real payment infrastructure." },
        { company: "Microsoft", title: "Innovation Challenge: Campus AI Hackathon", type: "Innovation Challenge", domain: ["AI/ML", "Cloud"], duration: "48 hours", startsAt: daysAhead(35), location: "Hybrid", seats: 500, description: "Faculty-mentored student teams build on Azure credits; winners get internships." },
        { company: "Google", title: "Live Industry Project: Accessibility Audit", type: "Live Project", domain: ["Frontend", "Accessibility"], duration: "6 weeks", startsAt: daysAhead(10), location: "Remote", seats: 25, description: "Student teams audit real products under faculty + engineer mentorship." },
      ].map((c) => ({ ...c, demo: true, createdAt: now })),
    );
    console.log("✓ Industry programs + collaborations");

    // ── Make the main demo student part of the cohort ────────────
    const demoStudent = await db.collection("users").findOne({ email: STUDENT_EMAIL });
    if (demoStudent) {
      await db.collection("studentProfiles").updateOne(
        { userId: demoStudent._id },
        { $set: { institution: "PES University" } },
      );
    }

    console.log("\n✓✓✓ Platform demo ready ✓✓✓");
    console.log(`    Student:      ${STUDENT_EMAIL}`);
    console.log(`    Company:      ${COMPANY_EMAIL}`);
    console.log(`    Institution:  ${INSTITUTION_EMAIL}`);
    console.log(`    Faculty:      ${FACULTY_EMAIL}`);
    console.log(`    Password:     ${PASSWORD} (all accounts)`);
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
