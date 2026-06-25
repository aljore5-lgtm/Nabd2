import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const STORAGE_KEY = "nabd_student_token";
const ADVISOR_KEY = "nabd_advisor_token";

export const auth = {
  get token() {
    return localStorage.getItem(STORAGE_KEY);
  },
  set(token) {
    localStorage.setItem(STORAGE_KEY, token);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export const advisorAuth = {
  get token() {
    return localStorage.getItem(ADVISOR_KEY);
  },
  set(token) {
    localStorage.setItem(ADVISOR_KEY, token);
  },
  clear() {
    localStorage.removeItem(ADVISOR_KEY);
  },
};

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  // Prefer student token by default
  const t = auth.token;
  if (t && !cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const advisorApi = axios.create({ baseURL: API });
advisorApi.interceptors.request.use((cfg) => {
  const t = advisorAuth.token;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ---- Student ----
export async function studentLogin(student_id, password) {
  const { data } = await api.post("/student/login", { student_id, password });
  auth.set(data.token);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/student/me");
  return data;
}

export async function fetchAISuggestions() {
  const { data } = await api.post("/student/ai-suggestions");
  return data;
}

export async function fetchDemoCredentials() {
  const { data } = await api.get("/student/demo-credentials");
  return data;
}

export async function fetchChatHistory() {
  const { data } = await api.get("/student/chat/history");
  return data;
}

export async function sendChatMessage(message) {
  const { data } = await api.post("/student/chat", { message });
  return data;
}

export async function clearChatHistory() {
  const { data } = await api.delete("/student/chat/history");
  return data;
}

export async function fetchMyInterventions() {
  const { data } = await api.get("/student/interventions");
  return data;
}

export async function fetchAchievements() {
  const { data } = await api.get("/student/achievements");
  return data;
}

export async function fetchComparison() {
  const { data } = await api.get("/student/comparison");
  return data;
}

export async function bookAppointment(payload) {
  const { data } = await api.post("/student/appointments", payload);
  return data;
}

export async function fetchMyAppointments() {
  const { data } = await api.get("/student/appointments");
  return data;
}

export async function cancelAppointment(id) {
  const { data } = await api.delete(`/student/appointments/${id}`);
  return data;
}

export async function fetchAdvisorAppointments() {
  const { data } = await advisorApi.get("/advisor/appointments");
  return data;
}

export async function updateAppointmentStatus(id, status, advisor_note) {
  const { data } = await advisorApi.patch(`/advisor/appointments/${id}`, { status, advisor_note });
  return data;
}

// ---- Advisor ----
export async function advisorLogin(username, password) {
  const { data } = await advisorApi.post("/advisor/login", { username, password });
  advisorAuth.set(data.token);
  return data;
}

export async function fetchAdvisorStudents() {
  const { data } = await advisorApi.get("/advisor/students");
  return data;
}

export async function fetchAdvisorStudent(studentId) {
  const { data } = await advisorApi.get(`/advisor/student/${studentId}`);
  return data;
}

export async function fetchStudentInterventions(studentId) {
  const { data } = await advisorApi.get(`/advisor/student/${studentId}/interventions`);
  return data;
}

export async function addIntervention(payload) {
  const { data } = await advisorApi.post("/advisor/intervention", payload);
  return data;
}

export async function updateInterventionStatus(id, status) {
  const { data } = await advisorApi.patch(`/advisor/intervention/${id}`, { status });
  return data;
}

// ---- Contact ----
export async function fetchContactInfo() {
  const { data } = await api.get("/contact");
  return data;
}

export async function sendContactMessage(payload) {
  const { data } = await api.post("/contact/message", payload);
  return data;
}
