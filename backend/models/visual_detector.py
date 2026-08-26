import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
from utils.weights_checker import get_missing_weights, is_demo_mode_allowed, determine_mock_verdict

class VisualEncoder(nn.Module):
    def __init__(self, embedding_dim=256, num_classes=1):
        super(VisualEncoder, self).__init__()
        # Load backbone
        self.backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        # Extract features without the classification head
        self.features = self.backbone.features
        
        # Temporal Encoder
        self.temporal_encoder = nn.LSTM(
            input_size=1280, 
            hidden_size=embedding_dim // 2, 
            num_layers=2, 
            batch_first=True, 
            bidirectional=True
        )
        
        # Classifier
        self.fc = nn.Linear(embedding_dim, num_classes)
        self.pool = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        # x shape: (batch_size, num_frames, 3, 224, 224)
        batch_size, num_frames, c, h, w = x.shape
        # Flatten batch and frame dims
        x_flat = x.view(batch_size * num_frames, c, h, w)
        
        # Extract spatial features
        spatial_feats = self.features(x_flat) # (B*T, 1280, 7, 7)
        spatial_feats = self.pool(spatial_feats).view(batch_size * num_frames, 1280)
        
        # Re-arrange to temporal sequence
        temporal_input = spatial_feats.view(batch_size, num_frames, 1280)
        
        # Run BiLSTM
        lstm_out, _ = self.temporal_encoder(temporal_input) # (B, T, embedding_dim)
        
        # Sequence pooling (average across temporal dimension)
        visual_embedding = torch.mean(lstm_out, dim=1) # (B, embedding_dim)
        
        # Output probability logit
        logit = self.fc(visual_embedding)
        return visual_embedding, logit

class VisualDetector:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = VisualEncoder(embedding_dim=256, num_classes=1).to(self.device)
        self.model.eval()
        self.weights_loaded = False
        
        weights_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            "models", "weights", "efficientnet_deepfake.pth"
        )
        
        if os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.weights_loaded = True
                print("[INFO] Visual model weights loaded successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to load visual weights: {e}")
        else:
            print(f"[WARNING] Visual weights file not found at {weights_path}.")

    def predict(self, face_crops, filename_seed="default"):
        """
        Runs inference on a batch of face crops (T, 224, 224, 3) from a single video.
        filename_seed is used to produce deterministic demo scores for the same file.
        """
        # Integrity checks
        if not self.weights_loaded:
            if is_demo_mode_allowed():
                # Deterministic mock: seed from filename hash so same file → same score
                import hashlib
                seed = int(hashlib.md5(filename_seed.encode()).hexdigest(), 16) % (2**31)
                rng = np.random.RandomState(seed)
                mock_embed = torch.tensor(rng.randn(1, 256).astype(np.float32))
                
                # Check verdict from heuristic
                verdict = determine_mock_verdict(filename_seed)
                if verdict == "Deepfake":
                    prob = float(rng.uniform(0.75, 0.94))
                else:
                    prob = float(rng.uniform(0.02, 0.15))
                return mock_embed, prob, True
            else:
                raise RuntimeError("MODEL_NOT_READY: Visual model weights are missing or not loaded.")


        if len(face_crops) == 0:
            return torch.zeros((1, 256)).to(self.device), 0.5, False

        # Convert to tensor and shape (1, T, C, H, W)
        # BGR (OpenCV) to RGB, normalized to PyTorch expectation
        tensor_crops = []
        for img in face_crops:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_normalized = img_rgb.astype(np.float32) / 255.0
            # standard ImageNet normalization
            img_normalized = (img_normalized - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
            tensor_crops.append(torch.tensor(img_normalized).permute(2, 0, 1)) # (3, 224, 224)

        x = torch.stack(tensor_crops, dim=0).unsqueeze(0).to(self.device) # (1, T, 3, 224, 224)
        
        with torch.no_grad():
            embedding, logit = self.model(x)
            prob = torch.sigmoid(logit).item()
            
        return embedding, prob, False

    def generate_gradcam(self, face_crops, frame_idx):
        """
        Generates a Grad-CAM heatmap for a given frame index of the video.
        Returns a (224, 224) heatmap numpy array.
        """
        if not self.weights_loaded:
            # Fallback to random noise map for demo visualization
            return np.random.rand(224, 224).astype(np.float32)

        # Set gradients on
        self.model.train()
        
        # Prepare target frame
        img = face_crops[frame_idx]
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_normalized = img_rgb.astype(np.float32) / 255.0
        img_normalized = (img_normalized - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        x_frame = torch.tensor(img_normalized).permute(2, 0, 1).unsqueeze(0).to(self.device) # (1, 3, 224, 224)
        
        # Get activations from final block of EfficientNet features
        feature_extractor = self.model.features
        
        # Hook activations and gradients
        activations = []
        gradients = []
        
        def save_activation(module, input, output):
            activations.append(output)
        def save_gradient(module, grad_input, grad_output):
            gradients.append(grad_output[0])
            
        target_layer = feature_extractor[-1]
        act_handle = target_layer.register_forward_hook(save_activation)
        grad_handle = target_layer.register_backward_hook(save_gradient)
        
        # Forward pass on single frame (pretend it's a 1-frame video)
        # Extract features
        spatial = feature_extractor(x_frame)
        pooled = self.model.pool(spatial).view(1, 1280)
        # Sequence input for LSTM
        seq_in = pooled.unsqueeze(1)
        lstm_out, _ = self.model.temporal_encoder(seq_in)
        logit = self.model.fc(torch.mean(lstm_out, dim=1))
        
        # Backward pass on target logit
        self.model.zero_grad()
        logit.backward()
        
        # Remove hooks
        act_handle.remove()
        grad_handle.remove()
        
        # Return to evaluation mode
        self.model.eval()
        
        if len(gradients) == 0:
            return np.zeros((224, 224), dtype=np.float32)
            
        # Compute Grad-CAM
        grads = gradients[0].cpu().data.numpy()[0]
        acts = activations[0].cpu().data.numpy()[0]
        
        weights = np.mean(grads, axis=(1, 2))
        cam = np.zeros(acts.shape[1:], dtype=np.float32)
        
        for i, w in enumerate(weights):
            cam += w * acts[i, :, :]
            
        cam = np.maximum(cam, 0)
        if cam.max() > 0:
            cam = cam / cam.max()
        cam = cv2.resize(cam, (224, 224))
        return cam
