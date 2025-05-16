// convex/auth.ts
import Google from "@auth/core/providers/google";
import Twitter from "@auth/core/providers/twitter";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Twitter],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        // Link Twitter to the existing user (e.g., from Google sign-in)
        return args.existingUserId;
      }
      // New user
      const name =
        typeof args.profile.name === "string" ? args.profile.name : undefined;
      const email =
        typeof args.profile.email === "string" ? args.profile.email : undefined;
      return ctx.db.insert("users", {
        name,
        email,
      });
    },
  },
});
