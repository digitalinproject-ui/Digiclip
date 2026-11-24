# Digiclip 🎬⚡
**Smart AI Video Clipper & Batch Shorts Studio (Open-Source)**

Turn long videos and raw podcast folders into viral 9:16 vertical Shorts, TikToks, and Reels with AI captions, 5-second dynamic viral hooks, and 1-click batch folder automation.

---

## ✨ Killer Features

### 1. 📂 Local Batch Studio (Folder-to-Clips Automation)
Stop uploading videos one by one. With **Digiclip Batch Studio**, point to any local folder (e.g. `E:\Downloads\Podcast`), scan all video files, and render full vertical clips with burned subtitles in parallel automatically.

### 2. 🎣 Auto 5-Second Viral Hook Overlay
Grab viewer attention instantly. Digiclip generates sleek glassmorphic top banners during the first 0–5 seconds of each video to drastically reduce swipe-away rates on TikTok, Instagram Reels, and YouTube Shorts.

### 3. 📱 Guaranteed 9:16 SAR 1:1 Normalizer
Eliminates anamorphic stretch bugs. Every exported video is guaranteed to have clean `1080x1920 [SAR 1:1 DAR 9:16]` encoding, ensuring pixel-perfect display across WhatsApp, TikTok, Instagram, and YouTube.

### 4. 🎙️ Faster-Whisper Dynamic Subtitles (Safe-Zone Aware)
Burn-in high-contrast, word-timed subtitles with keyword highlights (Viral Yellow / Electric Cyan). Placed in the lower-third safe zone so text never gets obscured by TikTok's like/comment buttons or captions.

### 5. 🪟 100% Windows Native Support
Zero Docker or Linux WSL friction required. Runs natively on Windows with 1-click launcher (`start.bat`).

---

## 🚀 Quick Start (Windows)

### Prerequisites
- Python 3.10+
- FFmpeg installed and available in PATH
- Node.js 18+

### 1. Clone your repository
```bash
git clone https://github.com/digitalinproject-ui/Digiclip.git
cd Digiclip
```

### 2. Install Dependencies
```bash
# Backend virtual environment
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
pip install faster-whisper Pillow

# Frontend
cd dashboard
npm install
npm run build
cd ..
```

### 3. Launch Digiclip
Double click `start.bat` or run:
```powershell
.\start.bat
```
Open your browser at `http://localhost:5175`.

---

## 🎨 Minimalist Apple-Inspired Design
Designed with clean visual hierarchy, dark glassmorphism surfaces, subtle micro-borders, and high-contrast typography for a distraction-free editing workflow.

---

## 📄 License & Attribution
Digiclip is released under the **MIT License**.  
*Based on OpenShorts by mutonby (Licensed under MIT).*
