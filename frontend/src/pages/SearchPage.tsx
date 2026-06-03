import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, BookOpen, Loader2, Sparkles } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface SearchHit {
  page: number
  snippet: string
  relevance_score: number
}

export default function SearchPage() {
  const { data: docs = [] } = useDocuments()
  const readyDocs = (docs as any[]).filter((d) => d.status === 'ready')
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])

  const searchMutation = useMutation({
    mutationFn: () =>
      api.post('/search/', { document_id: selectedDocId, query, top_k: 8 }),
    onSuccess: (res) => setResults(res.data.results),
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Search failed'),
  })

  const handleSearch = () => {
    if (!selectedDocId) { toast.error('Select a document first'); return }
    if (!query.trim()) { toast.error('Enter a search query'); return }
    searchMutation.mutate()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">Semantic Search</h1>
        <p className="text-slate-400">
          Find related content even if exact words don't match
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Document
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => { setSelectedDocId(e.target.value); setResults([]) }}
            className="input"
          >
            <option value="">— Select a document —</option>
            {readyDocs.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.original_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Search Query
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. machine learning, employee satisfaction…"
                className="input pl-10"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="btn-primary flex items-center gap-2 px-5"
            >
              {searchMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Search size={15} />
              )}
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-400 mb-2">
              {results.length} relevant passages found
            </p>
            {results.map((hit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="badge bg-primary-400/10 text-primary-300">
                    <BookOpen size={11} />
                    Page {hit.page}
                  </span>
                  <span className="badge bg-emerald-400/10 text-emerald-400 text-xs">
                    <Sparkles size={10} />
                    {Math.round(hit.relevance_score * 100)}% match
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {hit.snippet}
                  {hit.snippet.length >= 299 && (
                    <span className="text-slate-500">…</span>
                  )}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {results.length === 0 && !searchMutation.isPending && (
        <div className="glass-card text-center py-16 text-slate-500">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Enter a query and select a document to search</p>
          <p className="text-sm mt-1">
            Semantic search finds related content even without exact keyword matches
          </p>
        </div>
      )}
    </div>
  )
}
