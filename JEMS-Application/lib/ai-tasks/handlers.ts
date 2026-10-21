import { matchHandler } from "@/lib/ai/match";
import { generateHandler, gradeHandler } from "@/lib/ai/papers";
import { prereqsHandler } from "@/lib/ai/prereqs";
import { profileHandler } from "@/lib/ai/profile";
import { roadmapHandler } from "@/lib/ai/roadmap";
import type { TaskHandler } from "./context";
import type { AiTaskType } from "./types";

/** Which code runs each background task type. */
export const HANDLERS: Record<AiTaskType, TaskHandler> = {
  "skill.prereqs": prereqsHandler,
  "student.roadmap": roadmapHandler,
  "student.profile": profileHandler,
  "assessment.generate": generateHandler,
  "assessment.grade": gradeHandler,
  "match.explain": matchHandler,
};
