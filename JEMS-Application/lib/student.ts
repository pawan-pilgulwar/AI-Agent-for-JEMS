import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { getUserById } from "@/lib/db/users";

/**
 * The logged-in student's identity as the dashboard UI needs it — a flat,
 * serializable shape mapped from the `users` + `studentProfiles` documents.
 * This is what replaces the old hard-coded "Alex Kumar" demo object.
 */
export interface StudentView {
  id: string;
  name: string;
  firstName: string;
  email: string;
  image: string | null;
  title: string;
  location: string;
  readiness: number;
  experienceLevel: string | null;
  targetRole: string | null;
  learningStyle: string | null;
  yearsOfExperience: string | null;
}

/** Loads the real, signed-in student for the dashboard. Null if not found. */
export async function getStudentView(
  userId: string,
): Promise<StudentView | null> {
  const user = await getUserById(userId);
  if (!user) return null;

  const db = await getDatabase();
  const _id = new ObjectId(userId);
  const profile = await db
    .collection("studentProfiles")
    .findOne({ userId: _id });
  const analytics = await db
    .collection("studentAnalytics")
    .findOne({ studentId: _id });

  const targetRole = (profile?.targetRole as string | undefined) ?? null;
  const name = user.name?.trim() || user.email.split("@")[0];

  return {
    id: user._id.toString(),
    name,
    firstName: name.split(/\s+/)[0],
    email: user.email,
    // The avatar picked on the Profile screen wins over the OAuth picture.
    image: (profile?.avatar as string | undefined) || user.image || null,
    title: targetRole ? `Aspiring ${targetRole}` : "Student",
    location: (profile?.location as string | undefined) ?? "",
    readiness: Number(analytics?.readiness) || 0,
    experienceLevel: (profile?.experienceLevel as string | undefined) ?? null,
    targetRole,
    learningStyle: (profile?.learningStyle as string | undefined) ?? null,
    yearsOfExperience:
      (profile?.yearsOfExperience as string | undefined) ?? null,
  };
}
