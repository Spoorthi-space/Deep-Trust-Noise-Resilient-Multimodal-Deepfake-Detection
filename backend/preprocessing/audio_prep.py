import os
import subprocess
import numpy as np
import scipy.io.wavfile as wav
import librosa

# Try importing noisereduce, or prepare custom numpy spectral gating fallback
try:
    import noisereduce as nr
    NOISEREDUCE_AVAILABLE = True
except ImportError:
    NOISEREDUCE_AVAILABLE = False

class AudioPreprocessor:
    def __init__(self, enable_denoise=True):
        self.enable_denoise = enable_denoise

    def extract_audio_from_video(self, video_path, output_wav_path):
        """
        Extracts mono audio at 16kHz from video using ffmpeg.
        """
        if os.path.exists(output_wav_path):
            os.remove(output_wav_path)
            
        cmd = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            output_wav_path
        ]
        try:
            # Hide stdout/stderr to avoid polluting logs
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to extract audio: {e}")
            return False

    def spectral_gating_numpy(self, y, sr):
        """
        Custom NumPy-based Spectral Gating algorithm as a fallback.
        Estimates the noise floor in low-energy frames and gates frequencies.
        """
        # Calculate STFT
        stft = librosa.stft(y, n_fft=1024, hop_length=512)
        stft_abs = np.abs(stft)
        
        # Estimate noise profile from the 10% frames with the lowest energy
        frame_energies = np.sum(stft_abs, axis=0)
        noise_threshold_idx = max(1, len(frame_energies) // 10)
        noise_frames_idx = np.argsort(frame_energies)[:noise_threshold_idx]
        
        noise_profile = np.mean(stft_abs[:, noise_frames_idx], axis=1, keepdims=True)
        
        # Spectral subtraction / gating mask
        # Suppress frequency bins that are less than 1.5x the noise profile
        mask = stft_abs > (1.5 * noise_profile)
        stft_clean = stft * mask
        
        # Reconstruct audio
        y_clean = librosa.istft(stft_clean, hop_length=512)
        return y_clean

    def denoise_audio(self, y, sr):
        """
        Denoises audio using noisereduce (if installed) or custom NumPy spectral gating fallback.
        """
        if not self.enable_denoise:
            return y
            
        try:
            if NOISEREDUCE_AVAILABLE:
                # Denoise using Stationary Noise Reduction
                return nr.reduce_noise(y=y, sr=sr, prop_decrease=1.0)
            else:
                return self.spectral_gating_numpy(y, sr)
        except Exception as e:
            print(f"[WARNING] Denoising failed: {e}. Returning raw signal.")
            return y

    def extract_features(self, video_path, temp_wav_dir="uploads"):
        """
        Full pipeline: Extracts audio, applies optional denoise, and extracts MFCC + delta + delta-delta features.
        Returns features shape (3, 20, Time_Frames) and the audio sampling rate.
        """
        os.makedirs(temp_wav_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        temp_wav_path = os.path.join(temp_wav_dir, f"{base_name}_temp.wav")
        
        success = self.extract_audio_from_video(video_path, temp_wav_path)
        if not success or not os.path.exists(temp_wav_path):
            # If no audio, return zero features
            return np.zeros((3, 20, 100), dtype=np.float32), 16000, None
        
        try:
            y, sr = librosa.load(temp_wav_path, sr=16000)
            
            # 1. Apply Spectral Gating
            y_clean = self.denoise_audio(y, sr)
            
            # 2. Extract 20 MFCCs
            mfcc = librosa.feature.mfcc(y=y_clean, sr=sr, n_mfcc=20, n_fft=1024, hop_length=512)
            
            # 3. Compute Delta and Delta-Delta coefficients
            delta = librosa.feature.delta(mfcc)
            delta2 = librosa.feature.delta(mfcc, order=2)
            
            # 4. Stack to form a 3-channel matrix: (3, 20, T)
            features = np.stack([mfcc, delta, delta2], axis=0)
            
            # Return features, sampling rate, and the path to the cleaned wave file
            # Save the clean wave to temp path for Speech-to-Text and return it
            clean_wav_path = os.path.join(temp_wav_dir, f"{base_name}_clean.wav")
            wav.write(clean_wav_path, sr, (y_clean * 32767).astype(np.int16))
            
            return features, sr, clean_wav_path
            
        except Exception as e:
            print(f"[ERROR] Audio feature extraction failed: {e}")
            return np.zeros((3, 20, 100), dtype=np.float32), 16000, None
        finally:
            if os.path.exists(temp_wav_path):
                os.remove(temp_wav_path)
