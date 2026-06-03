import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, MessageSquare, Trash2, BarChart3,
  Loader2, CheckCircle, Clock, AlertCircle, X, Plus
} from 'lucide-react'
import { pdfApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

function StatusBadge({ status }: { status: string }) {
  const map = {
    ready: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-400/10', label: 'Ready' },
    processing: { icon: Loader2, color: 'text-yellow-400 bg-yellow-400/10', label: 'Processing' },
    error: { icon: AlertCircle, color: 'text-red-400 bg-red-400/10', label: 'Error' },
  }
  const cfg = map[status as keyof typeof map] || map.processing
  const Icon = cfg.icon
  return (
    <span className={`badge ${cfg.color}`}>
      <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const { data: docs = [], isLoading } = useQuery<any[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await pdfApi.list()
      return res.data
    },
    refetchInterval: (query) => {
      const data = query.state.data
      const hasProcessing = data?.some?.((d: any) => d.status === 'processing')
      return hasProcessing ? 3000 : false
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const id = file.name + Date.now()
      setUploadProgress(p => ({ ...p, [id]: 0 }))
      const res = await pdfApi.upload(file, (prog) => setUploadProgress(p => ({ ...p, [id]: prog })))
      setUploadProgress(p => { const n = { ...p }; delete n[id]; return n })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('PDF uploaded! Processing in background...')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pdfApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
  })

  const onDrop = useCallback((accepted: File[]) => {
    accepted.forEach(f => uploadMutation.mutate(f))
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (files) => {
      files.forEach(f => toast.error(f.errors[0]?.message || 'Invalid file'))
    }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">
          Welcome back, {user?.username} 👋
        </h1>
        <p className="text-slate-400 mt-1">Upload PDFs and start chatting with your documents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Documents', value: docs.length },
          { label: 'Ready', value: docs.filter((d: any) => d.status === 'ready').length },
          { label: 'Processing', value: docs.filter((d: any) => d.status === 'processing').length },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card">
            <p className="text-2xl font-bold font-display">{value}</p>
            <p className="text-slate-400 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-8 ${
          isDragActive
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/3'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-14 h-14 rounded-2xl bg-primary-600/15 flex items-center justify-center mx-auto mb-4">
          <Upload className="text-primary-400" size={24} />
        </div>
        <p className="text-lg font-semibold mb-1">
          {isDragActive ? 'Drop PDFs here...' : 'Drop PDFs here or click to upload'}
        </p>
        <p className="text-slate-500 text-sm">PDF only • Max 50MB per file • Multiple files supported</p>
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {Object.keys(uploadProgress).map(id => (
          <motion.div key={id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card mb-4 flex items-center gap-4">
            <Loader2 className="animate-spin text-primary-400 flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress[id]}%` }} />
              </div>
            </div>
            <span className="text-sm text-slate-400 font-mono">{uploadProgress[id]}%</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Documents */}
      <div>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileText size={18} className="text-slate-400" />
          Document Library
          <span className="badge bg-white/10 text-slate-400 ml-2">{docs.length}</span>
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="animate-spin mr-3" size={20} /> Loading documents...
          </div>
        ) : docs.length === 0 ? (
          <div className="glass-card text-center py-16 text-slate-500">
            <FileText size={40} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm mt-1">Upload your first PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {docs.map((doc: any) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card flex items-center gap-4 hover:bg-white/8 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="text-red-400" size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.original_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatBytes(doc.file_size)}</span>
                      {doc.total_pages && <span>{doc.total_pages} pages</span>}
                      {doc.reading_time_minutes && <span>~{doc.reading_time_minutes} min read</span>}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <StatusBadge status={doc.status} />

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/chat/${doc.id}`)}
                      disabled={doc.status !== 'ready'}
                      className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5 disabled:opacity-40"
                      title="Chat with document"
                    >
                      <MessageSquare size={14} />
                      Chat
                    </button>
                    <button
                      onClick={() => navigate(`/analytics/${doc.id}`)}
                      disabled={doc.status !== 'ready'}
                      className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5 disabled:opacity-40"
                    >
                      <BarChart3 size={14} />
                      Insights
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="btn-ghost text-xs py-1.5 px-2.5 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
