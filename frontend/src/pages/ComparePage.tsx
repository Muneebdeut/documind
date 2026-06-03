import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  GitCompare, FileText, Loader2, Send, CheckSquare, Square,
} from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import { chatApi } from '@/services/api'
import toast from 'react-hot-toast'

export default function ComparePage() {
  const { data: docs = [] } = useDocuments()
  const readyDocs = (docs as any[]).filter((d) => d.status === 'ready')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const compareMutation = useMutation({
    mutationFn: () => chatApi.compare(selectedIds, question),
    onSuccess: (res) => setAnswer(res.data.answer),
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Comparison failed'),
  })

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least 2 documents')
      return
    }
    if (!question.trim()) {
      toast.error('Enter a question for comparison')
      return
    }
    setAnswer(null)
    compareMutation.mutate()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">
          Compare Documents
        </h1>
        <p className="text-slate-400">
          Select 2 or more PDFs and ask AI to compare them
        </p>
      </div>

      {/* Document picker */}
      <div className="glass-card mb-6">
        <h2 className="font-semibold mb-3">
          Select Documents{' '}
          <span className="text-sm text-slate-400 font-normal">
            ({selectedIds.length} selected)
          </span>
        </h2>
        {readyDocs.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No ready documents — upload PDFs from the Dashboard first.
          </p>
        ) : (
          <div className="space-y-2">
            {readyDocs.map((d: any) => {
              const checked = selectedIds.includes(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggle(d.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    checked
                      ? 'bg-primary-600/15 border border-primary-500/30 text-white'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  {checked ? (
                    <CheckSquare size={16} className="text-primary-400 flex-shrink-0" />
                  ) : (
                    <Square size={16} className="text-slate-600 flex-shrink-0" />
                  )}
                  <FileText size={15} className="text-red-400 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">
                    {d.original_name}
                  </span>
                  <span className="ml-auto text-xs text-slate-500 flex-shrink-0">
                    {d.total_pages}p
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Question */}
      <div className="glass-card mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Comparison Question
        </label>
        <div className="flex gap-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What are the main differences between these documents?"
            className="input resize-none"
            rows={2}
          />
          <button
            onClick={handleCompare}
            disabled={compareMutation.isPending}
            className="btn-primary flex items-center gap-2 self-end px-5 py-2.5 flex-shrink-0"
          >
            {compareMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <GitCompare size={15} />
            )}
            Compare
          </button>
        </div>
      </div>

      {/* Answer */}
      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary-300">
              <GitCompare size={16} />
              Comparison Result
            </h3>
            <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
              {answer}
            </ReactMarkdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
