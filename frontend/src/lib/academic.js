// Shared label/color lookups for academic UI components.

export const PRIORITY_CHIP = {
  high: "chip-danger",
  medium: "chip-warn",
  low: "chip-success",
};

export const PRIORITY_LABEL = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export const STATUS_CHIP = {
  done: "chip-success",
  in_progress: "chip-purple",
  pending: "chip-warn",
};

export const STATUS_LABEL = {
  done: "مكتمل",
  in_progress: "قيد التنفيذ",
  pending: "بانتظار",
};

export const RISK_CHIP = {
  low: "chip-success",
  medium: "chip-warn",
  high: "chip-danger",
};

export const RISK_LABEL = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "مرتفعة",
};

// Course grade → bar color
export function gradeColor(grade) {
  if (grade >= 80) return "#10b981";
  if (grade >= 60) return "#f59e0b";
  return "#ef4444";
}

export function priorityChip(p) {
  return PRIORITY_CHIP[p] || "chip-warn";
}

export function priorityLabel(p) {
  return PRIORITY_LABEL[p] || p;
}

export function statusChip(s) {
  return STATUS_CHIP[s] || "chip-warn";
}

export function statusLabel(s) {
  return STATUS_LABEL[s] || s;
}
