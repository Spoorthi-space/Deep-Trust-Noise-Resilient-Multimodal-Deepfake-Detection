import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, CheckCircle, Video, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import FileUploadZone from '@/components/FileUploadZone.jsx';
import AnalysisResultCard from '@/components/AnalysisResultCard.jsx';

const UploadAnalysisPage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);

  // Webcam & Recording States
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'webcam'
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [stream, setStream] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownIntervalRef = useRef(null);

  // Clean up webcam stream when component unmounts or tab switches
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [stream]);

  const startWebcam = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setRecordedUrl(null);
      setSelectedFile(null);
      setIsWebcamReady(false);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true
      });
      
      setStream(mediaStream);
      setIsWebcamReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      toast.error("Could not access webcam/microphone. Please check permissions.");
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsWebcamReady(false);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    // Check browser recording formats (WebM is standard and widely supported in modern browsers)
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        
        // Convert the recorded blob to a File object for the analyzer endpoint
        const ext = mediaRecorder.mimeType?.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `live_webcam_capture_${Date.now()}.${ext}`, {
          type: blob.type,
          lastModified: Date.now()
        });
        setSelectedFile(file);
        stopWebcam();
        toast.success("Webcam recording captured successfully!");
      };

      setRecording(true);
      setCountdown(15);
      mediaRecorder.start(10); // gather chunks

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
      toast.error("Recording failed to start.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select or record a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 300);

    try {
      // STEP 1: Send file to FastAPI backend
      const aiFormData = new FormData();
      aiFormData.append("file", selectedFile);

      const apiHost = typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : "http://127.0.0.1:8000";
      const response = await fetch(`${apiHost}/analyze`, {
        method: "POST",
        body: aiFormData,
      });

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const aiResult = await response.json();
      console.log("AI Result:", aiResult);

      const analysisResult = {
        verdict: aiResult.verdict,
        confidence: aiResult.confidence,
        riskLevel: aiResult.riskLevel,
        gatingWeights: aiResult.gatingWeights,
        audioAnalysis: aiResult.audioAnalysis,
        visualAnalysis: aiResult.visualAnalysis,
        textualAnalysis: aiResult.textualAnalysis,
        latencyProfile: aiResult.latencyProfile,
        isMockRun: aiResult.isMockRun,
        notes: aiResult.notes
      };

      // STEP 2: Save to PocketBase
      const formData = new FormData();
      formData.append("userId", pb.authStore.model.id);
      formData.append("fileName", selectedFile.name);
      formData.append("fileType", selectedFile.type);
      formData.append("uploadedFile", selectedFile);

      formData.append("result", analysisResult.verdict);
      formData.append("confidence", analysisResult.confidence);
      formData.append("riskLevel", analysisResult.riskLevel);

      formData.append("audioAnalysis", JSON.stringify(analysisResult.audioAnalysis));
      formData.append("visualAnalysis", JSON.stringify(analysisResult.visualAnalysis));
      formData.append("contentAnalysis", JSON.stringify(analysisResult.textualAnalysis));
      formData.append("summary", analysisResult.notes);

      const record = await pb
        .collection("analyses")
        .create(formData, { $autoCancel: false });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setAnalysis({
        id: record.id,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        ...analysisResult,
      });

      toast.success("Analysis completed successfully");
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };



  const handleNewAnalysis = () => {
    setSelectedFile(null);
    setAnalysis(null);
    setUploadProgress(0);
    setRecordedUrl(null);
    stopWebcam();
  };

  return (
    <>
      <Helmet>
        <title>Analyze Media - Deep Trust</title>
        <meta name="description" content="Upload and analyze media files for deepfake detection" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            {!analysis ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Analyze Media</CardTitle>
                  <CardDescription>
                    Choose file upload or live webcam recording to scan for synthesis indicators.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Tab Selector */}
                  <div className="flex bg-muted p-1 rounded-md mb-6">
                    <button
                      onClick={() => { setActiveTab('upload'); stopWebcam(); setSelectedFile(null); setRecordedUrl(null); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      type="button"
                    >
                      <Upload className="w-4 h-4" />
                      File Upload
                    </button>
                    <button
                      onClick={() => { setActiveTab('webcam'); startWebcam(); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'webcam' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      type="button"
                    >
                      <Video className="w-4 h-4" />
                      Record Live Webcam
                    </button>
                  </div>

                  {activeTab === 'upload' ? (
                    <FileUploadZone onFileSelect={setSelectedFile} />
                  ) : (
                    <div className="space-y-4">
                      {recordedUrl ? (
                        /* Recorded Video Preview Mode */
                        <div className="space-y-4">
                          <video src={recordedUrl} controls className="w-full h-80 bg-black rounded-lg object-cover" />
                          <div className="flex justify-center">
                            <Button variant="outline" onClick={startWebcam} className="gap-2">
                              <RotateCcw className="w-4 h-4" />
                              Record Again
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Live Webcam Feed & Recording Interface */
                        <div className="space-y-4">
                          <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {recording && (
                              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                                RECORDING {countdown}s
                              </div>
                            )}
                            {!isWebcamReady && (
                              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-sm">Connecting to webcam...</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-center">
                            {recording ? (
                              <Button variant="destructive" onClick={stopRecording}>
                                Stop Recording
                              </Button>
                            ) : (
                              <Button onClick={startRecording} disabled={!isWebcamReady} className="gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                                Start Recording (15s)
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Analyzing file...</span>
                        <span className="font-medium">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || recording}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Start Analysis'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h2 className="text-2xl font-bold">Analysis Complete</h2>
                      <p className="text-sm text-muted-foreground">Results are ready for review</p>
                    </div>
                  </div>
                  <Button onClick={handleNewAnalysis} variant="outline">
                    New Analysis
                  </Button>
                </div>

                <AnalysisResultCard analysis={analysis} />

                <div className="flex justify-center mt-4">
                  <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                    View All Analyses
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default UploadAnalysisPage;