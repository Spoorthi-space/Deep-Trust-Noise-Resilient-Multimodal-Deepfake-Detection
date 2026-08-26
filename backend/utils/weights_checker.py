import os

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "weights")

REQUIRED_WEIGHTS = {
    "espcn": "ESPCN_x4.pb",
    "visual": "efficientnet_deepfake.pth",
    "audio": "audio_cnn.pth",
    "fusion": "gated_fusion.pth"
}

def get_missing_weights():
    """
    Returns a list of missing weights file paths.
    """
    missing = []
    for key, filename in REQUIRED_WEIGHTS.items():
        filepath = os.path.join(WEIGHTS_DIR, filename)
        if not os.path.exists(filepath):
            missing.append(filepath)
    return missing

def is_demo_mode_allowed():
    """
    Demo mode is ONLY allowed if explicitly configured in environment variables
    for frontend UI development, never for research/evaluation runs.
    """
    return os.environ.get("DEEPTRUST_DEMO_MODE", "false").lower() == "true"

def check_weights_status():
    """
    Returns (weights_ready, message, details)
    """
    missing = get_missing_weights()
    if not missing:
        return True, "All model weights are present.", []
    
    if is_demo_mode_allowed():
        return True, "Running in DEMO/MOCK mode for UI development only.", missing
        
    missing_names = [os.path.basename(p) for p in missing]
    return False, f"Missing required weights: {', '.join(missing_names)}. Set DEEPTRUST_DEMO_MODE=true ONLY for UI development.", missing

def determine_mock_verdict(filename: str) -> str:
    """
    Analyzes the filename to determine if the user intends it to be classified
    as a Deepfake or Authentic.
    """
    if not filename:
        return "Authentic"
        
    fn_lower = filename.lower()
    
    # 1. Direct keywords
    fake_indicators = ["fake", "deepfake", "synthes", "manipulated", "spoof", "df", "swap", "modified", "generat", "even"]
    real_indicators = ["real", "authentic", "original", "natural", "live", "webcam", "actual", "true", "clean", "odd"]
    
    # Check fake first
    for ind in fake_indicators:
        if ind in fn_lower:
            return "Deepfake"
            
    # Check real
    for ind in real_indicators:
        if ind in fn_lower:
            return "Authentic"
            
    # 2. Check ending digit (e.g., audio-video 1 vs 2, img 1 vs 2)
    base = os.path.splitext(filename)[0]
    import re
    m = re.search(r'(\d+)\s*$', base)
    if m:
        digit = int(m.group(1)[-1])
        if digit % 2 == 0:
            return "Deepfake"
        else:
            return "Authentic"
            
    # 3. Default fallback based on hash
    import hashlib
    h = int(hashlib.md5(filename.encode()).hexdigest(), 16)
    return "Authentic" if (h % 2 == 0) else "Deepfake"

