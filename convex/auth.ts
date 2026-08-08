// convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { sendEmail, verifyEmailHtml, resetPasswordHtml } from "./lib/email";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    logger: { level: "debug" },
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "Reset your password",
          html: resetPasswordHtml(url),
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "Verify your email",
          html: verifyEmailHtml(url, user.email),
        });
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    plugins: [convex()],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => authComponent.getAuthUser(ctx),
});

export const getAuthStatus = query({
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return { status: "unauthenticated" as const };
    return {
      status: "authenticated" as const,
      emailVerified: user.emailVerified,
      email: user.email,
    };
  },
});
