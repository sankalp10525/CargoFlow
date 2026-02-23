import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exceptionsApi } from "@/api/endpoints";
import type { LogisticsException } from "@/types";
import { ExceptionStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, PartyPopper } from "lucide-react";

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  DELAY: "Delay",
  FAILED_ATTEMPT: "Failed Attempt",
  WRONG_ADDRESS: "Wrong Address",
  CUSTOMER_UNAVAILABLE: "Customer Unavailable",
  DAMAGED: "Damaged",
  OTHER: "Other",
};

export default function OpsExceptionsPage() {
  const qc = useQueryClient();
  const [ackId, setAckId] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data: exceptions, isLoading, isError } = useQuery<LogisticsException[]>({
    queryKey: ["exceptions"],
    queryFn: () => exceptionsApi.list().then((r) => r.data),
  });

  const ack = useMutation({
    mutationFn: () => exceptionsApi.ack(ackId!, ackNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exceptions"] });
      setAckId(null);
      setAckNote("");
    },
  });

  const resolve = useMutation({
    mutationFn: () => exceptionsApi.resolve(resolveId!, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exceptions"] });
      setResolveId(null);
      setResolution("");
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  const filtered = filterStatus
    ? exceptions?.filter((e) => e.status === filterStatus)
    : exceptions;

  const openCount = exceptions?.filter((e) => e.status === "OPEN").length ?? 0;
  const ackCount = exceptions?.filter((e) => e.status === "ACKNOWLEDGED").length ?? 0;

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Exceptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {openCount} open · {ackCount} acknowledged
          </p>
        </div>
        <div className="flex gap-2">
          {["", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? "bg-brand-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered?.map((exc) => (
          <div
            key={exc.id}
            className="card flex items-start justify-between gap-4 hover:shadow-md transition-all duration-200 animate-fade-in"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className={`mt-0.5 rounded-lg p-2 ${
                exc.status === "OPEN"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : exc.status === "ACKNOWLEDGED"
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-green-100 dark:bg-green-900/30"
              }`}>
                <AlertTriangle
                  size={16}
                  className={
                    exc.status === "OPEN"
                      ? "text-red-600 dark:text-red-400"
                      : exc.status === "ACKNOWLEDGED"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400"
                  }
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <ExceptionStatusBadge status={exc.status} />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">
                    {EXCEPTION_TYPE_LABELS[exc.type] ?? exc.type}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Order: <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{exc.order_reference}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{exc.notes || exc.description || "No description."}</p>
                {exc.resolution && (
                  <p className="mt-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded px-2 py-1">
                    Resolution: {exc.resolution}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(exc.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end shrink-0">
              {exc.status === "OPEN" && (
                <button
                  onClick={() => { setAckId(exc.id); setAckNote(""); }}
                  className="btn-secondary text-xs"
                >
                  Acknowledge
                </button>
              )}
              {exc.status === "ACKNOWLEDGED" && (
                <button
                  onClick={() => { setResolveId(exc.id); setResolution(""); }}
                  className="btn-primary text-xs"
                >
                  <CheckCircle2 size={13} /> Resolve
                </button>
              )}
              {exc.status === "RESOLVED" && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 size={13} /> Resolved
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered?.length === 0 && (
          <div className="card flex flex-col items-center py-16 text-center">
            <PartyPopper size={40} className="mb-3 text-green-400 dark:text-green-500" />
            <p className="font-semibold text-gray-600 dark:text-gray-400">No exceptions{filterStatus ? ` with status "${filterStatus}"` : ""}!</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Everything is running smoothly. 🎉</p>
          </div>
        )}
      </div>

      {/* Ack modal */}
      {ackId && (
        <Modal title="Acknowledge Exception" onClose={() => setAckId(null)}>
          <p className="text-sm text-gray-500 mb-3">Add a note to document your acknowledgement.</p>
          <textarea
            className="input-field mb-3"
            rows={3}
            placeholder="Add a note…"
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => ack.mutate()}
              disabled={!ackNote.trim() || ack.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {ack.isPending ? "Saving…" : "Acknowledge"}
            </button>
            <button onClick={() => setAckId(null)} className="btn-secondary">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Resolve modal */}
      {resolveId && (
        <Modal title="Resolve Exception" onClose={() => setResolveId(null)}>
          <p className="text-sm text-gray-500 mb-3">Describe how this exception was resolved.</p>
          <textarea
            className="input-field mb-3"
            rows={3}
            placeholder="Describe the resolution…"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => resolve.mutate()}
              disabled={!resolution.trim() || resolve.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {resolve.isPending ? "Saving…" : "Mark Resolved"}
            </button>
            <button onClick={() => setResolveId(null)} className="btn-secondary">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="card w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

