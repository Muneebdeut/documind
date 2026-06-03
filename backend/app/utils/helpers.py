import os
import re
import hashlib
from datetime import datetime
from typing import Optional


def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from filename."""
    name, ext = os.path.splitext(filename)
    name = re.sub(r'[^\w\-_]', '_', name)
    return f"{name[:100]}{ext}"


def format_file_size(size_bytes: int) -> str:
    """Human-readable file size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def file_hash(file_path: str) -> str:
    """SHA-256 hash of file contents."""
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def estimate_reading_time(word_count: int, wpm: int = 200) -> float:
    """Estimate reading time in minutes."""
    return round(word_count / wpm, 1)


def truncate_text(text: str, max_chars: int = 500) -> str:
    """Truncate text with ellipsis."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(' ', 1)[0] + '...'


def extract_page_number(metadata: dict) -> int:
    """Extract page number from LangChain doc metadata."""
    page = metadata.get('page', 0)
    return int(page) + 1 if isinstance(page, (int, float)) else 1
