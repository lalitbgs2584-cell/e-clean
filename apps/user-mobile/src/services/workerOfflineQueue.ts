import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";
import {
  presignCleanupImage,
  completeCleanup,
  presignNoWasteProof,
  submitNoWasteFound,
  uploadToPresignedUrl,
} from "./workerService";

const QUEUE_STORAGE_KEY = "eclean_worker_evidence_queue";

export interface QueuedEvidence {
  id: string;
  cleanupId: string;
  type: "complete" | "no-waste";
  beforeUri?: string;
  afterUri?: string;
  noWasteUri?: string;
  notes?: string;
  createdAt: string;
  status: "pending" | "uploading" | "failed";
  attempts: number;
  lastError?: string;
}

type QueueListener = (queue: QueuedEvidence[]) => void;
const listeners = new Set<QueueListener>();

function notifyListeners(queue: QueuedEvidence[]) {
  listeners.forEach((listener) => {
    try {
      listener(queue);
    } catch (e) {
      console.warn("[workerOfflineQueue] listener error", e);
    }
  });
}

export function subscribeToEvidenceQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  getQueuedEvidences().then((queue) => listener(queue));
  return () => {
    listeners.delete(listener);
  };
}

export async function getQueuedEvidences(): Promise<QueuedEvidence[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedEvidence[];
  } catch (error) {
    console.warn("[workerOfflineQueue] Failed to load queue", error);
    return [];
  }
}

async function saveQueue(queue: QueuedEvidence[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners(queue);
  } catch (error) {
    console.warn("[workerOfflineQueue] Failed to save queue", error);
  }
}

export async function getQueuedEvidenceForCleanup(
  cleanupId: string,
): Promise<QueuedEvidence | null> {
  const queue = await getQueuedEvidences();
  return queue.find((item) => item.cleanupId === cleanupId) ?? null;
}

export async function enqueueEvidence(
  item: Omit<QueuedEvidence, "id" | "createdAt" | "status" | "attempts">,
): Promise<QueuedEvidence> {
  const queue = await getQueuedEvidences();
  // Filter out existing queue entry for the same cleanup if any
  const filtered = queue.filter((q) => q.cleanupId !== item.cleanupId);

  const newEntry: QueuedEvidence = {
    ...item,
    id: `${item.cleanupId}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };

  const updated = [newEntry, ...filtered];
  await saveQueue(updated);
  return newEntry;
}

export async function removeQueuedEvidence(id: string): Promise<void> {
  const queue = await getQueuedEvidences();
  const updated = queue.filter((item) => item.id !== id);
  await saveQueue(updated);
}

let isSyncing = false;

export async function syncQueuedEvidences(): Promise<{
  synced: number;
  failed: number;
}> {
  if (isSyncing) return { synced: 0, failed: 0 };
  
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || net.isInternetReachable === false) {
      return { synced: 0, failed: 0 };
    }
  } catch {
    // If check fails, try proceeding anyway
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getQueuedEvidences();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    for (const item of queue) {
      try {
        // Mark as uploading
        item.status = "uploading";
        item.attempts += 1;
        await saveQueue(queue);

        if (item.type === "complete") {
          if (!item.beforeUri || !item.afterUri) {
            throw new Error("Missing before or after evidence URI");
          }

          // 1. Presign before & after
          const beforePresign = await presignCleanupImage(
            item.cleanupId,
            "before",
            "image/jpeg",
          );
          await uploadToPresignedUrl(beforePresign.url, item.beforeUri);

          const afterPresign = await presignCleanupImage(
            item.cleanupId,
            "after",
            "image/jpeg",
          );
          await uploadToPresignedUrl(afterPresign.url, item.afterUri);

          // 2. Complete cleanup
          await completeCleanup(item.cleanupId, {
            beforeImageKey: beforePresign.key,
            afterImageKey: afterPresign.key,
            notes: item.notes,
          });
        } else if (item.type === "no-waste") {
          if (!item.noWasteUri) {
            throw new Error("Missing no-waste proof URI");
          }

          const presign = await presignNoWasteProof(
            item.cleanupId,
            "image/jpeg",
          );
          await uploadToPresignedUrl(presign.url, item.noWasteUri);

          await submitNoWasteFound(item.cleanupId, {
            imageKey: presign.key,
            notes: item.notes,
          });
        }

        // Successfully uploaded - remove from queue
        await removeQueuedEvidence(item.id);
        synced += 1;
      } catch (err: any) {
        console.warn(`[workerOfflineQueue] Sync failed for ${item.cleanupId}:`, err);
        item.status = "failed";
        item.lastError = err?.message ?? "Upload error";
        await saveQueue(queue);
        failed += 1;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}
