#!/usr/bin/env python3
"""Analyze project lines of code and file sizes."""

import os
from pathlib import Path
from collections import defaultdict

# Directories to skip
SKIP_DIRS = {
    '.git', 'node_modules', '.nuxt', '.output', 'data',
    '__pycache__', '.venv', 'dist', 'build'
}

# File extensions to analyze
CODE_EXTENSIONS = {
    '.ts': 'TypeScript',
    '.vue': 'Vue',
    '.js': 'JavaScript',
    '.css': 'CSS',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.sh': 'Shell',
    '.html': 'HTML',
    '.py': 'Python',
}

def format_size(size_bytes: int) -> str:
    """Format bytes to human readable size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"

def count_lines(file_path: Path) -> int:
    """Count lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def analyze_project(root_dir: str) -> dict:
    """Analyze project files."""
    stats = defaultdict(lambda: {'files': 0, 'lines': 0, 'size': 0})
    total_files = 0
    total_lines = 0
    total_size = 0

    root = Path(root_dir)

    for path in root.rglob('*'):
        # Skip directories in SKIP_DIRS
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue

        if path.is_file():
            ext = path.suffix.lower()
            size = path.stat().st_size

            # Get language name or use extension
            lang = CODE_EXTENSIONS.get(ext, None)

            if lang:
                lines = count_lines(path)
                stats[lang]['files'] += 1
                stats[lang]['lines'] += lines
                stats[lang]['size'] += size
                total_files += 1
                total_lines += lines
                total_size += size

    return {
        'by_language': dict(stats),
        'total_files': total_files,
        'total_lines': total_lines,
        'total_size': total_size
    }

def main():
    root_dir = Path(__file__).parent
    print(f"\n{'='*60}")
    print(f"  Project Analysis: {root_dir.name}")
    print(f"{'='*60}\n")

    results = analyze_project(str(root_dir))

    # Sort by lines of code
    sorted_langs = sorted(
        results['by_language'].items(),
        key=lambda x: x[1]['lines'],
        reverse=True
    )

    # Print table header
    print(f"{'Language':<15} {'Files':>8} {'Lines':>10} {'Size':>12}")
    print(f"{'-'*15} {'-'*8} {'-'*10} {'-'*12}")

    for lang, data in sorted_langs:
        print(f"{lang:<15} {data['files']:>8} {data['lines']:>10,} {format_size(data['size']):>12}")

    print(f"{'-'*15} {'-'*8} {'-'*10} {'-'*12}")
    print(f"{'TOTAL':<15} {results['total_files']:>8} {results['total_lines']:>10,} {format_size(results['total_size']):>12}")

    print(f"\n{'='*60}\n")

    # Top 10 largest files
    print("Top 10 Largest Code Files:")
    print(f"{'-'*60}")

    files_with_size = []
    for path in root_dir.rglob('*'):
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue
        if path.is_file() and path.suffix.lower() in CODE_EXTENSIONS:
            files_with_size.append((path, path.stat().st_size, count_lines(path)))

    files_with_size.sort(key=lambda x: x[1], reverse=True)

    for path, size, lines in files_with_size[:10]:
        rel_path = path.relative_to(root_dir)
        print(f"  {str(rel_path):<45} {lines:>6} lines  {format_size(size):>8}")

    print()

if __name__ == '__main__':
    main()
