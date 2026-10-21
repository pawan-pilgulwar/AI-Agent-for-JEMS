/** Client-safe constants for the industry portal (no DB imports here). */

export const APPLICATION_STATUSES = ["Applied", "In review", "Shortlisted", "Interview", "Offer", "Rejected"] as const;
export type CompanyApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const OPPORTUNITY_TYPES = ["Internship", "Apprenticeship", "Project", "Full-time"] as const;
export const PROGRAM_TYPES = ["Training", "Certification", "Workshop", "Mentorship"] as const;
export const COLLABORATION_TYPES = ["FDP", "Faculty Internship", "Industrial Training", "Guest Lecture", "Research", "Consultancy", "Innovation Challenge", "Live Project"] as const;
