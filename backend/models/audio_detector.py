import os
import torch
import torch.nn as nn
import numpy as np
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

    def predict(self, mfcc_features, filename_seed="default"):
        """
        Runs inference on extracted MFCC features of shape (3, 20, T).
        filename_seed is used to produce deterministic demo scores for the same file.
        """
        # Integrity checks
        if not self.weights_loaded:
            if is_demo_mode_allowed():
                # Deterministic mock: seed from filename hash so same file → same score
                import hashlib
                seed = int(hashlib.md5(("audio_" + filename_seed).encode()).hexdigest(), 16) % (2**31)
                rng = np.random.RandomState(seed)
                mock_embed = torch.tensor(rng.randn(1, 256).astype(np.float32))
                
                # Check verdict from heuristic
                verdict = determine_mock_verdict(filename_seed)
                if verdict == "Deepfake":
                    prob = float(rng.uniform(0.72, 0.90))
                else:
                    prob = float(rng.uniform(0.01, 0.12))
                return mock_embed, prob, True
            else:
                raise RuntimeError("MODEL_NOT_READY: Audio model weights are missing or not loaded.")


        # Prepare tensor (shape: 1, 3, 20, T)
        x = torch.tensor(mfcc_features, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding, logit = self.model(x)
            prob = torch.sigmoid(logit).item()
            
        return embedding, prob, False

    def generate_explanation_spectrum(self, mfcc_features):
        """
        Highlights segments of the MFCC feature maps contributing most to a fake verdict.
        Returns a time-series contribution score of shape (T,).
        """
        if not self.weights_loaded:
            # Mock spectral energy highlights
            T = mfcc_features.shape[2]
            return (np.sin(np.linspace(0, 10, T))**2).astype(np.float32)

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
