// src/app/verify-email/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/toast";

export default function VerifyEmailPage() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const router = useRouter();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (authStatus?.status === "authenticated" && authStatus.emailVerified) {
      router.push("/dashboard");
    }
  }, [authStatus, router]);

  const handleResend = async () => {
    if (!authStatus?.email) return;
    setSending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: authStatus.email,
        callbackURL: "/dashboard",
      });

      if (!error) {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      } else {
        toast(
          error.message ?? "Failed to resend email. Please try again.",
          "error"
        );
      }
    } catch {
      toast("Network error. Please check your connection.", "error");
    } finally {
      setSending(false);
    }
  };

  if (authStatus?.status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-6 max-w-md"
        >
          <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔒</span>
          </div>
          <h1 className="font-display text-2xl font-black text-ink mb-2">Not Signed In</h1>
          <p className="text-ink-2 mb-6">
            Please sign in to access your dashboard.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-accent text-paper rounded-full font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            Go to Sign In
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="verify"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-paper-2 border border-rule rounded-xl shadow-md overflow-hidden"
        >
          <div className="p-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-2xl">✉️</span>
              </motion.div>

              <h1 className="font-display text-2xl font-black text-ink mb-2">
                Verify Your Email
              </h1>

              <p className="text-ink-2 mb-6 leading-relaxed">
                We sent a verification link to{" "}
                <span className="font-mono bg-muted/5 px-2 py-1 rounded">
                  {authStatus.email}
                </span>
                <br />
                <span className="text-sm">Check your inbox (and spam folder).</span>
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResend}
                disabled={sending}
                className={`w-full py-3 px-4 rounded-xl font-medium text-paper shadow-md transition-colors ${
                  sending
                    ? "bg-muted"
                    : "bg-accent hover:bg-ink hover:text-paper"
                }`}
              >
                {sending ? (
                  <span className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full mr-2"
                    />
                    Sending…
                  </span>
                ) : sent ? (
                  "✅ Sent! Check your email"
                ) : (
                  "Resend Verification Email"
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/dashboard")}
                className="mt-4 text-accent font-medium hover:text-ink transition-colors"
              >
                I verified my email — take me to the app
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
