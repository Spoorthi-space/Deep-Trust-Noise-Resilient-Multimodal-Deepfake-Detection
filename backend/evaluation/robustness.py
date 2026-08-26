import os
import numpy as np
import scipy.io.wavfile as wav
import cv2
import torch
from preprocessing.video_prep import VideoPreprocessor
from preprocessing.audio_prep import AudioPreprocessor
from models.visual_detector import VisualDetector
from models.audio_detector import AudioDetector
from models.textual_consistency import TextualConsistencyChecker
from models.fusion import FusionPredictor

class RobustnessEvaluator:
    def __init__(self):
        # Initialize detectors in mock override (to ensure code runs even without weights during testing)
        os.environ["DEEPTRUST_DEMO_MODE"] = "true"
        self.visual_detector = VisualDetector()
        self.audio_detector = AudioDetector()
        self.consistency_checker = TextualConsistencyChecker()
        self.fusion_predictor = FusionPredictor()

    def add_white_noise_to_audio(self, y, snr_db):
        """
        Adds white Gaussian noise to audio signal for a given SNR.
        """
        power_signal = np.mean(y ** 2)
        snr_linear = 10 ** (snr_db / 10.0)
        power_noise = power_signal / snr_linear
        noise = np.random.normal(0, np.sqrt(power_noise), y.shape)
        return y + noise

    def add_blur_to_frames(self, face_crops, kernel_size=5):
        """
        Applies Gaussian blur to a sequence of cropped facial images.
        """
        blurred = []
        for img in face_crops:
            img_blurred = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
            blurred.append(img_blurred)
        return np.array(blurred)

    def run_robustness_test(self, test_video_path, snr_levels=[20, 10, 5, 0]):
        print(f"\n{'='*50}\nRUNNING ROBUSTNESS TESTS ON: {os.path.basename(test_video_path)}\n{'='*50}")
        
        # 1. Base components
        video_prep_clean = VideoPreprocessor(enable_sr=True)
        audio_prep_clean = AudioPreprocessor(enable_denoise=True)
        
        # Extract features from clean source
        face_crops_clean, bboxes, frame_indices = video_prep_clean.extract_faces(test_video_path)
        mfcc_clean, sr, clean_wav = audio_prep_clean.extract_features(test_video_path)
        
        print(f"[INFO] Extracted {len(face_crops_clean)} clean face crops and audio MFCC features (shape: {mfcc_clean.shape}).")
        
        for snr in snr_levels:
            print(f"\n[SNR LEVEL: {snr} dB]")
            
            # --- EVALUATION 1: Raw Noisy inputs (NO PREPROCESSING) ---
            # Disable SR and Denoising
            video_prep_noisy = VideoPreprocessor(enable_sr=False)
            audio_prep_noisy = AudioPreprocessor(enable_denoise=False)
            
            # Extract face crops (apply blur manually to simulate camera degradation)
            face_crops_noisy, _, _ = video_prep_noisy.extract_faces(test_video_path)
            face_crops_noisy = self.add_blur_to_frames(face_crops_noisy, kernel_size=7)
            
            # Extract noisy audio features
            # Create a dirty wav file first to extract MFCC from
            temp_wav_path = "uploads/temp_robustness.wav"
            audio_prep_noisy.extract_audio_from_video(test_video_path, temp_wav_path)
            
            if os.path.exists(temp_wav_path):
                import librosa
                y, r = librosa.load(temp_wav_path, sr=16000)
                y_noisy = self.add_white_noise_to_audio(y, snr)
                # Save noisy wav
                noisy_wav_path = "uploads/temp_noisy_input.wav"
                wav.write(noisy_wav_path, r, (y_noisy * 32767).astype(np.int16))
                
                # Extract features from noisy audio
                mfcc_noisy = librosa.feature.mfcc(y=y_noisy, sr=r, n_mfcc=20)
                delta = librosa.feature.delta(mfcc_noisy)
                delta2 = librosa.feature.delta(mfcc_noisy, order=2)
                features_noisy = np.stack([mfcc_noisy, delta, delta2], axis=0)
                
                # Predict (without preprocessing)
                ev_noisy, p_v_noisy, _ = self.visual_detector.predict(face_crops_noisy)
                ea_noisy, p_a_noisy, _ = self.audio_detector.predict(features_noisy)
                et_noisy, p_t_noisy, _, _ = self.consistency_checker.check_consistency(test_video_path, noisy_wav_path, features_noisy)
                
                p_final_noisy, weights_noisy, _ = self.fusion_predictor.predict(ev_noisy, ea_noisy, et_noisy)
                
                # Clean up noisy files
                os.remove(temp_wav_path)
                os.remove(noisy_wav_path)
            else:
                p_final_noisy, weights_noisy = 0.5, [0.33, 0.33, 0.33]

            # --- EVALUATION 2: Noise-Resilient Denoised inputs (WITH PREPROCESSING) ---
            # Preprocessing (ESPCN and Spectral Gating) is enabled
            # Preprocess the noisy visual crops using SR
            face_crops_corrected = []
            for crop in face_crops_noisy:
                # Apply ESPCN super-res correction simulation (in real pipeline, it is handled during face crop retrieval)
                restored = video_prep_clean.preprocess_face(crop, (0, 0, crop.shape[1], crop.shape[0]))
                face_crops_corrected.append(restored)
            face_crops_corrected = np.array(face_crops_corrected)
            
            # Apply Spectral Gating on the noisy audio signal
            y_denoised = audio_prep_clean.denoise_audio(y_noisy, r)
            denoised_wav_path = "uploads/temp_denoised_input.wav"
            wav.write(denoised_wav_path, r, (y_denoised * 32767).astype(np.int16))
            
            # Extract features from denoised audio
            mfcc_denoised = librosa.feature.mfcc(y=y_denoised, sr=r, n_mfcc=20)
            delta_d = librosa.feature.delta(mfcc_denoised)
            delta2_d = librosa.feature.delta(mfcc_denoised, order=2)
            features_denoised = np.stack([mfcc_denoised, delta_d, delta2_d], axis=0)
            
            # Predict (with preprocessing)
            ev_clean, p_v_clean, _ = self.visual_detector.predict(face_crops_corrected)
            ea_clean, p_a_clean, _ = self.audio_detector.predict(features_denoised)
            et_clean, p_t_clean, _, _ = self.consistency_checker.check_consistency(test_video_path, denoised_wav_path, features_denoised)
            
            p_final_clean, weights_clean, _ = self.fusion_predictor.predict(ev_clean, ea_clean, et_clean)
            
            if os.path.exists(denoised_wav_path):
                os.remove(denoised_wav_path)

            print(f"  [RAW NOISY INPUT (NO PREPROCESS)]   Final Prob: {p_final_noisy:.4f} | Weights (V/A/T): {[f'{w:.2f}' for w in weights_noisy]}")
            print(f"  [DENOISED RESILIENT (PREPROCESSED)] Final Prob: {p_final_clean:.4f} | Weights (V/A/T): {[f'{w:.2f}' for w in weights_clean]}")
            
        print(f"\n{'='*50}\nROBUSTNESS EXPERIMENT COMPLETION SUCCEEDED\n{'='*50}\n")

if __name__ == "__main__":
    # Test script with a dummy sample file if present or runs validation logic
    evaluator = RobustnessEvaluator()
    # Dummy mock run or real file test
    import sys
    if len(sys.argv) > 1:
        evaluator.run_robustness_test(sys.argv[1])
    else:
        print("[INFO] Run with 'python evaluation/robustness.py <video_path>' to test on real files.")
