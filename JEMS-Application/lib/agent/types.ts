/**
 * Request / response shapes of the Agent service (`Agent/analyzer`, FastAPI).
 * Mirrors `Agent/API_GUIDE.md` and the Postman collection in `Agent/postman/`.
 * Plain JSON only — these are stored in MongoDB as-is.
 */

// ── /agents/prereqs ─────────────────────────────────────────────

export interface PrereqItem {
  name: string;
  level: "basic" | "intermediate" | "advanced" | string;
  depends_on: string[];
  topics: string[];
}

export interface PrereqTree {
  skill: string;
  prerequisites: PrereqItem[];
  /** Only present when the tree is still broken after the Agent's retries. */
  warnings?: string[];
}

export interface PrereqsRequest {
  skills: string[];
}

export interface PrereqsResponse {
  skills: PrereqTree[];
}

// ── /agents/profile ─────────────────────────────────────────────

export interface GithubRepoEvidence {
  name: string;
  languages: Record<string, number>;
  contributors?: number;
  my_commit_share?: number;
  dependencies?: string[];
  description?: string;
  stars?: number;
}

export interface ProfileRequest {
  github?: { repos: GithubRepoEvidence[] };
  leetcode?: { solved: { easy: number; medium: number; hard: number }; topics: Record<string, number> };
  hackerrank?: { badges: Record<string, number> };
}

export interface ProfileSkillEvidence {
  name: string;
  level: string;
  confidence: number;
  evidence: string;
}

export interface ProfileResponse {
  skills: ProfileSkillEvidence[];
  summary: string;
}

// ── /agents/roadmap ─────────────────────────────────────────────

export interface RoadmapRequest {
  missing_skills?: string[];
  target_skill?: string;
}

export interface RoadmapTopic {
  name: string;
  why?: string;
  subtopics: string[];
  practice?: string[];
}

export interface RoadmapStep {
  skill: string;
  role: "prerequisite" | "target" | string;
  weeks: number;
  summary: string;
  why_learn?: string;
  used_in?: string[];
  topics: RoadmapTopic[];
  project?: string;
  resources?: string[];
  warnings?: string[];
}

export interface RoadmapResponse {
  target_skill: string | null;
  total_weeks: number;
  steps: RoadmapStep[];
}

// ── /agents/assessment (legacy, MCQ only) ───────────────────────

export interface SimpleAssessmentRequest {
  skill: string;
  topics?: string[];
  count?: number;
}

export interface SimpleMcq {
  question: string;
  options: string[];
  answer_index: number;
  topic?: string;
  difficulty?: string;
}

export interface SimpleAssessmentResponse {
  questions: SimpleMcq[];
}

// ── /agents/match ───────────────────────────────────────────────

export interface MatchRequest {
  student: { name: string; verified_skills: string[] };
  company: { name: string; required_skills: string[] };
  match_score?: number;
}

