const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'jems_production';

async function setupDatabase() {
  if (!MONGODB_URI) {
    console.error('✗ MONGODB_URI not set in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    // Works around Node DNS servers that refuse SRV lookups (see lib/db/dns-fallback.cjs).
    await require("../lib/db/dns-fallback.cjs").ensureSrvDns(process.env.MONGODB_URI);
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Create collections
    const collections = [
      'users',
      'studentProfiles',
      'companyProfiles',
      'resumes',
      'mockInterviews',
      'learningPaths',
      'roadmapProgress',
      'lessonVideos',
      'studentAnalyses',
      'skillTestSessions',
      'skillAssessments',
      'industryPrograms',
      'collaborations',
      'collaborationInterests',
      'institutionProfiles',
      'facultyProfiles',
      'jobPostings',
      'jobApplications',
      'savedJobs',
      'candidateMatches',
      'scheduledInterviews',
      'studentAnalytics',
      'companyAnalytics',
      'activityLogs',
      'notifications',
      'feedback',
      'passwordResets',
      'signupOtps',
      // AI agent layer
      'aiTasks',
      'skillPrereqs',
      'aiRoadmaps',
      'aiProfileAnalyses',
      'aiPapers',
      'matchExplanations',
      'supportTickets',
      'counters',
    ];

    console.log('\n✓ Creating collections...');
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`  ✓ ${collectionName}`);
      } catch (err) {
        if (err.codeName === 'NamespaceExists') {
          console.log(`  • ${collectionName} (already exists)`);
        }
      }
    }

    // Create indexes
    console.log('\n✓ Creating indexes...');

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    console.log('  ✓ users');

    await db.collection('studentProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('studentProfiles').createIndex({ targetRole: 1 });
    console.log('  ✓ studentProfiles');

    await db.collection('companyProfiles').createIndex({ userId: 1 }, { unique: true });
    console.log('  ✓ companyProfiles');

    await db.collection('resumes').createIndex({ studentId: 1 });
    await db.collection('resumes').createIndex({ atsScore: 1 });
    console.log('  ✓ resumes');

    await db.collection('jobPostings').createIndex({ companyId: 1 });
    await db.collection('jobPostings').createIndex({ status: 1 });
    console.log('  ✓ jobPostings');

    await db.collection('jobApplications').createIndex({ studentId: 1 });
    await db.collection('jobApplications').createIndex({ jobId: 1 });
    await db.collection('jobApplications').createIndex({ studentId: 1, jobId: 1 }, { unique: true });
    console.log('  ✓ jobApplications');

    await db.collection('savedJobs').createIndex({ studentId: 1 });
    await db.collection('savedJobs').createIndex({ jobId: 1 });
    console.log('  ✓ savedJobs');

    await db.collection('candidateMatches').createIndex({ jobId: 1 });
    await db.collection('candidateMatches').createIndex({ studentId: 1 });
    await db.collection('candidateMatches').createIndex({ matchScore: -1 });
    console.log('  ✓ candidateMatches');

    await db.collection('mockInterviews').createIndex({ studentId: 1 });
    console.log('  ✓ mockInterviews');

    await db.collection('learningPaths').createIndex({ studentId: 1 });
    // One learning path per AI roadmap (created by the roadmap task).
    await db.collection('learningPaths').createIndex({ studentId: 1, roadmapId: 1 }, { unique: true, partialFilterExpression: { roadmapId: { $exists: true } }, name: 'roadmap_path' });
    console.log('  ✓ learningPaths');

    // Roadmap: one progress doc per student per career path; lesson cache keyed by lesson.
    await db.collection('roadmapProgress').createIndex({ studentId: 1, careerPath: 1 }, { unique: true });
    console.log('  ✓ roadmapProgress');

    await db.collection('lessonVideos').createIndex({ cacheKey: 1 }, { unique: true });
    console.log('  ✓ lessonVideos');

    // Multi-role prototype: AI analyses, industry programs, academia collaborations.
    await db.collection('studentAnalyses').createIndex({ studentId: 1 }, { unique: true });
    console.log('  ✓ studentAnalyses');
    // Skill tests: sessions expire on their own; one result per (student, skill).
    await db.collection('skillTestSessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
    await db.collection('skillAssessments').createIndex({ studentId: 1, skill: 1 }, { unique: true });
    console.log('  ✓ skill assessments');
    await db.collection('industryPrograms').createIndex({ companyId: 1 });
    await db.collection('collaborations').createIndex({ type: 1 });
    await db.collection('collaborationInterests').createIndex({ userId: 1, collaborationId: 1 }, { unique: true });
    await db.collection('institutionProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('facultyProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('jobPostings').createIndex({ requiredSkills: 1 });
    console.log('  ✓ platform collections');

    await db.collection('scheduledInterviews').createIndex({ studentId: 1 });
    console.log('  ✓ scheduledInterviews');

    await db.collection('activityLogs').createIndex({ userId: 1 });
    console.log('  ✓ activityLogs');

    await db.collection('notifications').createIndex({ userId: 1 });
    console.log('  ✓ notifications');

    await db.collection('passwordResets').createIndex({ email: 1 }, { unique: true });
    // TTL cleanup: Mongo drops the doc once expiresAt (OTP or, once verified, reset-token expiry) is in the past.
    await db.collection('passwordResets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✓ passwordResets');

    await db.collection('signupOtps').createIndex({ email: 1 }, { unique: true });
    // TTL cleanup: Mongo drops the doc once expiresAt (OTP expiry) is in the past.
    await db.collection('signupOtps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✓ signupOtps');

    // ── AI agent layer (background tasks + stored results) ──────────
    // One active task per dedupe key; `active` is unset when a task finishes.
    await db.collection('aiTasks').createIndex({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { active: true }, name: 'active_dedupe' });
    await db.collection('aiTasks').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('aiTasks').createIndex({ status: 1, runAfter: 1 });
    await db.collection('aiTasks').createIndex({ status: 1, leaseUntil: 1 });
    // Finished tasks are kept 30 days for the activity history, then dropped.
    await db.collection('aiTasks').createIndex({ finishedAt: 1 }, { expireAfterSeconds: 30 * 86400 });
    console.log('  ✓ aiTasks');

    // Upsert keys: re-running an AI task updates the stored result in place.
    await db.collection('skillPrereqs').createIndex({ skillKey: 1 }, { unique: true });
    await db.collection('aiRoadmaps').createIndex({ studentId: 1, skillKey: 1 }, { unique: true });
    await db.collection('aiProfileAnalyses').createIndex({ studentId: 1 }, { unique: true });
    await db.collection('aiPapers').createIndex({ studentId: 1, purpose: 1, subjectKey: 1 }, { unique: true });
    await db.collection('matchExplanations').createIndex({ jobId: 1, studentId: 1 }, { unique: true });
    await db.collection('mockInterviews').createIndex({ paperId: 1 }, { unique: true, partialFilterExpression: { paperId: { $exists: true } } });
    await db.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 });
    console.log('  ✓ AI results (skillPrereqs, aiRoadmaps, aiProfileAnalyses, aiPapers, matchExplanations)');

    await db.collection('supportTickets').createIndex({ userId: 1, createdAt: -1 });
    console.log('  ✓ supportTickets');

    console.log('\n✓✓✓ Database setup complete! ✓✓✓');

  } catch (error) {
    console.error('✗ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();