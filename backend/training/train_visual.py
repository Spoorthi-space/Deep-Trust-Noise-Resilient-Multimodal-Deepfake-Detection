import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from models.visual_detector import VisualEncoder

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_DIR = os.path.join(BASE_DIR, "models", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

class FakeAVCelebVisualDataset(Dataset):
    """
    Dataset class skeleton for FakeAVCeleb visual sequence extraction.
    In real usage, this loads preprocessed face sequence crops (T, 3, 224, 224).
    """
    def __init__(self, data_path, seq_len=30, split="train"):
        self.data_path = data_path
        self.seq_len = seq_len
        self.split = split
        # Simulated items: in production, parse the FakeAVCeleb annotations CSV
        self.samples = [
            ("sample_video_1.mp4", 1), # (filepath, label: 1=Fake, 0=Real)
            ("sample_video_2.mp4", 0),
            ("sample_video_3.mp4", 1),
            ("sample_video_4.mp4", 0)
        ] * 10 # 40 dummy samples for pipeline execution test

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        filepath, label = self.samples[idx]
        # Simulate video sequences shape: (seq_len, 3, 224, 224)
        frames = torch.randn(self.seq_len, 3, 224, 224)
        return frames, torch.tensor(label, dtype=torch.float32)

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TRAIN] Running Visual model training on device: {device}")
    
    # Hyperparameters
    epochs = 2
    batch_size = 4
    lr = 1e-4
    
    dataset = FakeAVCelebVisualDataset(data_path="data/FakeAVCeleb", split="train")
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = VisualEncoder(embedding_dim=256, num_classes=1).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    
    model.train()
    for epoch in range(epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (inputs, labels) in enumerate(dataloader):
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            _, logits = model(inputs)
            logits = logits.squeeze(1)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            preds = torch.sigmoid(logits) > 0.5
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            
        epoch_loss = running_loss / total
        epoch_acc = correct / total
        print(f"Epoch {epoch+1}/{epochs} - Loss: {epoch_loss:.4f} - Accuracy: {epoch_acc:.4f}")
        
    # Save trained weights
    save_path = os.path.join(WEIGHTS_DIR, "efficientnet_deepfake.pth")
    torch.save(model.state_dict(), save_path)
    print(f"[SUCCESS] Visual model weights saved to {save_path}")

if __name__ == "__main__":
    train()
