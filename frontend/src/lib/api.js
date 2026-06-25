import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const STORAGE_KEY = "nabd_student_token";

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

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = auth.token;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

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
