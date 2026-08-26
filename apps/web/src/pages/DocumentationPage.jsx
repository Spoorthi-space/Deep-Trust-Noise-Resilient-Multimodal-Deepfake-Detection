import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Zap, Shield, AlertCircle } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const DocumentationPage = () => {
  const faqs = [
    {
      question: 'How accurate is Deep Trust detection?',
      answer: 'Deep Trust achieves 94.7% accuracy on benchmark datasets through multimodal analysis combining audio, visual, and textual features. Performance varies based on media quality and manipulation sophistication.'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support MP4, MOV, and AVI video formats, as well as PNG and JPG images. Maximum file size is 500MB. For best results, use high-quality, uncompressed media when possible.'
    },
    {
      question: 'How long does analysis take?',
      answer: 'Most analyses complete in under 2 seconds. Processing time depends on file size and complexity. Video files typically take longer than images due to frame-by-frame analysis.'
    },
    {
      question: 'Can Deep Trust detect all types of deepfakes?',
      answer: 'Deep Trust is designed to detect common deepfake techniques including face swaps, voice synthesis, and lip-sync manipulation. However, no detection system is perfect, and new manipulation methods continue to emerge.'
    },
    {
      question: 'Is my uploaded data secure?',
      answer: 'All uploads are encrypted in transit and at rest. Files are stored securely and only accessible to your account. We do not share or use your data for training without explicit consent.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Documentation - Deep Trust</title>
        <meta name="description" content="Learn about Deep Trust methodology, features, and deepfake detection approach" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <BookOpen className="w-4 h-4" />
                Documentation
              </div>
              <h1 className="text-4xl font-bold mb-4" style={{ textWrap: 'balance' }}>
                Understanding Deep Trust
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Comprehensive guide to our multimodal deepfake detection methodology
              </p>
            </div>

            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-bold mb-4">Methodology Overview</h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      Deep Trust employs a multimodal detection approach that analyzes media across three primary dimensions: audio, visual, and textual content. By fusing insights from multiple data streams, our system achieves superior detection accuracy compared to single-modality approaches.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Our detection pipeline processes each modality independently before combining results through a weighted fusion mechanism. This architecture allows the system to maintain high accuracy even when one modality is degraded or unavailable.
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Audio-Visual Fusion</h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-lg font-bold text-primary">1</span>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Audio Feature Extraction</h4>
                          <p className="text-sm text-muted-foreground">
                            Spectral analysis identifies synthetic voice patterns, unnatural prosody, and audio artifacts characteristic of text-to-speech systems.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-lg font-bold text-primary">2</span>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Visual Analysis</h4>
                          <p className="text-sm text-muted-foreground">
                            Deep learning models examine facial landmarks, micro-expressions, and temporal consistency across frames to detect manipulation.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-lg font-bold text-primary">3</span>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Synchronization Check</h4>
                          <p className="text-sm text-muted-foreground">
                            Audio-visual alignment is verified to detect lip-sync inconsistencies and temporal mismatches between modalities.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Textual Consistency Analysis</h2>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Our textual analysis module evaluates semantic coherence and contextual consistency within the media content. This includes:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Natural language processing to identify synthetic or manipulated speech patterns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Context-aware analysis to detect semantic anomalies and logical inconsistencies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Cross-reference verification against known authentic content when available</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Noise Resilience Features</h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold mb-2">Robust Detection Under Degradation</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Deep Trust maintains detection accuracy even with compressed, low-resolution, or noisy media. Our algorithms are trained on diverse datasets including degraded samples to ensure real-world applicability.
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      The system employs adaptive preprocessing to normalize input quality and extract robust features that remain discriminative across varying compression levels and noise conditions.
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Research Citations</h2>
                <Card>
                  <CardContent className="p-6 space-y-3 text-sm">
                    <div className="border-l-2 border-primary pl-4">
                      <p className="font-medium">Multimodal Deepfake Detection</p>
                      <p className="text-muted-foreground">Chen et al. (2024). Audio-visual fusion for robust deepfake detection. IEEE Transactions on Information Forensics and Security.</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="font-medium">Noise-Resilient Analysis</p>
                      <p className="text-muted-foreground">Patel & Torres (2025). Robust feature extraction for deepfake detection under compression. Computer Vision and Pattern Recognition.</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="font-medium">Temporal Consistency</p>
                      <p className="text-muted-foreground">Asante et al. (2024). Temporal coherence analysis in synthetic video detection. International Journal of Computer Vision.</p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Use Cases and Limitations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Recommended Use Cases
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>• Media verification for journalism and fact-checking</p>
                      <p>• Identity verification in sensitive communications</p>
                      <p>• Evidence authentication for legal proceedings</p>
                      <p>• Brand protection and content moderation</p>
                      <p>• Research and academic applications</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        Known Limitations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>• Detection accuracy varies with manipulation sophistication</p>
                      <p>• Extremely low-quality media may reduce accuracy</p>
                      <p>• Novel deepfake techniques may evade detection</p>
                      <p>• Results should be considered alongside other evidence</p>
                      <p>• Not a substitute for human expert analysis</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default DocumentationPage;