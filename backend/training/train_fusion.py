import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from models.fusion import GatedEmbeddingFusion

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_DIR = os.path.join(BASE_DIR, "models", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

class FusionDataset(Dataset):
    """
    Dataset class skeleton for training Gated Fusion.
    Loads pre-extracted visual, audio, and textual consistency embeddings.
    """
    def __init__(self, embed_dim=256, split="train"):
        self.embed_dim = embed_dim
        self.split = split
        self.samples = [1, 0, 1, 0] * 15 # 60 dummy samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        label = self.samples[idx]
        
        # Simulate features of size 256
        ev = torch.randn(self.embed_dim)
        ea = torch.randn(self.embed_dim)
        et = torch.randn(self.embed_dim)
        
        return ev, ea, et, torch.tensor(label, dtype=torch.float32)

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TRAIN] Running Gated Fusion model training on device: {device}")
    
    epochs = 2
    batch_size = 8
    lr = 1e-3
    
    dataset = FusionDataset(embed_dim=256, split="train")
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = GatedEmbeddingFusion(feature_dim=256, projection_dim=256).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    model.train()
    for epoch in range(epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (ev, ea, et, labels) in enumerate(dataloader):
            ev, ea, et, labels = ev.to(device), ea.to(device), et.to(device), labels.to(device)
            
            optimizer.zero_grad()
            logits, weights = model(ev, ea, et)
            logits = logits.squeeze(1)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * ev.size(0)
            preds = torch.sigmoid(logits) > 0.5
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            
        epoch_loss = running_loss / total
        epoch_acc = correct / total
        print(f"Epoch {epoch+1}/{epochs} - Loss: {epoch_loss:.4f} - Accuracy: {epoch_acc:.4f}")
        
    save_path = os.path.join(WEIGHTS_DIR, "gated_fusion.pth")
    torch.save(model.state_dict(), save_path)
    print(f"[SUCCESS] Fusion model weights saved to {save_path}")

if __name__ == "__main__":
    train()
