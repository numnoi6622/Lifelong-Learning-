const STORAGE_KEY = "rmutlcr_trainee_applications_v1";

export function getLocalApplications(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalApplications(records: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

export function upsertLocalApplication(record: any) {
  if (!record || typeof record.id !== "number") return;
  const existing = getLocalApplications();
  const idx = existing.findIndex(item => item.id === record.id);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...record };
  } else {
    existing.unshift(record);
  }
  saveLocalApplications(existing);
}

export function removeLocalApplication(id: number) {
  const existing = getLocalApplications().filter(item => item.id !== id);
  saveLocalApplications(existing);
}
