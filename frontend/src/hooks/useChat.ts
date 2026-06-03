import { useState, useCallback } from 'react'
import { chatApi } from '@/services/api'
import toast from 'react-hot-toast'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { page: number; snippet: string }[]
  confidence?: number
}

export function useChat(documentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return

      // Optimistically add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
      }
      setMessages((m) => [...m, userMsg])
      setIsLoading(true)

      try {
        const res = await chatApi.send(documentId, question, sessionId ?? undefined)
        const data = res.data

        if (!sessionId) setSessionId(data.session_id)

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          confidence: data.confidence,
        }
        setMessages((m) => [...m, aiMsg])
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Failed to get answer')
        // Remove optimistic user message on error
        setMessages((m) => m.filter((msg) => msg.id !== userMsg.id))
      } finally {
        setIsLoading(false)
      }
    },
    [documentId, sessionId, isLoading],
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
  }, [])

  return { messages, sessionId, isLoading, sendMessage, clearChat }
}
