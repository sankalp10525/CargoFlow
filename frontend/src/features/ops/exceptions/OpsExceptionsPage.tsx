import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exceptionsApi } from "@/api/endpoints";
import type { LogisticsException } from "@/types";
import { ExceptionStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { useState } from "react";

export default function OpsExceptionsPage() {
  const qc = useQueryClient();
  const [ackId, setAckId] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

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

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Exceptions</h1>
      <div className="space-y-3">
        {exceptions?.map((exc) => (
          <div key={exc.id} className="card flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ExceptionStatusBadge status={exc.status} />
                <span className="text-xs font-semibold text-gray-500">{exc.type}</span>
                <span className="text-xs text-gray-400">Order: {exc.order_reference}</span>
              </div>
              <p className="text-sm text-gray-700">{exc.description}</p>
              {exc.notes && <p className="mt-1 text-xs text-gray-400">Note: {exc.notes}</p>}
            </div>

            <div className="flex flex-col gap-2 items-end">
              {exc.status === "OPEN" && (
                <button onClick={() => setAckId(exc.id)} className="btn-secondary text-xs">
                  Acknowledge
                </button>
              )}
              {exc.status === "ACKNOWLEDGED" && (
                <button onClick={() => setResolveId(exc.id)} className="btn-primary text-xs">
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
        {exceptions?.length === 0 && <p className="text-gray-400">No exceptions. 🎉</p>}
      </div>

      {/* Ack modal */}
      {ackId && (
        <Modal title="Acknowledge Exception" onClose={() => setAckId(null)}>
          <textarea
            className="input-field mb-3"
            rows={3}
            placeholder="Add a note…"
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
          />
          <button onClick={() => ack.mutate()} disabled={ack.isPending} className="btn-primary">
            Acknowledge
          </button>
        </Modal>
      )}

      {/* Resolve modal */}
      {resolveId && (
        <Modal title="Resolve Exception" onClose={() => setResolveId(null)}>
          <textarea
            className="input-field mb-3"
            rows={3}
            placeholder="Describe the resolution…"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <button onClick={() => resolve.mutate()} disabled={resolve.isPending} className="btn-primary">
            Mark Resolved
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card w-full max-w-sm shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
