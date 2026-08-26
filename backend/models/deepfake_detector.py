import random

class DeepfakeDetector:

    @staticmethod
    def predict(filepath):

        confidence = random.randint(70, 99)

        return {
            "verdict": "Deepfake" if confidence > 85 else "Authentic",
            "confidence": confidence,
            "riskLevel": "High" if confidence > 85 else "Low"
        }