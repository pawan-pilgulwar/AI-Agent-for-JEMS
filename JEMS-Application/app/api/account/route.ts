import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteUserById } from "@/lib/db/users";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Permanently deletes the currently signed-in user's account. */
export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // A destructive action — cap retries hard.
  const limit = await rateLimit(`account-delete:${userId}`, 5, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const deleted = await deleteUserById(userId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Account could not be deleted." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
