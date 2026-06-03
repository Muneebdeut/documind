import os
import json
import re
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from app.config import settings


class PDFProcessor:
    def __init__(self):
        # Lazy-loaded to avoid crashing at import time
        self._embeddings = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

    @property
    def embeddings(self):
        """Lazy-initialize the embedding model on first use."""
        if self._embeddings is None:
            from langchain_community.embeddings import SentenceTransformerEmbeddings
            self._embeddings = SentenceTransformerEmbeddings(
                model_name=settings.EMBEDDING_MODEL
            )
        return self._embeddings

    def load_and_split(self, file_path: str) -> List[Document]:
        """Load PDF and split into chunks."""
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        chunks = self.text_splitter.split_documents(pages)
        return chunks

    def create_vector_store(self, chunks: List[Document], collection_name: str) -> Chroma:
        """Create ChromaDB vector store from chunks."""
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            collection_name=collection_name,
            persist_directory=settings.CHROMA_PERSIST_DIR
        )
        return vectorstore

    def load_vector_store(self, collection_name: str) -> Chroma:
        """Load existing ChromaDB vector store."""
        return Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=settings.CHROMA_PERSIST_DIR
        )

    def get_document_stats(self, file_path: str) -> dict:
        """Extract document statistics."""
        loader = PyPDFLoader(file_path)
        pages = loader.load()

        total_pages = len(pages)
        total_words = sum(len(page.page_content.split()) for page in pages)
        reading_time = round(total_words / 200, 1)  # ~200 wpm average

        # Extract keywords (simple frequency-based)
        all_text = " ".join([p.page_content for p in pages])
        keywords = self._extract_keywords(all_text)

        return {
            "total_pages": total_pages,
            "total_words": total_words,
            "reading_time_minutes": reading_time,
            "keywords": keywords
        }

    def _extract_keywords(self, text: str, top_n: int = 15) -> List[str]:
        """Simple keyword extraction."""
        words = re.findall(r'\b[A-Za-z]{4,}\b', text.lower())
        stopwords = {"this", "that", "with", "have", "will", "from", "they", "been",
                     "were", "said", "each", "which", "their", "there", "what", "about",
                     "would", "these", "other", "into", "more", "also", "some"}
        filtered = [w for w in words if w not in stopwords]
        freq = {}
        for w in filtered:
            freq[w] = freq.get(w, 0) + 1
        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [w for w, _ in sorted_words[:top_n]]

    def process_pdf(self, file_path: str, document_id: str) -> dict:
        """Full pipeline: load, split, embed, store."""
        collection_name = f"doc_{document_id}"
        chunks = self.load_and_split(file_path)
        self.create_vector_store(chunks, collection_name)
        stats = self.get_document_stats(file_path)
        return {
            "collection_name": collection_name,
            "num_chunks": len(chunks),
            **stats
        }

    def delete_collection(self, collection_name: str):
        """Delete a ChromaDB collection."""
        try:
            vs = self.load_vector_store(collection_name)
            vs.delete_collection()
        except Exception:
            pass


# Module-level singleton — instantiation is safe now (no heavy work in __init__)
pdf_processor = PDFProcessor()
