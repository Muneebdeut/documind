import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Send, Loader2, FileText, BookOpen, Sparkles,
  ChevronDown, Copy, Check, ExternalLink, MessageSquare
} from 'lucide-react'
import { chatApi, pdfApi } from '@/services/api'
import toast from 'react-hot-toast'

const SUGGESTED_QUESTIONS = [
  'What is this document about?',
  'Summarize the key findings',
  'What are the main conclusions?',
  'List the most important points',
  'Explain the methodology used',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="w-6 h-6 rounded-full bg-primary-600/30 flex items-center justify-center">
        <Sparkles size={12} className="text-primary-400" />
      </div>
      <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: any }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copyText = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 px-4 py-2 group ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser ? 'bg-primary-600/30' : 'bg-violet-600/30'
      }`}>
        {isUser ? <span className="text-xs text-primary-400 font-bold">U</span>
          : <Sparkles size={12} className="text-violet-400" />}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600/20 border border-primary-500/20 text-white rounded-tr-sm'
            : 'glass text-slate-100 rounded-tl-sm'
        }`}>
          {isUser ? (
            <p>{msg.content}</p>
          ) : (
            <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources */}
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.sources.map((s: any, i: number) => (
              <span key={i} className="badge bg-emerald-400/10 text-emerald-400 text-xs">
                <BookOpen size={10} />
                Page {s.page}
              </span>
            ))}
            {msg.confidence && (
              <span className="badge bg-blue-400/10 text-blue-400 text-xs">
                {Math.round(msg.confidence * 100)}% confidence
              </span>
            )}
          </div>
        )}

        {/* Copy button */}
        {!isUser && (
          <button onClick={copyText} className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost py-1 px-2 text-xs flex items-center gap-1">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: docs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await pdfApi.list()).data,
  })

  const readyDocs = docs.filter((d: any) => d.status === 'ready')
  const selectedDoc = docs.find((d: any) => d.id === documentId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMutation = useMutation({
    mutationFn: (question: string) =>
      chatApi.send(documentId!, question, sessionId || undefined),
    onMutate: (question) => {
      setMessages(m => [...m, { id: Date.now(), role: 'user', content: question }])
      setIsTyping(true)
    },
    onSuccess: (res) => {
      const data = res.data
      if (!sessionId) setSessionId(data.session_id)
      setMessages(m => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        confidence: data.confidence
      }])
      setIsTyping(false)
    },
    onError: (err: any) => {
      setIsTyping(false)
      toast.error(err.response?.data?.detail || 'Failed to get answer')
    }
  })

  const handleSend = () => {
    if (!input.trim() || !documentId || sendMutation.isPending) return
    const q = input.trim()
    setInput('')
    sendMutation.mutate(q)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!documentId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-600/15 flex items-center justify-center mb-6">
          <MessageSquare className="text-primary-400" size={28} />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Select a document to chat</h2>
        <p className="text-slate-400 mb-6">Choose from your ready documents below</p>
        <div className="w-full max-w-md space-y-2">
          {readyDocs.length === 0 ? (
            <p className="text-slate-500">No ready documents. <button onClick={() => navigate('/dashboard')} className="text-primary-400">Upload one →</button></p>
          ) : readyDocs.map((d: any) => (
            <button key={d.id} onClick={() => navigate(`/chat/${d.id}`)}
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 glass">
        <FileText className="text-red-400 flex-shrink-0" size={18} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedDoc?.original_name || 'Document'}</p>
          <p className="text-xs text-slate-500">
            {selectedDoc?.total_pages} pages · {selectedDoc?.total_words?.toLocaleString()} words
          </p>
        </div>
        <select
          value={documentId}
          onChange={e => { navigate(`/chat/${e.target.value}`); setMessages([]); setSessionId(null) }}
          className="input text-sm w-48"
        >
          {readyDocs.map((d: any) => (
            <option key={d.id} value={d.id}>{d.original_name.slice(0, 30)}...</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/15 flex items-center justify-center mb-4">
              <Sparkles className="text-violet-400" size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ask anything about this document</h3>
            <p className="text-slate-400 text-sm mb-8">I'll provide cited answers with page references</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  className="glass px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 glass">
        <div className="flex items-end gap-3 glass rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about this document..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none text-sm py-2 px-2 max-h-32"
            rows={1}
            style={{ minHeight: '2.5rem' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0"
          >
            {sendMutation.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
