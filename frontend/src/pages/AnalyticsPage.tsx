import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart3, FileText, BookOpen, Sparkles, Brain,
  Loader2, ChevronDown, Download, Tag, Clock, Hash,
  ListChecks, Lightbulb, Target, ArrowRight
} from 'lucide-react'
import { pdfApi, summaryApi, quizApi } from '@/services/api'
import toast from 'react-hot-toast'

const SUMMARY_TYPES = [
  { value: 'short', label: 'Short', desc: '100-200 words' },
  { value: 'detailed', label: 'Detailed', desc: '500-1000 words' },
  { value: 'executive', label: 'Executive', desc: 'Business report' },
  { value: 'chapter', label: 'Chapter-wise', desc: 'Section summaries' },
]

const QUIZ_TYPES = [
  { value: 'mcq', label: 'MCQ', desc: 'Multiple choice' },
  { value: 'flashcard', label: 'Flashcards', desc: 'Q&A pairs' },
  { value: 'short_answer', label: 'Short Answer', desc: 'Brief answers' },
  { value: 'long_answer', label: 'Essay', desc: 'Long form' },
]

function StatCard({ icon: Icon, label, value, color = 'text-primary-400' }: any) {
  return (
    <div className="glass-card">
      <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold font-display">{value ?? '—'}</p>
      <p className="text-slate-400 text-sm mt-0.5">{label}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [summaryType, setSummaryType] = useState('detailed')
  const [quizType, setQuizType] = useState('mcq')
  const [quizCount, setQuizCount] = useState(5)
  const [summary, setSummary] = useState<string | null>(null)
  const [keyPoints, setKeyPoints] = useState<any | null>(null)
  const [quiz, setQuiz] = useState<any[] | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'keypoints' | 'quiz'>('summary')

  const { data: docs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await pdfApi.list()).data,
  })
  const readyDocs = docs.filter((d: any) => d.status === 'ready')
  const doc = docs.find((d: any) => d.id === documentId)

  const summaryMutation = useMutation({
    mutationFn: () => summaryApi.summarize(documentId!, summaryType),
    onSuccess: (res) => setSummary(res.data.summary),
    onError: () => toast.error('Failed to generate summary'),
  })

  const keyPointsMutation = useMutation({
    mutationFn: () => summaryApi.keyPoints(documentId!),
    onSuccess: (res) => setKeyPoints(res.data),
    onError: () => toast.error('Failed to extract key points'),
  })

  const quizMutation = useMutation({
    mutationFn: () => quizApi.generate(documentId!, quizType, quizCount),
    onSuccess: (res) => setQuiz(res.data.questions),
    onError: () => toast.error('Failed to generate quiz'),
  })

  if (!documentId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <BarChart3 className="text-slate-500 mb-4" size={40} />
        <h2 className="font-display text-xl font-bold mb-2">Select a document</h2>
        <div className="w-full max-w-md space-y-2 mt-4">
          {readyDocs.map((d: any) => (
            <button key={d.id} onClick={() => navigate(`/analytics/${d.id}`)}
              className="w-full glass-card flex items-center gap-3 hover:bg-white/8 transition-colors text-left">
              <FileText className="text-red-400 flex-shrink-0" size={18} />
              <span className="truncate font-medium">{d.original_name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Document Insights</h1>
          <p className="text-slate-400 flex items-center gap-2">
            <FileText size={14} className="text-red-400" />
            {doc?.original_name}
          </p>
        </div>
        <select value={documentId} onChange={e => navigate(`/analytics/${e.target.value}`)} className="input text-sm w-52">
          {readyDocs.map((d: any) => (
            <option key={d.id} value={d.id}>{d.original_name.slice(0, 35)}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Total Pages" value={doc?.total_pages} color="text-primary-400" />
        <StatCard icon={Hash} label="Total Words" value={doc?.total_words?.toLocaleString()} color="text-violet-400" />
        <StatCard icon={Clock} label="Reading Time" value={doc?.reading_time_minutes ? `${doc.reading_time_minutes}m` : null} color="text-emerald-400" />
        <StatCard icon={Tag} label="Keywords Found" value={doc?.keywords?.length} color="text-yellow-400" />
      </div>

      {/* Keywords */}
      {doc?.keywords?.length > 0 && (
        <div className="glass-card mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag size={16} className="text-yellow-400" /> Top Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {doc.keywords.map((kw: string) => (
              <span key={kw} className="badge bg-yellow-400/10 text-yellow-300 text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 glass p-1 rounded-xl mb-6">
        {(['summary', 'keypoints', 'quiz'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'keypoints' ? 'Key Points' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {SUMMARY_TYPES.map(t => (
              <button key={t.value} onClick={() => setSummaryType(t.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  summaryType === t.value
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'glass border-transparent text-slate-400 hover:text-white'
                }`}>
                {t.label}
                <span className="ml-1.5 text-xs opacity-60">{t.desc}</span>
              </button>
            ))}
          </div>

          <button onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending}
            className="btn-primary flex items-center gap-2">
            {summaryMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {summaryMutation.isPending ? 'Generating...' : 'Generate Summary'}
          </button>

          {summary && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-slate-200">
                {summary}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Key Points Tab */}
      {activeTab === 'keypoints' && (
        <div className="space-y-4">
          <button onClick={() => keyPointsMutation.mutate()} disabled={keyPointsMutation.isPending}
            className="btn-primary flex items-center gap-2">
            {keyPointsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
            {keyPointsMutation.isPending ? 'Extracting...' : 'Extract Key Points'}
          </button>

          {keyPoints && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {[
                { key: 'main_ideas', icon: Lightbulb, label: 'Main Ideas', color: 'text-yellow-400 bg-yellow-400/10' },
                { key: 'key_findings', icon: Target, label: 'Key Findings', color: 'text-emerald-400 bg-emerald-400/10' },
                { key: 'action_items', icon: ArrowRight, label: 'Action Items', color: 'text-blue-400 bg-blue-400/10' },
                { key: 'recommendations', icon: Brain, label: 'Recommendations', color: 'text-violet-400 bg-violet-400/10' },
                { key: 'conclusions', icon: BookOpen, label: 'Conclusions', color: 'text-primary-400 bg-primary-400/10' },
              ].map(({ key, icon: Icon, label, color }) => keyPoints[key]?.length > 0 && (
                <div key={key} className="glass-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.split(' ')[1]}`}>
                      <Icon size={14} className={color.split(' ')[0]} />
                    </span>
                    {label}
                  </h3>
                  <ul className="space-y-2">
                    {keyPoints[key].map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${color}`}>{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab === 'quiz' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {QUIZ_TYPES.map(t => (
              <button key={t.value} onClick={() => setQuizType(t.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  quizType === t.value
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'glass border-transparent text-slate-400 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-slate-400">Questions:</span>
              <select value={quizCount} onChange={e => setQuizCount(Number(e.target.value))} className="input text-sm w-20 py-1.5">
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <button onClick={() => quizMutation.mutate()} disabled={quizMutation.isPending}
            className="btn-primary flex items-center gap-2">
            {quizMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            {quizMutation.isPending ? 'Generating...' : 'Generate Quiz'}
          </button>

          {quiz && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {quiz.map((q: any, i: number) => (
                <div key={i} className="glass-card">
                  <p className="font-medium mb-3">
                    <span className="text-primary-400 font-mono text-sm mr-2">Q{i + 1}.</span>
                    {q.question}
                  </p>
                  {q.options && (
                    <div className="space-y-1.5 mb-3">
                      {q.options.map((opt: string, j: number) => {
                        const letter = String.fromCharCode(65 + j)
                        const isCorrect = q.correct === letter
                        return (
                          <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            isCorrect ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-500/20' : 'bg-white/3 text-slate-300'
                          }`}>
                            <span className={`font-bold text-xs ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>{letter}.</span>
                            {opt}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {q.answer && !q.options && (
                    <div className="bg-emerald-400/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-emerald-200">
                      <span className="font-semibold text-emerald-400">Answer: </span>{q.answer}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
