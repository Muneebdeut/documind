import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
          setAccessToken(res.data.access_token)
          original.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(original)
        } catch {
          logout()
        }
      } else {
        logout()
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// PDF
export const pdfApi = {
  upload: (file: File, onProgress?: (p: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/pdf/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round(e.loaded * 100 / e.total)) },
    })
  },
  list: () => api.get('/pdf/list'),
  get: (id: string) => api.get(`/pdf/${id}`),
  delete: (id: string) => api.delete(`/pdf/${id}`),
}

// Chat
export const chatApi = {
  send: (documentId: string, question: string, sessionId?: string) =>
    api.post('/chat/', { document_id: documentId, question, session_id: sessionId }),
  getSessions: (documentId: string) => api.get(`/chat/sessions/${documentId}`),
  getHistory: (sessionId: string) => api.get(`/chat/history/${sessionId}`),
  compare: (documentIds: string[], question: string) =>
    api.post('/chat/compare', { document_ids: documentIds, question }),
}

// Summary
export const summaryApi = {
  summarize: (documentId: string, summaryType: string) =>
    api.post('/summary/', { document_id: documentId, summary_type: summaryType }),
  keyPoints: (documentId: string) =>
    api.post('/summary/key-points', { document_id: documentId }),
}

// Quiz
export const quizApi = {
  generate: (documentId: string, quizType: string, numQuestions: number) =>
    api.post('/quiz/', { document_id: documentId, quiz_type: quizType, num_questions: numQuestions }),
}

// Export
export const exportApi = {
  exportChat: (sessionId: string, format: string = 'txt') =>
    api.post('/export/chat', { session_id: sessionId, format }, { responseType: 'blob' }),
}

export default api
