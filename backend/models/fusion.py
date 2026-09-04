import os
import torch
import torch.nn as nn
from utils.weights_checker import get_missing_weights, is_demo_mode_allowed, determine_mock_verdict

class GatedEmbeddingFusion(nn.Module):
    def __init__(self, feature_dim=256, projection_dim=256):
        super(GatedEmbeddingFusion, self).__init__()
        # Projection Layers to project visual, audio, and consistency embeddings
        self.proj_v = nn.Sequential(nn.Linear(feature_dim, projection_dim), nn.ReLU())
        self.proj_a = nn.Sequential(nn.Linear(feature_dim, projection_dim), nn.ReLU())
        self.proj_t = nn.Sequential(nn.Linear(feature_dim, projection_dim), nn.ReLU())
        
        # Gating Net to compute soft attention weights over projections
        # Input to gating is concatenated projection of size projection_dim * 3
        self.gating_net = nn.Sequential(
            nn.Linear(projection_dim * 3, 128),
            nn.ReLU(),
            nn.Linear(128, 3), # 3 weights for visual, audio, consistency
            nn.Softmax(dim=1)
        )
        
        # Final classification MLP
        self.classifier = nn.Sequential(
            nn.Linear(projection_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1) # Outputs raw logit
        )

    def forward(self, ev, ea, et):
        # inputs shape: (B, 256)
        # 1. Project
        zv = self.proj_v(ev)
        za = self.proj_a(ea)
        zt = self.proj_t(et)
        
        # 2. Gate weighting coefficients
        z_concat = torch.cat([zv, za, zt], dim=1) # (B, 768)
        alpha = self.gating_net(z_concat) # (B, 3)
        
        alpha_v = alpha[:, 0:1] # (B, 1)
        alpha_a = alpha[:, 1:2]
        alpha_t = alpha[:, 2:3]
        
        # 3. Fuse
        z_fused = alpha_v * zv + alpha_a * za + alpha_t * zt # (B, 256)
        
        # 4. Classify
        logit = self.classifier(z_fused)
        return logit, alpha

class FusionPredictor:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = GatedEmbeddingFusion(feature_dim=256, projection_dim=256).to(self.device)
        self.model.eval()
        self.weights_loaded = False
        
        weights_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            "models", "weights", "gated_fusion.pth"
        )
        
        if os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.weights_loaded = True
                print("[INFO] Fusion model weights loaded successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to load fusion weights: {e}")
        else:
            print(f"[WARNING] Fusion weights file not found at {weights_path}.")

    def predict(self, ev, ea, et, filename_seed="default", is_image=False):
        """
        Fuses visual (ev), audio (ea), and consistency (et) tensors.
        Returns final probability and modality weights.
        filename_seed is used to produce deterministic demo scores for the same file.
        is_image: when True, forces gating weights to [1.0, 0.0, 0.0] as audio/consistency do not apply.
        """
        # Integrity checks
        if not self.weights_loaded:
            if is_demo_mode_allowed():
                # Deterministic mock: seed from filename hash so same file → same score
                import hashlib
                import numpy as np
                seed = int(hashlib.md5(("fusion_" + filename_seed).encode()).hexdigest(), 16) % (2**31)
                rng = np.random.RandomState(seed)

                # Short-circuit weights for image input (Level 1: reporting-only)
                if is_image:
                    weights = [1.0, 0.0, 0.0]
                else:
                    w_v = float(rng.uniform(0.30, 0.55))
                    w_a = float(rng.uniform(0.20, 0.38))
                    w_t = round(1.0 - w_v - w_a, 4)
                    weights = [w_v, w_a, w_t]
                
                # Check verdict from heuristic
                verdict = determine_mock_verdict(filename_seed)
                if verdict == "Deepfake":
                    prob = float(rng.uniform(0.76, 0.95))
                else:
                    prob = float(rng.uniform(0.03, 0.18))
                return prob, weights, True
            else:
                raise RuntimeError("MODEL_NOT_READY: Fusion model weights are missing or not loaded.")

        # inputs are (1, 256) tensors
        ev_tensor = ev.to(self.device)
        ea_tensor = ea.to(self.device)
        et_tensor = et.to(self.device)
        
        with torch.no_grad():
            # [Level 2 Hook] When dedicated visual classifier weights exist and fusion bypass is desired:
            # if is_image and hasattr(self, 'predict_visual_only'):
            #     prob = self.predict_visual_only(ev_tensor)
            #     return prob, [1.0, 0.0, 0.0], False
            logit, weights = self.model(ev_tensor, ea_tensor, et_tensor)
            prob = torch.sigmoid(logit).item()
            weights_list = weights.cpu().squeeze().tolist()

        # Level 1: image input has 100% visual influence and 0% audio/consistency
        if is_image:
            weights_list = [1.0, 0.0, 0.0]
            
        return prob, weights_list, False
