import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from models.audio_detector import AudioEncoder

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_DIR = os.path.join(BASE_DIR, "models", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

class FakeAVCelebAudioDataset(Dataset):
    """
    Dataset class skeleton for FakeAVCeleb audio MFCC extraction.
    Loads pre-extracted 3-channel MFCC features: (3, 20, Time_Frames).
    """
    def __init__(self, data_path, time_frames=100, split="train"):
        self.data_path = data_path
        self.time_frames = time_frames
        self.split = split
        # Simulated labels (1=Fake, 0=Real)
        self.samples = [1, 0, 1, 0] * 10

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        label = self.samples[idx]
        # Simulate features shape: (3, 20, time_frames)
        features = torch.randn(3, 20, self.time_frames)
        return features, torch.tensor(label, dtype=torch.float32)

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TRAIN] Running Audio CNN training on device: {device}")
    
    epochs = 2
    batch_size = 4
    lr = 1e-3
    
    dataset = FakeAVCelebAudioDataset(data_path="data/FakeAVCeleb", split="train")
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = AudioEncoder(embedding_dim=256, num_classes=1).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    model.train() # Enable SpecAugment
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
        
    save_path = os.path.join(WEIGHTS_DIR, "audio_cnn.pth")
    torch.save(model.state_dict(), save_path)
    print(f"[SUCCESS] Audio model weights saved to {save_path}")

if __name__ == "__main__":
    train()
