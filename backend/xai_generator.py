import os
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg') # Non-interactive backend to prevent UI thread issues
import matplotlib.pyplot as plt
import librosa.display

class XAIGenerator:
    def __init__(self, output_dir="uploads"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_visual_heatmap_video(self, video_path, face_crops, bboxes, frame_indices, visual_detector, filename_prefix="visual_xai"):
        """
        Generates a Grad-CAM video overlay. For frames analyzed by the visual detector,
        it projects the Grad-CAM heatmap onto the face box.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
            
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        output_path = os.path.join(self.output_dir, f"{filename_prefix}_overlay.mp4")
        
        # Define video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        count = 0
        analysis_map = {idx: i for i, idx in enumerate(frame_indices)}
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # If this frame was analyzed, overlay the Grad-CAM heatmap
            if count in analysis_map:
                crop_idx = analysis_map[count]
                bbox = bboxes[crop_idx]
                x, y, w, h = bbox
                
                # Get heatmap from visual detector (224, 224)
                cam = visual_detector.generate_gradcam(face_crops, crop_idx)
                
                # Resize heatmap back to face crop box
                cam_resized = cv2.resize(cam, (w, h))
                heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
                
                # Add padding crop mask
                pad_w = int(w * 0.1)
                pad_h = int(h * 0.1)
                x1 = max(0, x - pad_w)
                y1 = max(0, y - pad_h)
                x2 = min(width, x + w + pad_w)
                y2 = min(height, y + h + pad_h)
                
                # Align heatmap to padding boundaries
                cam_padded = cv2.resize(cam, (x2 - x1, y2 - y1))
                heatmap_padded = cv2.applyColorMap(np.uint8(255 * cam_padded), cv2.COLORMAP_JET)
                
                # Blend original frame with heatmap
                overlay = frame.copy()
                overlay[y1:y2, x1:x2] = cv2.addWeighted(frame[y1:y2, x1:x2], 0.6, heatmap_padded, 0.4, 0)
                
                # Draw bounding box
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(overlay, "Anomaly Region", (x1, max(15, y1 - 5)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
                frame_to_write = overlay
            else:
                frame_to_write = frame
                
            out.write(frame_to_write)
            count += 1
            
        cap.release()
        out.release()
        return output_path

    def generate_audio_heatmap(self, mfcc_features, audio_detector, filename_prefix="audio_xai"):
        """
        Plots the spectrogram (MFCCs) and overlays the frame-level deepfake anomaly activation scores.
        """
        # mfcc_features shape: (3, 20, T)
        # We plot the base MFCC channel: (20, T)
        mfcc_base = mfcc_features[0] 
        T = mfcc_base.shape[1]
        
        # Get frame contribution scores from detector
        anomaly_scores = audio_detector.generate_explanation_spectrum(mfcc_features)
        
        plt.figure(figsize=(10, 5))
        
        # Plot spectrogram
        plt.subplot(2, 1, 1)
        librosa.display.specshow(mfcc_base, x_axis='time', cmap='viridis')
        plt.title('Audio Feature Spectrogram (MFCC)')
        plt.colorbar(format='%+2.0f dB')
        
        # Plot Anomaly curve aligned in time
        plt.subplot(2, 1, 2)
        time_axis = np.linspace(0, T * (512 / 16000), T) # hop_length=512, sr=16000
        plt.plot(time_axis, anomaly_scores, color='red', linewidth=2, label='Synthetic Signature Anomaly')
        plt.fill_between(time_axis, anomaly_scores, color='red', alpha=0.15)
        plt.xlabel('Time (s)')
        plt.ylabel('Activation Strength')
        plt.ylim(0, 1.1)
        plt.legend(loc='upper right')
        plt.grid(True, linestyle='--')
        
        plt.tight_layout()
        output_path = os.path.join(self.output_dir, f"{filename_prefix}_spectrum.png")
        plt.savefig(output_path, dpi=150)
        plt.close()
        
        return output_path

    def generate_visual_heatmap_image(self, img, face_crops, bboxes, visual_detector, filename_prefix="visual_xai"):
        """
        Generates a static visual Grad-CAM heatmap overlay for single image uploads.
        """
        if img is None:
            return None
            
        height, width = img.shape[:2]
        output_path = os.path.join(self.output_dir, f"{filename_prefix}_overlay.jpg")
        
        # If no face was detected and we used full image resize as fallback
        if len(bboxes) == 0 or bboxes[0] is None:
            # Generate full frame Grad-CAM
            cam = visual_detector.generate_gradcam(face_crops, 0)
            cam_resized = cv2.resize(cam, (width, height))
            heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
            overlay = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)
            cv2.imwrite(output_path, overlay)
            return output_path
            
        # Draw on face bounding box
        bbox = bboxes[0]
        x, y, w, h = bbox
        
        cam = visual_detector.generate_gradcam(face_crops, 0)
        
        pad_w = int(w * 0.1)
        pad_h = int(h * 0.1)
        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(width, x + w + pad_w)
        y2 = min(height, y + h + pad_h)
        
        cam_padded = cv2.resize(cam, (x2 - x1, y2 - y1))
        heatmap_padded = cv2.applyColorMap(np.uint8(255 * cam_padded), cv2.COLORMAP_JET)
        
        overlay = img.copy()
        overlay[y1:y2, x1:x2] = cv2.addWeighted(img[y1:y2, x1:x2], 0.6, heatmap_padded, 0.4, 0)
        
        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(overlay, "Anomaly Region", (x1, max(15, y1 - 5)), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
                    
        cv2.imwrite(output_path, overlay)
        return output_path

