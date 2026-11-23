import os
import uuid
import threading
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import digiclip_batch

router = APIRouter(prefix="/api/digiclip", tags=["Digiclip"])

class BatchRequest(BaseModel):
    folder_path: str
    output_dir: Optional[str] = None
    enable_hook: bool = True
    badge_tag: str = "DIGICLIP | VIRAL"
    subtitles: bool = True
    outro_path: Optional[str] = None
    sar_normalize: bool = True

BATCH_JOBS_STORE = {}

@router.get("/scan")
def scan_folder(folder: str):
    if not os.path.exists(folder):
        raise HTTPException(status_code=400, detail="Folder path does not exist on local filesystem")
    res = digiclip_batch.scan_local_folder(folder)
    return res

@router.post("/batch-render")
def start_batch(req: BatchRequest):
    if not os.path.exists(req.folder_path):
        raise HTTPException(status_code=400, detail="Folder path not found")
        
    scan_res = digiclip_batch.scan_local_folder(req.folder_path)
    files = scan_res.get("files", [])
    if not files:
        raise HTTPException(status_code=400, detail="No video files found in folder")
        
    out_dir = req.output_dir or os.path.join(req.folder_path, "Digiclip_Output")
    os.makedirs(out_dir, exist_ok=True)
    
    job_id = f"batch_{uuid.uuid4().hex[:8]}"
    BATCH_JOBS_STORE[job_id] = {
        "id": job_id,
        "status": "processing",
        "total": len(files),
        "current_index": 0,
        "current_file": files[0]["filename"],
        "completed": [],
        "errors": []
    }
    
    def run_worker():
        try:
            from faster_whisper import WhisperModel
            whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        except Exception as e:
            whisper_model = None
            
        opts = {
            "output_dir": out_dir,
            "enable_hook": req.enable_hook,
            "badge_tag": req.badge_tag,
            "subtitles": req.subtitles,
            "whisper_model": whisper_model,
            "sar_normalize": req.sar_normalize
        }
        
        for idx, item in enumerate(files):
            BATCH_JOBS_STORE[job_id]["current_index"] = idx + 1
            BATCH_JOBS_STORE[job_id]["current_file"] = item["filename"]
            try:
                out_path = digiclip_batch.render_single_file(item, job_id, opts)
                BATCH_JOBS_STORE[job_id]["completed"].append({
                    "original": item["filename"],
                    "output_path": out_path,
                    "filename": os.path.basename(out_path)
                })
            except Exception as e:
                BATCH_JOBS_STORE[job_id]["errors"].append({
                    "filename": item["filename"],
                    "error": str(e)
                })
                
        BATCH_JOBS_STORE[job_id]["status"] = "completed"
        
    t = threading.Thread(target=run_worker, daemon=True)
    t.start()
    
    return {
        "job_id": job_id,
        "status": "processing",
        "total_files": len(files),
        "output_dir": out_dir
    }

@router.get("/batch-status/{job_id}")
def get_batch_status(job_id: str):
    if job_id not in BATCH_JOBS_STORE:
        raise HTTPException(status_code=404, detail="Batch job not found")
    return BATCH_JOBS_STORE[job_id]
