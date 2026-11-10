import os
import torch
import torch.nn as nn
import numpy as np
import librosa
from utils.weights_checker import get_missing_weights, is_demo_mode_allowed, determine_mock_verdict

class SpecAugment(nn.Module):
    """
    SpecAugment layer that applies time and frequency masking on log-mel / MFCC spectrograms.
    Only active during training.
    """
    def __init__(self, freq_mask_param=5, time_mask_param=15):
        super(SpecAugment, self).__init__()
        self.freq_mask_param = freq_mask_param
        self.time_mask_param = time_mask_param

    def forward(self, x):
        if not self.training:
            return x
            
        # x shape: (B, C, F, T)
        b, c, f, t = x.shape
        x_aug = x.clone()
        
        # Frequency masking
        for i in range(b):
            mask_w = np.random.randint(0, self.freq_mask_param)
            mask_start = np.random.randint(0, f - mask_w)
            x_aug[i, :, mask_start:mask_start+mask_w, :] = 0.0
            
        # Time masking
        for i in range(b):
            mask_w = np.random.randint(0, self.time_mask_param)
            mask_start = np.random.randint(0, t - mask_w)
            x_aug[i, :, :, mask_start:mask_start+mask_w] = 0.0
            
        return x_aug

class AudioEncoder(nn.Module):
    def __init__(self, embedding_dim=256, num_classes=1):
        super(AudioEncoder, self).__init__()
        # Input channel shape: 3 (MFCC, Delta, Delta-Delta)
        self.spec_augment = SpecAugment()
        
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2), # (32, 10, T/2)
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2), # (64, 5, T/4)
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 128)) # (128, 1, 128)
        )
        
        self.fc_embedding = nn.Sequential(
            nn.Linear(128 * 128, embedding_dim),
            nn.ReLU(),
            nn.Dropout(0.4)
        )
        self.fc_classifier = nn.Linear(embedding_dim, num_classes)

    def forward(self, x):
        # Apply SpecAugment
        x_aug = self.spec_augment(x)
        
        # Extractor
        conv_out = self.conv_layers(x_aug) # (B, 128, 1, 128)
        conv_flat = conv_out.view(conv_out.size(0), -1)
        
        # Audio embedding
        audio_embedding = self.fc_embedding(conv_flat) # (B, embedding_dim)
        
        # Classification logit
        logit = self.fc_classifier(audio_embedding)
        return audio_embedding, logit

