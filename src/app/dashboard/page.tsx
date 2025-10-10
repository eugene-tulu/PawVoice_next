// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CreatePet from "@/components/create-pet";
import VoiceCoach from "@/components/voice-coach";
import BuyMinutes from "@/components/buy-minutes";

export default function Dashboard() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const pets = useQuery(api.pets.list);
  const router = useRouter();
  const pathname = usePathname();

  // 🔐 Auth guard
  useEffect(() => {
    if (authStatus?.status === "unauthenticated") {
      router.push("/");
    } else if (authStatus?.status === "authenticated" && !authStatus.emailVerified) {
      router.push("/verify-email");
    }
  }, [authStatus, router, pathname]);

  // 🌀 Loading auth state
  if (authStatus === undefined || pets === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // 🐾 Render dashboard
  const renderContent = () => {
    if (pets.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <CreatePet onSuccess={(id) => router.push(`/dashboard?pet=${id}`)} />
          <BuyMinutes />
        </motion.div>
      );
    }

    const pet = pets[0];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <motion.div
          whileHover={{ y: -4 }}
          className="border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg"
        >
          <p className="font-bold text-xl text-gray-800 dark:text-white mb-2">{pet.name}</p>
          <p className="text-gray-600 dark:text-gray-300">
            {pet.breed} · {pet.age} y · {pet.energy} energy
          </p>
        </motion.div>
        <VoiceCoach petId={pet._id} />
        <BuyMinutes />
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6"
      >
        <div className="max-w-2xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center"
          >
            <span className="mr-2">🐾</span> Dashboard
          </motion.h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Train your dog with Buddy, your AI voice coach.
          </p>
          
          {renderContent()}
        </div>
      </motion.main>
    </AnimatePresence>
  );
}