export interface MatchResponse {
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

// ── /assessment/* ───────────────────────────────────────────────

export const QUESTION_TYPES = ["mcq", "multi_select", "short_answer", "coding"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CODING_LANGUAGES = ["python", "java", "cpp", "c", "javascript"] as const;
export type CodingLanguage = (typeof CODING_LANGUAGES)[number];

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export interface GenerateRequest {
  skill: string;
  topics?: string[];
  difficulty?: Difficulty;
  counts?: Partial<Record<QuestionType, number>>;
}

export interface CodeTest {
  input: string;
  expected: string;
}

/** One question of the *full* paper (answer keys + hidden tests). Server-side only. */
export interface PaperQuestion {
  id: string;
  type: QuestionType;
  marks: number;
  text: string;
  title?: string;
  options?: string[];
  topic?: string;
  difficulty?: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  samples?: CodeTest[];
  hidden?: CodeTest[];
  key?: {
    answer_index?: number;
    answer_indexes?: number[];
    explanation?: string;
    key_points?: { point: string; weight: number }[];
    model_answer?: string;
  };
}

/** The student-safe version of a question: no key, no hidden tests. */
export interface StudentQuestion {
  id: string;
  type: QuestionType;
  marks: number;
  text: string;
  title?: string;
  options?: string[];
  topic?: string;
  difficulty?: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  samples?: CodeTest[];
  languages?: string[];
  notes?: string;
}

export interface GenerateResponse {
  paper_id: string;
  skill: string;
  total_marks: number;
  questions: PaperQuestion[];
  student_paper: StudentQuestion[];
  warnings: string[];
}

export interface RunCodeRequest {
  language: CodingLanguage;
  source_code: string;
  stdin?: string;
}

export interface RunCodeResponse {
  status_id: number;
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  time: string | null;
  memory: number | null;
}

/** mcq → option index; multi_select → indexes; short_answer → text; coding → code. */
export type PaperAnswer =
  | number
  | number[]
  | string
  | { language: CodingLanguage; source_code: string };

export interface GradeRequest {
  paper: PaperQuestion[];
  answers: Record<string, PaperAnswer>;
  pass_percent?: number;
}

export interface CodeTestResult {
  test: string;
  passed: boolean;
  status: string;
  time: string | null;
  your_output?: string;
  expected?: string;
  error?: string;
}

export interface QuestionResult {
  id: string;
  type: QuestionType;
  max: number;
  score: number;
  correct?: boolean;
  explanation?: string;
  detail?: string;
  tests?: CodeTestResult[];
  feedback?: string;
  covered?: string[];
  missing?: string[];
  wrong_statements?: string[];
  needs_review?: boolean;
}

export interface GradeResponse {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  needs_review: string[];
  results: QuestionResult[];
}

export interface GradeTextRequest {
  question: string;
  key_points: { point: string; weight: number }[];
  answer: string;
  max_marks?: number;
}

export interface GradeTextResponse {
  score: number;
  max: number;
  feedback: string;
  covered: string[];
  missing: string[];
  wrong_statements?: string[];
  needs_review: boolean;
}

// ── /learning/* (learning path agent, served by vLLM) ───────────

export const LEARNER_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type LearnerLevel = (typeof LEARNER_LEVELS)[number];

export const LEARNING_STYLES = ["visual", "example", "handson", "theory", "mix"] as const;
export type LearningStyle = (typeof LEARNING_STYLES)[number];

/** Who the content is written for. Built server-side from stored data only — never free text. */
export interface Learner {
  level: LearnerLevel;
  style: LearningStyle;
  target_role?: string;
  /** Subtopics the student already knows (recapped in one line). */
  known?: string[];
  /** Subtopics the student got wrong in a quick check or module test (re-explained). */
  weak?: string[];
}

export interface LearningPathRequest {
  target_skill?: string | null;
  steps: (RoadmapStep & { level?: LearnerLevel })[];
  learner: Learner;
}

export interface PlanLesson {
  topic: string;
  objective: string;
  focus: string[];
  skip: string[];
  approach: string;
  minutes: number;
  video_query: string;
}

export interface PlanModule {
  skill: string;
  role: "prerequisite" | "target" | string;
  level: LearnerLevel;
  intro: string;
  lessons: PlanLesson[];
  test: { topics: string[]; difficulty: Difficulty };
  planned: boolean;
  warnings: string[];
}

export interface LearningPathResponse {
  target_skill: string | null;
  model: string;
  total_minutes: number;
  modules: PlanModule[];
}

export interface LearningLessonRequest {
  skill: string;
  topic: RoadmapTopic;
  learner: Learner;
  objective?: string;
  focus?: string[];
  videos?: boolean;
}

export interface LessonSlide {
  title: string;
  bullets: string[];
  narration: string;
  example?: string;
}

export interface QuickCheckQuestion {
  question: string;
  options: string[];
  answer_index: number;
  subtopic: string;
  explanation: string;
}

export interface LessonVideo {
  video_id: string;
  title: string;
  channel: string;
  url: string;
}

export interface LessonVideos {
  query: string;
  search_url: string;
  videos: LessonVideo[];
}

export interface LearningLessonResponse {
  topic: string;
  level: LearnerLevel;
  style: LearningStyle;
  remedial: string[];
  slides: LessonSlide[];
  quick_check: QuickCheckQuestion[];
  videos: LessonVideos | null;
  warnings: string[];
}

export interface LearningNotesRequest {
  skill: string;
  topic: RoadmapTopic;
  learner: Learner;
  focus?: string[];
}

export interface NotesSection {
  heading: string;
  points: string[];
  example: string;
}

export interface LearningNotesResponse {
  topic: string;
  level: LearnerLevel;
  style: LearningStyle;
  remedial: string[];
  overview: string;
  sections: NotesSection[];
  key_terms: { term: string; meaning: string }[];
  common_mistakes: string[];
  summary: string[];
  self_check: string[];
  practice: string[];
  warnings: string[];
}