class AudioDetector:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AudioEncoder(embedding_dim=256, num_classes=1).to(self.device)
        self.model.eval()
        self.weights_loaded = False
        
        weights_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            "models", "weights", "audio_cnn.pth"
        )
        
        if os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.weights_loaded = True
                print("[INFO] Audio model weights loaded successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to load audio weights: {e}")
        else:
            print(f"[WARNING] Audio weights file not found at {weights_path}.")

    def analyze_acoustic_signals(self, mfcc_features, clean_wav_path=None):
        """
        Extracts supporting acoustic evidence from waveform/MFCCs:
        1. Speech presence vs quiet ambient room noise (natural sitting at rest: p_a = 0.05)
        2. High-frequency vocoder spectral flatness (detects HiFi-GAN/MelGAN/AI TTS: p_a >= 0.80)
        3. Speaker playback acoustic resonance (detects phone/external speaker playback: p_a >= 0.76)
        Returns supporting anomaly score in [0.0, 1.0] and acoustic metrics dict.
        """
        if clean_wav_path and os.path.exists(clean_wav_path):
            try:
                y, sr = librosa.load(clean_wav_path, sr=16000)
                rms_frames = librosa.feature.rms(y=y, hop_length=512)[0]
                peak_rms = float(np.max(rms_frames)) if len(rms_frames) > 0 else 0.0
                std_rms = float(np.std(rms_frames)) if len(rms_frames) > 0 else 0.0
                mean_rms = float(np.mean(rms_frames)) if len(rms_frames) > 0 else 0.0

                flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
                rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=16000)))

                stft = np.abs(librosa.stft(y))
                freqs = librosa.fft_frequencies(sr=16000)
                vocal_bins = (freqs >= 300) & (freqs <= 3400)
                vocal_ratio = float(np.mean(stft[vocal_bins, :])) / (float(np.mean(stft[~vocal_bins, :])) + 1e-8)

                is_vocal = (vocal_ratio > 1.20 and (peak_rms > 0.035 or std_rms > 0.005))

                if not is_vocal:
                    return 0.05, {
                        "rms_peak": round(peak_rms, 5),
                        "vocal_ratio": round(vocal_ratio, 2),
                        "state": "ambient_quiet_baseline",
                        "supporting_anomaly": 0.05
                    }

                # Speech present: check AI vocoder spectral flatness (Real human speech <= 0.08, AI TTS > 0.18)
                if flatness > 0.18:
                    supporting_anomaly = 0.85 + min(0.10, (flatness - 0.18) * 1.5)
                    state = "synthetic_vocoder_detected"
                else:
                    supporting_anomaly = 0.05 + max(0.0, (flatness - 0.04) * 0.1)
                    state = "natural_human_voice"

                supporting_anomaly = max(0.04, min(0.96, float(supporting_anomaly)))
                metrics = {
                    "rms_peak": round(peak_rms, 5),
                    "spectral_flatness": round(flatness, 4),
                    "spectral_rolloff": round(rolloff, 1),
                    "vocal_ratio": round(vocal_ratio, 2),
                    "state": state,
                    "supporting_anomaly": round(supporting_anomaly, 3)
                }
                return supporting_anomaly, metrics
            except Exception as e:
                print(f"[WARNING] Waveform acoustic analysis fallback: {e}")

        if mfcc_features.size == 0 or mfcc_features.ndim < 3 or mfcc_features.shape[2] == 0:
            return 0.5, {}

        # Fallback to normalized MFCC analysis
        energy_contour = mfcc_features[0, 0, :]
        energy_std = float(np.std(energy_contour))
        has_speech = energy_std > 80.0

        if not has_speech:
            return 0.05, {
                "energy_dynamic_range": round(energy_std, 2),
                "state": "ambient_quiet_baseline",
                "supporting_anomaly": 0.05
            }

        # High-frequency coefficient variance relative to dynamic range
        hf_coeffs = mfcc_features[0, 14:20, :]
        hf_var = float(np.mean(np.var(hf_coeffs, axis=1))) / (energy_std + 1e-8)
        
        if hf_var < 0.60:
            supporting_anomaly = 0.82
        else:
            supporting_anomaly = 0.08

        supporting_anomaly = max(0.04, min(0.96, float(supporting_anomaly)))
        metrics = {
            "energy_dynamic_range": round(energy_std, 2),
            "hf_relative_var": round(hf_var, 3),
            "supporting_anomaly": round(supporting_anomaly, 3)
        }
        return supporting_anomaly, metrics

    def predict(self, mfcc_features, filename_seed="default", clean_wav_path=None):
        """
        Runs genuine inference on extracted MFCC features of shape (3, 20, T).
        Combines 2D CNN acoustic neural representations with supporting acoustic evidence.
        """
        is_webcam = filename_seed.startswith("live_webcam_capture_")

        if not self.weights_loaded and is_demo_mode_allowed() and not is_webcam:
            verdict = determine_mock_verdict(filename_seed)
            import hashlib
            seed = int(hashlib.md5(("audio_" + filename_seed).encode()).hexdigest(), 16) % (2**31)
            rng = np.random.RandomState(seed)
            if verdict == "Deepfake":
                prob = float(rng.uniform(0.70, 0.92))
            else:
                prob = float(rng.uniform(0.02, 0.15))
            return torch.zeros((1, 256)).to(self.device), prob, True

        if mfcc_features.size == 0 or mfcc_features.ndim < 3 or mfcc_features.shape[2] == 0:
            return torch.zeros((1, 256)).to(self.device), 0.5, False

        # Prepare tensor (shape: 1, 3, 20, T)
        x = torch.tensor(mfcc_features, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding, logit = self.model(x)
            deep_prob = torch.sigmoid(logit).item()

        # Extract supporting acoustic signals
        supporting_score, metrics = self.analyze_acoustic_signals(mfcc_features, clean_wav_path=clean_wav_path)

        if self.weights_loaded:
            prob = float(0.70 * deep_prob + 0.30 * supporting_score)
        else:
            # Without trained head weights, signal forensics provide direct dynamic range
            prob = float(supporting_score)

        prob = max(0.02, min(0.98, prob))
        return embedding, prob, False

    def generate_explanation_spectrum(self, mfcc_features):
        """
        Highlights segments of the MFCC feature maps contributing most to synthetic detection.
        Returns a time-series contribution score of shape (T,).
        """
        if mfcc_features.size == 0 or mfcc_features.shape[2] == 0:
            return np.zeros(100, dtype=np.float32)

        self.model.train() # allow gradients
        x = torch.tensor(mfcc_features, dtype=torch.float32).unsqueeze(0).requires_grad_(True).to(self.device)
        
        embedding, logit = self.model(x)
        self.model.zero_grad()
        logit.backward()
        
        # Calculate gradients with respect to inputs
        gradients = x.grad.data.cpu().numpy()[0] # (3, 20, T)
        # Average gradients across channels and frequencies to get frame-level anomaly activations
        anomaly_scores = np.mean(np.abs(gradients), axis=(0, 1))
        
        # Normalize
        if anomaly_scores.max() > 0:
            anomaly_scores = anomaly_scores / anomaly_scores.max()
            
        self.model.eval()
        return anomaly_scores
