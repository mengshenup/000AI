import sys
import os
import re

def validate_file(file_path):
    """
    Validates that every non-empty line in the file has a comment.
    Supports Python (#), JS/TS/C/CPP (//), Batch (REM).
    Handles Python Docstrings (triple-quotes) and C-style block comments (/* */) by skipping content inside them.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    # Define comment markers
    inline_markers = {
        '.py': '#',
        '.js': '//',
        '.ts': '//',
        '.c': '//',
        '.cpp': '//',
        '.h': '//',
        '.java': '//',
        '.bat': 'REM',
        '.cmd': 'REM',
        '.sh': '#'
    }
    
    # Define block comment delimiters (Start, End)
    # For Python, we treat triple quotes as block delimiters for simplicity
    block_markers = {
        '.py': ['"""', "'''"],
        '.js': [('/*', '*/')],
        '.ts': [('/*', '*/')],
        '.c': [('/*', '*/')],
        '.cpp': [('/*', '*/')],
        '.h': [('/*', '*/')],
        '.java': [('/*', '*/')]
    }

    if ext not in inline_markers:
        print(f"⚠️  Skipping validation for unsupported file type: {ext}")
        return True

    marker = inline_markers[ext]
    file_block_markers = block_markers.get(ext, [])
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='gbk') as f:
                lines = f.readlines()
        except:
            print(f"❌ Could not read file {file_path}")
            return False

    missing_lines = []
    in_block = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # 1. Skip empty lines
        if not stripped:
            continue
            
        # 2. Handle Block Logic
        # Python Triple Quotes (Toggle Logic)
        if ext == '.py':
            # Count occurrences of triple quotes
            # This is a heuristic; it doesn't handle escaped quotes, but good enough for strict annotation checks
            # We check both types of triple quotes
            for quote_type in ['"""', "'''"]:
                count = line.count(quote_type)
                if count % 2 == 1:
                    in_block = not in_block
                    # If we just started a block, or ended one, does this line need a comment?
                    # If we are inside a block (or just started it), we consider it "annotated" by virtue of being data/docstring.
                    # This allows: query = """ (PASS)
                    # And: """ (PASS)
            
            if in_block:
                continue
                
            # If we just ended a block on this line (in_block became False), we still pass this line
            # But wait, if line is `"""`, count is 1. in_block toggles.
            # If it was False, it becomes True. We continue.
            # If it was True, it becomes False. We fall through to check for '#'.
            # So `"""` (end) would fail if no `#`.
            # Let's refine: If the line contains a quote that affects state, we pass it.
            if any(q in line for q in ['"""', "'''"]):
                continue

        # C-style Block Comments (Start/End Logic)
        elif ext in ['.js', '.ts', '.c', '.cpp', '.h', '.java']:
            start_marker, end_marker = '/*', '*/'
            
            # Check for inline block /* ... */
            if start_marker in line and end_marker in line:
                # If the whole line is a comment, pass.
                # If code exists, we still need to check if it's commented?
                # For simplicity, if it has /* */, it passes.
                continue
            
            if start_marker in line:
                in_block = True
                continue
            
            if in_block:
                if end_marker in line:
                    in_block = False
                continue

        # 3. Check for Inline Marker
        # For Batch, REM must be at start (case insensitive) or after '&'
        if ext in ['.bat', '.cmd']:
            upper_line = line.upper()
            # Check start of line
            if stripped.upper().startswith('REM'):
                continue
            
            # Check for inline REM (must be after &)
            if '&' in upper_line:
                parts = upper_line.split('&')
                # Check if any part (after the first one) starts with REM
                # Actually, any part could be REM. 
                # e.g. "cls & REM Clear" -> parts=["CLS ", " REM CLEAR"]
                if any(p.strip().startswith('REM') for p in parts):
                    continue
            
            # If neither, fail
            missing_lines.append(i + 1)
        else:
            if marker not in line:
                missing_lines.append(i + 1)

    if missing_lines:
        print(f"❌ Annotation Validation Failed for {os.path.basename(file_path)}")
        print(f"   Missing annotations on lines: {missing_lines}")
        print(f"   Rule: Every line must contain '{marker}' or be inside a block comment.")
        return False

    print(f"✅ Annotation Validation Passed for {os.path.basename(file_path)}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_annotation.py <file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
        
    if not validate_file(file_path):
        sys.exit(1)
    
    sys.exit(0)
