import re, zlib

def extract_text_from_pdf_bytes(pdf_bytes):
    text_parts = []
    raw = pdf_bytes.decode('latin-1', errors='replace')
    stream_pattern = re.compile(r'stream\r?\n(.*?)\r?\nendstream', re.DOTALL)
    for match in stream_pattern.finditer(raw):
        stream_data = match.group(1).encode('latin-1')
        try:
            decompressed = zlib.decompress(stream_data)
            decoded = decompressed.decode('utf-8', errors='replace')
            text_parts.append(decoded)
        except Exception:
            try:
                text_parts.append(stream_data.decode('utf-8', errors='replace'))
            except Exception:
                pass
    combined = '\n'.join(text_parts)
    tj_pattern = re.compile(r'\(([^)]{1,300})\)\s*(?:Tj|\'|")')
    all_strings = tj_pattern.findall(combined) + tj_pattern.findall(raw)
    cleaned = []
    for s in all_strings:
        s = s.replace('\\n',' ').replace('\\r',' ').replace('\\t',' ')
        s = re.sub(r'\\[0-9]{3}',' ',s)
        s = re.sub(r'\\(.)',r'\1',s).strip()
        if len(s)>2: cleaned.append(s)
    result = ' '.join(cleaned)
    if len(result.strip())<50:
        result = "PDF text extraction limited. Please paste resume text for best results."
    return result
