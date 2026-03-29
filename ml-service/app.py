"""
Spectra Guard — ML Inference Microservice
FastAPI server wrapping YOLOv8 for image and video processing.
"""

import os
import uuid
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="Spectra Guard ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "temp_outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load YOLO model (auto-downloads yolov8n.pt on first run)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "yolov8n.pt")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
model = YOLO(MODEL_PATH)

# Classification rules
INTRUSION_CLASSES = {"person"}
AUTHORIZED_CLASSES = {
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant",
    "bear", "zebra", "giraffe", "car", "truck", "bus", "motorcycle",
    "bicycle", "boat", "airplane", "train"
}

# Colors (BGR for OpenCV)
COLOR_INTRUSION = (0, 0, 255)      # Red
COLOR_AUTHORIZED = (0, 255, 65)    # Neon Green
COLOR_UNKNOWN = (0, 191, 255)      # Amber


def classify_detection(class_name: str) -> tuple:
    """Classify a detection as INTRUSION, AUTHORIZED, or UNKNOWN."""
    name = class_name.lower()
    if name in INTRUSION_CLASSES:
        return "INTRUSION", COLOR_INTRUSION
    elif name in AUTHORIZED_CLASSES:
        return "AUTHORIZED", COLOR_AUTHORIZED
    else:
        return "UNKNOWN", COLOR_UNKNOWN


def process_frame(frame, detections_list: list, source: str = "image"):
    """Run YOLO on a single frame, draw boxes, collect detections."""
    results = model(frame, verbose=False)

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            status, color = classify_detection(class_name)

            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Label
            label = f"{class_name} {conf:.2f} [{status}]"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), (x1 + label_size[0], y1), color, -1)
            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            detections_list.append({
                "object_class": class_name,
                "confidence": round(conf, 4),
                "status": status,
                "source": source,
                "bbox": [x1, y1, x2, y2]
            })

    return frame


@app.post("/process-image")
async def process_image(file: UploadFile = File(...)):
    """Process a single image through YOLOv8."""
    # Save uploaded file
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_annotated{ext}")

    contents = await file.read()
    with open(input_path, "wb") as f:
        f.write(contents)

    # Read and process
    frame = cv2.imread(input_path)
    if frame is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image file"})

    detections = []
    annotated = process_frame(frame, detections, source="image")

    # Save annotated image
    cv2.imwrite(output_path, annotated)

    # Cleanup input
    os.remove(input_path)

    return JSONResponse(content={
        "annotated_file": f"{file_id}_annotated{ext}",
        "detections": detections,
        "total_detections": len(detections)
    })


@app.get("/outputs/{filename}")
async def get_output_file(filename: str):
    """Serve an annotated output file."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(filepath)


@app.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    """Process a video file through YOLOv8 frame-by-frame."""
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_annotated.mp4")

    contents = await file.read()
    with open(input_path, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        return JSONResponse(status_code=400, content={"error": "Invalid video file"})

    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    all_detections = []
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_detections = []
        annotated = process_frame(frame, frame_detections, source="video")
        writer.write(annotated)

        for det in frame_detections:
            det["frame"] = frame_count
        all_detections.extend(frame_detections)
        frame_count += 1

    cap.release()
    writer.release()
    os.remove(input_path)

    return JSONResponse(content={
        "annotated_file": f"{file_id}_annotated.mp4",
        "detections": all_detections,
        "total_detections": len(all_detections),
        "frames_processed": frame_count
    })


@app.get("/health")
async def health_check():
    return {"status": "operational", "model": "yolov8n"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
