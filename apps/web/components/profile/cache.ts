import type { DashboardResponse, ProfileSnapshotResponse } from "./types";

const profileSnapshotKey = "duet-profile-snapshot";
const dashboardSnapshotKey = "duet-dashboard-snapshot";

export function readProfileSnapshotCache(): ProfileSnapshotResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(profileSnapshotKey);
    return raw ? (JSON.parse(raw) as ProfileSnapshotResponse) : null;
  } catch {
    return null;
  }
}

export function writeProfileSnapshotCache(value: ProfileSnapshotResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(profileSnapshotKey, JSON.stringify(value));
}

export function clearProfileSnapshotCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(profileSnapshotKey);
}

export function readDashboardCache(): DashboardResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(dashboardSnapshotKey);
    return raw ? (JSON.parse(raw) as DashboardResponse) : null;
  } catch {
    return null;
  }
}

export function writeDashboardCache(value: DashboardResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(dashboardSnapshotKey, JSON.stringify(value));
}

export function clearDashboardCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(dashboardSnapshotKey);
}
