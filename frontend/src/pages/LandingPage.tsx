import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, MessageSquare, Sparkles, Shield, Zap,
  BarChart3, ArrowRight, Check, Upload, Brain, FileText
} from 'lucide-react'

const features = [
  { icon: MessageSquare, title: 'Conversational AI Chat', desc: 'Ask anything about your PDF in natural language. Get precise answers with page citations.' },
  { icon: Brain, title: 'Smart Summarization', desc: 'Generate short, detailed, executive, or chapter-wise summaries instantly.' },
  { icon: Sparkles, title: 'Study Assistant', desc: 'Auto-generate flashcards, MCQs, and quiz questions from any document.' },
  { icon: BarChart3, title: 'Document Analytics', desc: 'Visual insights into topic distribution, keywords, and document structure.' },
  { icon: Shield, title: 'Citation-Based Answers', desc: 'Every AI response includes source page numbers and paragraph references.' },
  { icon: Zap, title: 'Multi-PDF Comparison', desc: 'Upload multiple documents and compare them side-by-side with AI.' },
]

const steps = [
  { icon: Upload, step: '01', title: 'Upload PDF', desc: 'Drag & drop any PDF up to 50MB' },
  { icon: Brain, step: '02', title: 'AI Processing', desc: 'Our RAG pipeline analyzes your document' },
  { icon: MessageSquare, step: '03', title: 'Start Chatting', desc: 'Ask questions, get cited answers instantly' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-100">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-display font-bold text-xl">DocuMind AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[80px]" />
        </div>

        <motion.div
          className="max-w-4xl mx-auto text-center relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-primary-400 mb-8">
            <Sparkles size={14} />
            <span>Powered by LangChain + RAG + Gemini AI</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Chat with any{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-violet-400">
              PDF document
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your PDFs and start having intelligent conversations. Get cited answers,
            summaries, flashcards, and deep insights — instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
              Start for Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="glass hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 text-base">
              Sign in
            </Link>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ icon: Icon, step, title, desc }, i) => (
              <motion.div
                key={step}
                className="glass-card text-center relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="absolute -top-3 left-6 text-xs font-mono font-bold text-primary-400 bg-primary-900/50 px-2 py-0.5 rounded">{step}</div>
                <div className="w-12 h-12 rounded-2xl bg-primary-600/20 flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-primary-400" size={22} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-slate-400 text-center mb-12">Professional AI tools for students, researchers, and professionals</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="glass-card hover:bg-white/8 transition-all duration-300 cursor-default group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-600/15 flex items-center justify-center mb-4 group-hover:bg-primary-600/25 transition-colors">
                  <Icon className="text-primary-400" size={18} />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-slate-400 mb-8">Join thousands of users who chat with their documents every day.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5">
            Create Free Account <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-slate-500 text-sm">
        <p>© 2024 DocuMind AI. Built with LangChain, FastAPI, and React.</p>
      </footer>
    </div>
  )
}
