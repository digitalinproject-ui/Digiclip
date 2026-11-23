import os
import re
import glob
import json
import time
import uuid
import threading
import subprocess
from PIL import Image, ImageDraw, ImageFont

# In-memory job tracker for batch jobs
BATCH_JOBS = {}

def scan_local_folder(folder_path):
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return {"error": "Folder not found"}
        
    patterns = ["*.mp4", "*.mov", "*.mkv", "*.webm"]
    files = []
    for pat in patterns:
        files.extend(glob.glob(os.path.join(folder_path, pat)))
        files.extend(glob.glob(os.path.join(folder_path, pat.upper())))
        
    files = sorted(list(set(files)))
    results = []
    for f in files:
        base = os.path.basename(f)
        size_mb = round(os.path.getsize(f) / (1024 * 1024), 2)
        # Probe duration & resolution
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration:stream=width,height",
            "-of", "json", f
        ]
        duration = 0
        res = "Unknown"
        try:
            p = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
            if p.returncode == 0:
                data = json.loads(p.stdout)
                duration = round(float(data.get("format", {}).get("duration", 0)), 1)
                streams = data.get("streams", [])
                if streams:
                    w = streams[0].get("width")
                    h = streams[0].get("height")
                    if w and h:
                        res = f"{w}x{h}"
        except Exception:
            pass
            
        results.append({
            "path": f,
            "filename": base,
            "size_mb": size_mb,
            "duration": duration,
            "resolution": res
        })
        
    return {
        "folder": folder_path,
        "count": len(results),
        "files": results
    }

def create_apple_hook_badge(hook_text, output_path, badge_tag="DIGICLIP | VIRAL"):
    W, H = 960, 240
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_bold_path = r"C:\Windows\Fonts\segoeuib.ttf"
    if not os.path.exists(font_bold_path):
        font_bold_path = r"C:\Windows\Fonts\arialbd.ttf"
        
    tag_font = ImageFont.truetype(font_bold_path, 24)
    hook_font = ImageFont.truetype(font_bold_path, 40)
    
    # Apple Glassmorphism Card Style
    # Deep obsidian background with electric blue #0000fb brand border
    radius = 28
    card_box = [8, 8, W - 8, H - 8]
    draw.rounded_rectangle(card_box, radius=radius, fill=(10, 12, 18, 245), outline=(0, 0, 251, 240), width=3)
    
    # Refined Pill Tag with brand primary blue #0000fb
    tag_text = f"  {badge_tag.upper()}  "
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = 38
    tag_x = (W - tag_w) // 2
    tag_y = 22
    draw.rounded_rectangle([tag_x, tag_y, tag_x + tag_w, tag_y + tag_h], radius=12, fill=(0, 0, 251, 255))
    draw.text((tag_x + 12, tag_y + 5), tag_text, fill=(255, 255, 255, 255), font=tag_font)
    
    # Text wrapping
    words = hook_text.split()
    lines = []
    curr_line = []
    max_w = W - 80
    
    for word in words:
        test_line = " ".join(curr_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=hook_font)
        if bbox[2] - bbox[0] <= max_w:
            curr_line.append(word)
        else:
            if curr_line:
                lines.append(" ".join(curr_line))
            curr_line = [word]
    if curr_line:
        lines.append(" ".join(curr_line))
        
    total_text_h = len(lines) * 52
    start_y = tag_y + tag_h + 16 + max(0, (H - 12 - (tag_y + tag_h + 16) - total_text_h) // 2)
    for idx, line in enumerate(lines):
        line_bbox = draw.textbbox((0, 0), line, font=hook_font)
        lw = line_bbox[2] - line_bbox[0]
        lx = (W - lw) // 2
        ly = start_y + idx * 52
        draw.text((lx + 2, ly + 2), line, fill=(0, 0, 0, 210), font=hook_font)
        draw.text((lx, ly), line, fill=(245, 245, 247, 255), font=hook_font)
        
    img.save(output_path, "PNG")

def format_ass_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"

def render_single_file(item, job_id, options):
    input_path = item["path"]
    output_dir = options.get("output_dir")
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    out_file = os.path.join(output_dir, f"digiclip_{base_name}.mp4")
    
    # 1. Faster-Whisper transcription
    from faster_whisper import WhisperModel
    model = options.get("whisper_model")
    
    segments, info = model.transcribe(input_path, language="id", word_timestamps=True)
    all_words = []
    for s in segments:
        for w in s.words:
            word = w.word.strip()
            if word:
                all_words.append({"word": word, "start": w.start, "end": w.end})
                
    # Subtitle chunks
    chunks = []
    curr = []
    c_start = 0.0
    for w in all_words:
        if not curr:
            c_start = w["start"]
        curr.append(w)
        if len(curr) >= 4 or (w["end"] - c_start) >= 2.0:
            chunks.append({
                "start": c_start,
                "end": w["end"] + 0.1,
                "text": " ".join([x["word"] for x in curr]).upper()
            })
            curr = []
    if curr:
        chunks.append({
            "start": c_start,
            "end": curr[-1]["end"] + 0.1,
            "text": " ".join([x["word"] for x in curr]).upper()
        })
        
    ass_path = os.path.join(output_dir, f"temp_{uuid.uuid4().hex[:6]}.ass")
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,2,2,40,40,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for c in chunks:
        s_str = format_ass_time(c["start"])
        e_str = format_ass_time(c["end"])
        text = c["text"]
        # Highlight
        text = re.sub(r"\b(KOL\.ID|KOL|RATE CARD|RP|JUTA|BRAND)\b", r"{\\c&H00FFFF&}\1{\\c&HFFFFFF&}", text)
        events.append(f"Dialogue: 0,{s_str},{e_str},Default,,0,0,0,,{text}")
        
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_header + "\n".join(events) + "\n")
        
    # Hook badge
    hook_text = options.get("hook_text") or (chunks[0]["text"] if chunks else "VIRAL MOMENT")
    hook_badge_path = os.path.join(output_dir, f"temp_badge_{uuid.uuid4().hex[:6]}.png")
    create_apple_hook_badge(hook_text, hook_badge_path, badge_tag=options.get("badge_tag", "DIGICLIP | VIRAL"))
    
    # FFmpeg command
    ass_filter = ass_path.replace("\\", "/").replace(":", "\\:")
    filter_complex = f"[0:v][1:v]overlay=(W-w)/2:220:enable='between(t,0,5)'[vhook];[vhook]ass='{ass_filter}':fontsdir='C\\:/Windows/Fonts'[vsub];[vsub]setsar=1[vout]"
    
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-i", hook_badge_path,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-aspect", "9:16",
        out_file
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Clean up temp
    for temp_p in [ass_path, hook_badge_path]:
        if os.path.exists(temp_p):
            try: os.remove(temp_p)
            except: pass
            
    if res.returncode == 0:
        return out_file
    else:
        raise Exception(f"FFmpeg error: {res.stderr[-300:]}")
