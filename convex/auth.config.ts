// convex/auth.config.ts
const config = {
  providers: [
    {
      domain: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: true,
    redirectToEmailVerification: "/verify-email",
  },
};

export default config;