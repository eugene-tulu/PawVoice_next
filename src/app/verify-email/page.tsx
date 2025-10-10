// src/app/verify-email/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react"; // ✅ Removed useAction
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function VerifyEmailPage() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  // ❌ REMOVED: const sendVerification = useAction(...)
  const router = useRouter();
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
      const response = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authStatus.email }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      } else {
        const error = await response.text();
        console.error("Resend failed:", error);
        alert("Failed to resend email. Please try again.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  if (authStatus?.status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-6 max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Not Signed In</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to access your dashboard.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all"
          >
            Go to Sign In
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="verify"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-1 bg-gradient-to-r from-amber-400 to-orange-500">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-2xl">✉️</span>
                </motion.div>
                
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Verify Your Email
                </h1>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  We sent a verification link to{" "}
                  <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
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
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-md transition-all ${
                    sending
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  }`}
                >
                  {sending ? (
                    <span className="flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Sending...
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
                  className="mt-4 text-amber-600 dark:text-amber-400 font-medium hover:underline"
                >
                  I verified my email — take me to the app
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}