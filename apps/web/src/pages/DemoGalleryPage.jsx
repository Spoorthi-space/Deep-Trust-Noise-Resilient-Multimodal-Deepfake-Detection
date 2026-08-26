import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AnalysisResultCard from '@/components/AnalysisResultCard.jsx';

const DemoGalleryPage = () => {
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const demoSamples = [
    {
      id: 1,
      title: 'Political Speech Deepfake',
      thumbnail: 'https://images.unsplash.com/photo-1679978880855-fb35585ce343',
      verdict: 'Deepfake',
      confidence: 92,
      riskLevel: 'High',
      description: 'Synthetic video showing manipulated facial expressions and voice. Audio-visual synchronization anomalies detected.',
      audioAnalysis: {
        summary: 'Voice synthesis artifacts detected in spectral analysis. Unnatural prosody patterns identified.'
      },
      visualAnalysis: {
        summary: 'Facial landmark inconsistencies and micro-expression anomalies found across multiple frames.'
      },
      textualAnalysis: {
        summary: 'Speech content shows semantic coherence but delivery patterns suggest synthetic generation.'
      },
      notes: 'High-quality deepfake with sophisticated face-swap technology. Multiple manipulation indicators across all modalities.'
    },
    {
      id: 2,
      title: 'Authentic Interview Footage',
      thumbnail: 'https://images.unsplash.com/photo-1701848055770-effbdb148e15',
      verdict: 'Authentic',
      confidence: 96,
      riskLevel: 'Low',
      description: 'Genuine interview recording with natural speech patterns and consistent visual features.',
      audioAnalysis: {
        summary: 'Natural voice characteristics with expected spectral properties. No synthesis indicators detected.'
      },
      visualAnalysis: {
        summary: 'Facial movements and expressions show natural temporal consistency. No manipulation artifacts found.'
      },
      textualAnalysis: {
        summary: 'Speech content and delivery patterns consistent with authentic human communication.'
      },
      notes: 'All analysis modalities confirm authenticity. No manipulation indicators detected.'
    },
    {
      id: 3,
      title: 'Voice Clone Detection',
      thumbnail: 'https://images.unsplash.com/photo-1679978880855-fb35585ce343',
      verdict: 'Deepfake',
      confidence: 87,
      riskLevel: 'Medium',
      description: 'Audio deepfake using voice cloning technology. Visual content appears authentic.',
      audioAnalysis: {
        summary: 'Synthetic voice patterns detected. Spectral analysis reveals text-to-speech artifacts.'
      },
      visualAnalysis: {
        summary: 'Visual content shows no manipulation. Facial features and movements appear natural.'
      },
      textualAnalysis: {
        summary: 'Content coherence maintained but audio delivery shows synthetic characteristics.'
      },
      notes: 'Audio-only manipulation detected. Visual modality remains authentic, highlighting importance of multimodal analysis.'
    },
    {
      id: 4,
      title: 'Compressed Authentic Video',
      thumbnail: 'https://images.unsplash.com/photo-1701848055770-effbdb148e15',
      verdict: 'Authentic',
      confidence: 83,
      riskLevel: 'Low',
      description: 'Heavily compressed but authentic video. Noise-resilient analysis maintains accuracy.',
      audioAnalysis: {
        summary: 'Natural voice patterns preserved despite compression. No synthesis indicators.'
      },
      visualAnalysis: {
        summary: 'Compression artifacts present but facial features show natural consistency.'
      },
      textualAnalysis: {
        summary: 'Content and delivery patterns consistent with authentic communication.'
      },
      notes: 'Demonstrates noise-resilient detection capabilities. Accuracy maintained despite significant compression.'
    },
    {
      id: 5,
      title: 'Face Swap Manipulation',
      thumbnail: 'https://images.unsplash.com/photo-1679978880855-fb35585ce343',
      verdict: 'Deepfake',
      confidence: 94,
      riskLevel: 'High',
      description: 'Advanced face-swap deepfake with high visual quality. Multiple detection indicators.',
      audioAnalysis: {
        summary: 'Audio appears authentic but shows slight synchronization issues with visual content.'
      },
      visualAnalysis: {
        summary: 'Face-swap artifacts detected. Boundary inconsistencies and lighting anomalies identified.'
      },
      textualAnalysis: {
        summary: 'Content coherent but visual-audio alignment shows temporal inconsistencies.'
      },
      notes: 'Sophisticated face-swap technology detected through visual analysis and audio-visual synchronization checks.'
    },
    {
      id: 6,
      title: 'Authentic News Broadcast',
      thumbnail: 'https://images.unsplash.com/photo-1701848055770-effbdb148e15',
      verdict: 'Authentic',
      confidence: 98,
      riskLevel: 'Low',
      description: 'Professional broadcast footage with high production quality. All authenticity checks passed.',
      audioAnalysis: {
        summary: 'Professional audio quality with natural voice characteristics. No manipulation detected.'
      },
      visualAnalysis: {
        summary: 'High-quality video with consistent lighting and natural facial movements throughout.'
      },
      textualAnalysis: {
        summary: 'Professional broadcast content with natural delivery and semantic coherence.'
      },
      notes: 'Highest confidence authentic classification. All modalities show consistent authenticity indicators.'
    }
  ];

  const handleViewAnalysis = (demo) => {
    setSelectedDemo(demo);
    setDetailsOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Demo Gallery - Deep Trust</title>
        <meta name="description" content="Explore sample deepfake detection analyses and results" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-4" style={{ textWrap: 'balance' }}>
                Demo Gallery
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                Explore sample analyses demonstrating Deep Trust detection capabilities across various deepfake techniques and authentic media
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demoSamples.map((demo) => (
                <Card key={demo.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={demo.thumbnail}
                      alt={demo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge variant={demo.verdict === 'Deepfake' ? 'destructive' : 'default'}>
                        {demo.verdict}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{demo.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {demo.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {demo.verdict === 'Deepfake' ? (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-sm font-medium">{demo.confidence}% confidence</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAnalysis(demo)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDemo?.title}</DialogTitle>
            </DialogHeader>
            {selectedDemo && (
              <div className="mt-4 space-y-6">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedDemo.thumbnail}
                    alt={selectedDemo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-muted-foreground">{selectedDemo.description}</p>
                <AnalysisResultCard analysis={selectedDemo} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Footer />
      </div>
    </>
  );
};

export default DemoGalleryPage;