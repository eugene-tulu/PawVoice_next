"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { GenericId } from "convex/values";
import { SiteNav } from "@/components/site-nav";
import MedicalDisclaimer from "@/components/medical-disclaimer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

const ACTIVITY_LABELS: Record<string, string> = {
  walk: "Walk", run: "Run", play: "Play", feeding: "Feeding",
  medication: "Medication", grooming: "Grooming", bathroom: "Bathroom",
  poop: "Poop", pee: "Pee", vet: "Vet visit", training: "Training",
  cuddle: "Cuddle", other: "Other",
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
  const [deleteTarget, setDeleteTarget] = useState<GenericId<"logs"> | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
  const canEdit = (ts: number) => Date.now() - ts <= EDIT_WINDOW_MS;

  if (pet === undefined || logs === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (pet === null || logs === null) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteNav />
        <main className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="font-display text-2xl font-black text-ink mb-4">Pet not found</h1>
          <p className="text-ink-2">This pet &apos;t exist or you don&apos;t have access.</p>
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
      toast("Log updated", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to edit log",
        "error"
      );
    }
  };

  const handleDelete = async (logId: GenericId<"logs">) => {
    setDeleteTarget(logId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLog({ logId: deleteTarget });
      toast("Log deleted", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete log",
        "error"
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="text-xs text-muted hover:text-ink transition-colors mb-6 inline-block"
        >
          ← Back to dashboard
        </Link>

        <h1 className="font-display text-3xl font-black tracking-tight text-ink mb-1">
          {pet.name}
        </h1>
        <p className="text-sm text-ink-2 mb-8">
          {pet.species}
          {pet.breed ? `, ${pet.breed}` : ""}
          {pet.age ? `, ${pet.age} years` : ""}
        </p>
        {pet.notes && (
          <p className="text-sm text-muted mb-8">{pet.notes}</p>
        )}

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Activity log
          </h2>
          {logs.length === 0 ? (
            <p className="text-ink-2 text-sm">
              No activity logged yet. Call your Vapi number to log activities by voice.
            </p>
          ) : (
            <div className="border-t border-rule">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="border-t border-rule py-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-medium text-accent">
                      {ACTIVITY_LABELS[log.activityType] ?? log.activityType}
                    </span>
                    <span className="text-xs text-muted font-mono">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.durationMinutes && (
                    <p className="text-sm text-ink-2">
                      Duration: {log.durationMinutes} min
                      {log.durationRaw && ` (${log.durationRaw})`}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-sm text-ink mt-1">{log.notes}</p>
                  )}
                  {log.callerName && (
                    <p className="text-xs text-muted mt-1">
                      By: {log.callerName}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    {canEdit(log.timestamp) ? (
                      <>
                        <button
                          onClick={() => handleEdit(log._id, log.notes ?? "")}
                          className="text-muted transition-colors hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(log._id)}
                          className="text-muted transition-colors hover:text-ink"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-muted">
                        Locked after 24 hours
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {editingLog !== null && (
          <div className="fixed inset-0 bg-paper/95 flex items-center justify-center p-4">
            <div className="bg-paper-2 rounded-lg p-5 max-w-md w-full border border-rule">
              <h3 className="font-display text-lg font-semibold text-ink mb-3">
                Edit notes
              </h3>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="field"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setEditingLog(null)}
                  className="px-3 py-1 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-accent text-paper rounded text-sm font-medium hover:bg-ink transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Delete this log entry?"
          description="This permanently removes the activity from the pet's timeline. It cannot be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Export logs
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleExportCsv}
              disabled={!csvData}
              className="btn btn-ghost !rounded-lg"
            >
              Download CSV
            </button>
            <button
              onClick={handleExportJson}
              disabled={!jsonData}
              className="btn btn-ghost !rounded-lg"
            >
              Download JSON
            </button>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Invite someone
          </h2>
          <p className="text-sm text-ink-2 mb-3">
            Invite a sitter or co-owner by email. They&apos;ll receive a link to accept.
          </p>
          {inviteSuccess && (
            <p className="text-sm text-ink mb-2">{inviteSuccess}</p>
          )}
          {inviteError && (
            <p className="text-sm text-muted mb-2">{inviteError}</p>
          )}
          <form onSubmit={handleInvite} className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-muted mb-1">
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="field"
                required
                disabled={inviteLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "owner" | "member")}
                className="field cursor-pointer"
              >
                <option value="member">Member (view logs)</option>
                <option value="owner">Owner (full access)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-4 py-2 bg-accent text-paper rounded text-sm font-medium hover:bg-ink transition-colors disabled:opacity-60"
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
