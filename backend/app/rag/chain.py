from typing import List, Optional, Tuple
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from app.config import settings
from app.rag.processor import pdf_processor

def get_llm():
    """Get LLM based on configured provider."""
    if settings.LLM_PROVIDER == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0.1,
            api_key=settings.OPENAI_API_KEY
        )
    elif settings.LLM_PROVIDER == "groq":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0.1,
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            temperature=0.1,
            google_api_key=settings.GOOGLE_API_KEY
        )

QA_PROMPT = PromptTemplate(
    input_variables=["context", "question", "chat_history"],
    template="""You are DocuMind AI, an intelligent document analysis assistant.
Answer the user's question based ONLY on the provided document context.

If the answer is not in the context, say: "I couldn't find this information in the uploaded document."

Always be precise, cite specific information from the document, and mention relevant page numbers when available.

Context from document:
{context}

Chat History:
{chat_history}

Question: {question}

Provide a comprehensive answer with specific references to the document. Format your response clearly."""
)

SUMMARY_PROMPT = PromptTemplate(
    input_variables=["context", "summary_type"],
    template="""You are an expert document summarizer.

Document content:
{context}

Create a {summary_type} summary of this document.

For "short": 100-200 words covering main points.
For "detailed": 500-1000 words with all key aspects.
For "executive": Business-style report with sections (Overview, Key Points, Recommendations, Conclusion).
For "chapter": Organize by sections/chapters with individual summaries.

Summary:"""
)

QUIZ_PROMPT = PromptTemplate(
    input_variables=["context", "quiz_type", "num_questions"],
    template="""You are an educational content creator.

Document content:
{context}

Generate {num_questions} {quiz_type} based on this document.

For "mcq": Multiple choice questions with 4 options (A-D) and correct answer marked.
For "flashcard": Question and answer pairs for study.
For "short_answer": Brief answer questions.
For "long_answer": Essay-type questions.

Format as JSON array:
[{{"question": "...", "answer": "...", "options": [...] (for MCQ only), "correct": "A" (for MCQ only)}}]

Return ONLY the JSON array, no other text."""
)

KEY_POINTS_PROMPT = PromptTemplate(
    input_variables=["context"],
    template="""Analyze this document and extract structured key information.

Document:
{context}

Extract and return as JSON:
{{
  "main_ideas": ["idea1", "idea2", ...],
  "key_findings": ["finding1", "finding2", ...],
  "action_items": ["action1", "action2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "conclusions": ["conclusion1", "conclusion2", ...]
}}

Return ONLY valid JSON."""
)


class RAGChain:
    def __init__(self):
        self._llm = None
        self._memory_store = {}  # session_id -> memory

    @property
    def llm(self):
        if self._llm is None:
            self._llm = get_llm()
        return self._llm

    def get_memory(self, session_id: str) -> ConversationBufferWindowMemory:
        if session_id not in self._memory_store:
            self._memory_store[session_id] = ConversationBufferWindowMemory(
                k=10,
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
        return self._memory_store[session_id]

    def clear_memory(self, session_id: str):
        if session_id in self._memory_store:
            del self._memory_store[session_id]

    def answer_question(
        self,
        question: str,
        collection_name: str,
        session_id: str,
        top_k: int = 4
    ) -> dict:
        """Answer question with citations and confidence."""
        vectorstore = pdf_processor.load_vector_store(collection_name)
        retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})

        # Get relevant docs for citations
        relevant_docs = retriever.get_relevant_documents(question)

        memory = self.get_memory(session_id)

        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=retriever,
            memory=memory,
            combine_docs_chain_kwargs={"prompt": QA_PROMPT},
            return_source_documents=True,
            verbose=False
        )

        result = chain.invoke({"question": question})
        answer = result.get("answer", "")
        source_docs = result.get("source_documents", relevant_docs)

        # Build sources
        sources = []
        seen_pages = set()
        for doc in source_docs:
            page = doc.metadata.get("page", 0) + 1
            if page not in seen_pages:
                seen_pages.add(page)
                snippet = doc.page_content[:200].strip()
                sources.append({
                    "page": page,
                    "snippet": snippet,
                    "source": doc.metadata.get("source", "")
                })

        # Simple confidence based on source count and relevance
        confidence = min(0.95, 0.6 + (len(sources) * 0.08))

        return {
            "answer": answer,
            "sources": sources,
            "confidence": round(confidence, 2)
        }

    def summarize(self, collection_name: str, summary_type: str = "detailed") -> str:
        """Generate document summary."""
        vectorstore = pdf_processor.load_vector_store(collection_name)
        
        # Get all docs for summary
        all_docs = vectorstore.similarity_search("document overview summary", k=20)
        context = "\n\n".join([d.page_content for d in all_docs])[:8000]

        prompt = SUMMARY_PROMPT.format(context=context, summary_type=summary_type)
        response = self.llm.invoke(prompt)
        return response.content

    def generate_quiz(
        self,
        collection_name: str,
        quiz_type: str = "mcq",
        num_questions: int = 5
    ) -> list:
        """Generate quiz questions."""
        import json, re
        vectorstore = pdf_processor.load_vector_store(collection_name)
        docs = vectorstore.similarity_search("main concepts key information", k=15)
        context = "\n\n".join([d.page_content for d in docs])[:6000]

        prompt = QUIZ_PROMPT.format(
            context=context,
            quiz_type=quiz_type,
            num_questions=num_questions
        )
        response = self.llm.invoke(prompt)
        
        try:
            text = response.content
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        return []

    def extract_key_points(self, collection_name: str) -> dict:
        """Extract key points from document."""
        import json, re
        vectorstore = pdf_processor.load_vector_store(collection_name)
        docs = vectorstore.similarity_search("key findings conclusions recommendations", k=15)
        context = "\n\n".join([d.page_content for d in docs])[:6000]

        prompt = KEY_POINTS_PROMPT.format(context=context)
        response = self.llm.invoke(prompt)

        try:
            text = response.content
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        return {
            "main_ideas": [], "key_findings": [],
            "action_items": [], "recommendations": [], "conclusions": []
        }

    def compare_documents(self, collection_names: List[str], question: str) -> str:
        """Compare multiple documents."""
        contexts = []
        for i, name in enumerate(collection_names):
            try:
                vs = pdf_processor.load_vector_store(name)
                docs = vs.similarity_search(question, k=4)
                context = "\n".join([d.page_content for d in docs])
                contexts.append(f"Document {i+1}:\n{context}")
            except Exception:
                contexts.append(f"Document {i+1}: Unable to load")

        combined = "\n\n---\n\n".join(contexts)
        prompt = f"""Compare these documents and answer: {question}

{combined}

Provide a structured comparison with:
1. Similarities
2. Differences
3. Unique aspects of each document
4. Overall conclusion"""

        response = self.llm.invoke(prompt)
        return response.content


rag_chain = RAGChain()
