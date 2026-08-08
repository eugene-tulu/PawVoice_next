"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { GenericId } from "convex/values";
import Navigation from "@/components/navigation";
import MedicalDisclaimer from "@/components/medical-disclaimer";

const ACTIVITY_LABELS: Record<string, string> = {
  walk: "Walk",
  run: "Run",
  play: "Play",
  feeding: "Feeding",
  medication: "Medication",
  grooming: "Grooming",
  bathroom: "Bathroom",
  poop: "Poop",
  pee: "Pee",
  vet: "Vet visit",
  training: "Training",
  cuddle: "Cuddle",
  other: "Other",
};

export default function PetDetail() {
  const params = useParams<{ id: string }>();
  const petId = params?.id as GenericId<"pets">;
  const pet = useQuery(api.pets.get, petId ? { petId } : "skip");
  const logs = useQuery(api.logs.listByPet, petId ? { petId } : "skip");
  const csvData = useQuery(api.logs.exportCsv, petId ? { petId } : "skip");
  const jsonData = useQuery(api.logs.exportJson, petId ? { petId } : "skip");
  const createInvite = useAction(api.invites.create);
  const editLog = useMutation(api.logs.editLog);
  const deleteLog = useMutation(api.logs.deleteLog);
  const [editingLog, setEditingLog] = useState<GenericId<"logs"> | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  if (pet === undefined || logs === undefined) {
    return (
      <div className="min-h-screen bg-cream dark:bg-cream-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (pet === null || logs === null) {
    return (
      <div className="min-h-screen bg-cream dark:bg-cream-dark">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Pet not found</h1>
          <p className="text-gray-600 dark:text-gray-400">This pet doesn&apos;t exist or you don&apos;t have access.</p>
        </main>
      </div>
    );
  }

  const handleEdit = (logId: GenericId<"logs">, notes: string) => {
    setEditingLog(logId);
    setEditNotes(notes);
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      await editLog({ logId: editingLog, notes: editNotes || undefined });
      setEditingLog(null);
      setEditNotes("");
      } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to edit log");
    }
  };

  const handleDelete = async (logId: GenericId<"logs">) => {
    if (!confirm("Delete this log entry?")) return;
    try {
      await deleteLog({ logId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete log");
    }
  };

  const handleExportCsv = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pet.name}-logs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!jsonData) return;
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pet.name}-logs.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await createInvite({
        petId: pet._id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const formatTimestamp = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-gray-500 dark:text-gray-500 hover:text-amber-700 dark:hover:text-amber-400"
            >
              ← Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{pet.name}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {pet.species}
              {pet.breed ? `, ${pet.breed}` : ""}
              {pet.age ? `, ${pet.age} years` : ""}
            </p>
            {pet.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{pet.notes}</p>}
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Logs</h2>
          {logs.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No activity logged yet. Call your Vapi number to log activities by voice.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className="border border-amber-100 dark:border-amber-900/30 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {ACTIVITY_LABELS[log.activityType] ?? log.activityType}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.durationMinutes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Duration: {log.durationMinutes} min
                      {log.durationRaw && ` (${log.durationRaw})`}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{log.notes}</p>
                  )}
                  {log.callerName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      By: {log.callerName}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(log._id, log.notes ?? "")}
                      className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(log._id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {editingLog !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Edit notes
              </h3>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm bg-amber-50/30 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setEditingLog(null)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-paw text-white rounded text-sm font-semibold hover:bg-paw-dark"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Export logs</h2>
          <div className="flex gap-3">
            <button
              onClick={handleExportCsv}
              disabled={!csvData}
              className="px-4 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              onClick={handleExportJson}
              disabled={!jsonData}
              className="px-4 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Download JSON
            </button>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Invite someone
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Invite a sitter or co-owner by email. They&apos;ll receive a link to accept.
          </p>
          {inviteSuccess && (
            <p className="text-sm text-green-600 mb-2">{inviteSuccess}</p>
          )}
          {inviteError && (
            <p className="text-sm text-red-600 mb-2">{inviteError}</p>
          )}
          <form onSubmit={handleInvite} className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm bg-amber-50/30 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200"
                required
                disabled={inviteLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "owner" | "member")}
                className="px-3 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm bg-amber-50/30 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <option value="member">Member (view logs)</option>
                <option value="owner">Owner (full access)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-4 py-2 bg-paw text-white rounded text-sm font-semibold hover:bg-paw-dark disabled:opacity-60"
            >
              {inviteLoading ? "Sending…" : "Send invite"}
            </button>
          </form>
        </section>

        <MedicalDisclaimer />
      </main>
    </div>
  );
}
