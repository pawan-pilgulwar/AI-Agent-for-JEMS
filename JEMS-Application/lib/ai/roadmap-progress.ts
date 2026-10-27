import type { RoadmapStep } from "@/lib/agent/types";
import { skillKey } from "./util";

/**
 * Progress through an AI roadmap, shared by the roadmap page (client) and
 * Learning Paths (server). Pure — no DB access — so both sides agree.
 *
 * A ticked topic is stored as `topicKey(step, topic)` in `aiRoadmaps.topicsDone`.
 * Keys are built from names, not indexes: regenerating a roadmap rewrites the
 * steps in place, and a tick should only survive if the same topic comes back.
 */

export const topicKey = (step: string, topic: string): string => `${skillKey(step)}::${skillKey(topic)}`;

export interface StepProgress {
  done: number;
  total: number;
  /** The step's skill is verified (skill test / AI test / roadmap quiz): every topic counts as done. */
  verified: boolean;
}

export function stepProgress(step: RoadmapStep, topicsDone: ReadonlySet<string>, verifiedSkills: ReadonlySet<string>): StepProgress {
  const total = step.topics.length;
  const verified = verifiedSkills.has(skillKey(step.skill));
  const done = verified ? total : step.topics.filter((t) => topicsDone.has(topicKey(step.skill, t.name))).length;
  return { done, total, verified };
}

export interface RoadmapProgressSummary {
  /** Topics (lessons) done / in total. */
  done: number;
  total: number;
  /**
   * Overall progress. Every step is its topics plus one module test, so a
   * path only reaches 100% once each step's skill is verified by a test —
   * watching every lesson is not enough on its own.
   */
  percent: number;
  verifiedSteps: number;
}

export function roadmapProgress(steps: RoadmapStep[], topicsDone: ReadonlySet<string>, verifiedSkills: ReadonlySet<string>): RoadmapProgressSummary {
  let done = 0;
  let total = 0;
  let verifiedSteps = 0;
  for (const step of steps) {
    const p = stepProgress(step, topicsDone, verifiedSkills);
    done += p.done;
    total += p.total;
    if (p.verified) verifiedSteps++;
  }
  const units = total + steps.length;
  return { done, total, percent: units ? Math.round(((done + verifiedSteps) / units) * 100) : 0, verifiedSteps };
}
