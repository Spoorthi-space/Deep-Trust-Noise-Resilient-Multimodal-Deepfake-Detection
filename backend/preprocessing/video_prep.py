import os
import cv2
import numpy as np

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "weights")

class VideoPreprocessor:
    def __init__(self, enable_sr=True):
        self.enable_sr = enable_sr
        self.sr = None
        self.face_cascade = None
        
        # Initialize OpenCV Super-Resolution (ESPCN)
        if self.enable_sr:
            sr_weights = os.path.join(WEIGHTS_DIR, "ESPCN_x4.pb")
            if os.path.exists(sr_weights):
                try:
                    self.sr = cv2.dnn_superres.DnnSuperResImpl_create()
                    self.sr.readModel(sr_weights)
                    self.sr.setModel("espcn", 4)
                    print("[INFO] ESPCN Super-Resolution initialized successfully.")
                except Exception as e:
                    print(f"[WARNING] Failed to initialize ESPCN Super-Resolution: {e}. Falling back to Bicubic.")
            else:
                print(f"[WARNING] ESPCN weights not found at {sr_weights}. Falling back to Bicubic interpolation.")
        
        # Load Haar Cascade as a lightweight local fallback for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def detect_face(self, frame):
        """
        Detects faces using Haar Cascade with 320px frame downscaling for 20x faster CPU execution.
        Returns coordinates (x, y, w, h) of the largest face rescaled to original frame dimensions, or None.
        """
        h, w = frame.shape[:2]
        if h == 0 or w == 0:
            return None
        scale = 320.0 / max(h, w)
        small_w = max(1, int(w * scale))
        small_h = max(1, int(h * scale))
        small_frame = cv2.resize(frame, (small_w, small_h))
        gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
        
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4, minSize=(20, 20))
        if len(faces) == 0:
            return None
        
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        x, y, fw, fh = largest_face
        orig_x = int(x / scale)
        orig_y = int(y / scale)
        orig_w = int(fw / scale)
        orig_h = int(fh / scale)
        return (orig_x, orig_y, orig_w, orig_h)

    def preprocess_face(self, frame, bbox):
        """
        Crops, applies Super-Resolution (if enabled), and resizes the face bounding box to 224x224.
        """
        x, y, w, h = bbox
        # Add a small padding around the face crop
        pad_w = int(w * 0.1)
        pad_h = int(h * 0.1)
        
        img_h, img_w = frame.shape[:2]
        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(img_w, x + w + pad_w)
        y2 = min(img_h, y + h + pad_h)
        
        cropped = frame[y1:y2, x1:x2]
        if cropped.size == 0:
            return None

        # Apply Super Resolution (ESPCN) if enabled and loaded
        if self.enable_sr and self.sr is not None:
            try:
                # ESPCN works best on smaller, low-res inputs; it outputs a 4x upscaled frame
                upscaled = self.sr.upsample(cropped)
                # Resize to standard input shape for EfficientNet (224x224)
                processed = cv2.resize(upscaled, (224, 224), interpolation=cv2.INTER_AREA)
            except Exception as e:
                # Fallback to standard CUBIC interpolation
                processed = cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_CUBIC)
        else:
            processed = cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_CUBIC)
            
        return processed

    def extract_faces(self, video_path, max_frames=30):
        """
        Decodes video frames, detects faces, crops, preprocesses, and returns a batch of face crops.
        Also returns a list of bboxes and a list of processed frame indices for visualization / Grad-CAM.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[ERROR] Could not open video: {video_path}")
            return [], [], []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, total_frames // max_frames)
        
        face_crops = []
        bboxes = []
        frame_indices = []
        
        count = 0
        while cap.isOpened() and len(face_crops) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            if count % frame_interval == 0:
                bbox = self.detect_face(frame)
                if bbox is not None:
                    face_img = self.preprocess_face(frame, bbox)
                    if face_img is not None:
                        face_crops.append(face_img)
                        bboxes.append(bbox)
                        frame_indices.append(count)
            count += 1
            
        cap.release()
        return np.array(face_crops), bboxes, frame_indices

    def extract_faces_from_image(self, img):
        """
        Processes a single static image through the same face detection
        and ESPCN Super-Resolution pipeline used for video frames.
        Returns (face_crops_array, bboxes, frame_indices) for API compatibility.
        """
        if img is None:
            return np.zeros((0, 224, 224, 3), dtype=np.uint8), [], []

        bbox = self.detect_face(img)
        if bbox is None:
            # No face detected — resize full image to 224x224 as fallback
            processed = cv2.resize(img, (224, 224), interpolation=cv2.INTER_CUBIC)
            return np.array([processed]), [None], [0]

        face_img = self.preprocess_face(img, bbox)
        if face_img is None:
            processed = cv2.resize(img, (224, 224), interpolation=cv2.INTER_CUBIC)
            return np.array([processed]), [bbox], [0]

        return np.array([face_img]), [bbox], [0]
