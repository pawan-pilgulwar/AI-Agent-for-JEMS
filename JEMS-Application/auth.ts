import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { verifyPassword } from "@/lib/auth/password";
import {
  getUserByEmail,
  getUserById,
  upsertGithubStudent,
} from "@/lib/db/users";
import { rateLimit } from "@/lib/rate-limit";
import { DEMO_EMAILS } from "@/lib/demo";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET from the environment.
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // String() coercion stops a `{ $ne: null }`-style object from ever
        // reaching the user lookup (NoSQL injection guard).
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Throttle credential-stuffing / brute force: 10 tries per email per
        // 5 minutes. Returns null (generic failure) once exceeded.
        //
        // Demo accounts are exempt: their credentials are public by design, so
        // there is nothing to brute force, and every visitor shares the same
        // address -- a busy demo would otherwise lock the account for everyone.
        if (!DEMO_EMAILS.has(email)) {
          if (!(await rateLimit(`login:${email}`, 10, 5 * 60_000)).ok) return null;
        }

        const user = await getUserByEmail(email);
        if (!user?.passwordHash) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Gate GitHub OAuth: only create an account when the user explicitly came
    // from a "sign up" action. A plain "log in" for an unknown GitHub account
    // is bounced to the signup page instead of silently creating a user.
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        if (!user.email) return false; // need an email to key the account

        const existing = await getUserByEmail(user.email);
        if (existing) {
          user.id = existing._id.toString();
          user.role = existing.role;
          return true;
        }

        const intent = (await cookies()).get("gh_auth_intent")?.value;
        if (intent !== "signup") {
          // Not registered and this was a login attempt — ask them to register.
          return "/signup?error=not_registered";
        }

        const dbUser = await upsertGithubStudent({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        user.id = dbUser._id.toString();
        user.role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      // Fresh sign-in: the account was just authenticated, so trust it.
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        return token;
      }
      // Subsequent requests: re-check the account still exists. If it was
      // deleted, returning null tells Auth.js to clear the session cookie so
      // a stale JWT can no longer keep a removed user logged in.
      if (token.uid) {
        const dbUser = await getUserById(token.uid as string);
        if (!dbUser) return null;
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as "student" | "company" | "institution" | "faculty";
      }
      return session;
    },
  },
});
