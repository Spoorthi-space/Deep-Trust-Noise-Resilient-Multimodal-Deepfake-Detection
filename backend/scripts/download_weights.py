import os
import urllib.request

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "weights")

def download_file(url, filename):
    filepath = os.path.join(WEIGHTS_DIR, filename)
    if os.path.exists(filepath):
        print(f"[INFO] {filename} already exists at {filepath}.")
        return True
    
    print(f"[DOWNLOAD] Downloading {filename} from {url}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"[SUCCESS] Downloaded {filename} to {filepath}.")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to download {filename}: {e}")
        return False

def main():
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    
    # 1. OpenCV Super-Resolution ESPCN x4 model weights
    espcn_url = "https://github.com/fannymonori/TF-ESPCN/raw/master/export/ESPCN_x4.pb"
    download_file(espcn_url, "ESPCN_x4.pb")
    
    # 2. Information on training weights
    print("\n" + "="*60)
    print("DEEP TRUST WEIGHTS DOWNLOAD & SETUP GUIDE")
    print("="*60)
    print("In accordance with validation standards:")
    print("If model weights are missing, the backend returns a MODEL_NOT_READY status (HTTP 503).")
    print("To obtain the model weights, you can either:")
    print("1. Run the training pipelines to generate local weights:")
    print("   - python training/train_visual.py (Outputs: models/weights/efficientnet_deepfake.pth)")
    print("   - python training/train_audio.py (Outputs: models/weights/audio_cnn.pth)")
    print("   - python training/train_fusion.py (Outputs: models/weights/gated_fusion.pth)")
    print("2. Place your own custom pre-trained state_dicts in: " + WEIGHTS_DIR)
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
