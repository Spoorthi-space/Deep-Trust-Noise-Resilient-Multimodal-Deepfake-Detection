import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Zap, Eye, Volume2, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const HomePage = () => {
  const [statsData, setStatsData] = useState({
    completed: '2,847',
    accuracy: '94.7%',
    processingTime: '0.8s'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hostname = typeof window !== 'undefined'
          ? (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname)
          : '127.0.0.1';
        const apiHost = `http://${hostname}:8000`;
        const res = await fetch(`${apiHost}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStatsData({
            completed: Number(data.completed).toLocaleString(),
            accuracy: data.accuracy,
            processingTime: data.processingTime
          });
        }
      } catch (err) {
        console.error('Failed to fetch home stats:', err);
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      icon: Volume2,
      title: 'Audio Analysis',
      description: 'Advanced voice pattern recognition detects synthetic speech and audio manipulation with high precision.'
    },
    {
      icon: Eye,
      title: 'Visual Detection',
      description: 'Deep learning models identify facial inconsistencies, unnatural movements, and visual artifacts.'
    },
    {
      icon: FileText,
      title: 'Textual Consistency',
      description: 'Context-aware analysis evaluates content coherence and identifies semantic anomalies.'
    },
    {
      icon: Zap,
      title: 'Noise Resilience',
      description: 'Robust detection maintains accuracy even with compressed or degraded media files.'
    }
  ];

  const stats = [
    { value: statsData.accuracy, label: 'Detection Accuracy' },
    { value: statsData.completed, label: 'Analyses Completed' },
    { value: statsData.processingTime, label: 'Average Processing Time' }
  ];

  return (
    <>
      <Helmet>
        <title>Deep Trust - Advanced Deepfake Detection Platform</title>
        <meta name="description" content="Multimodal deepfake detection using audio-visual fusion and noise-resilient analysis. Protect against synthetic media manipulation." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"></div>
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] pointer-events-none mix-blend-soft-light"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Shield className="w-4 h-4" />
                  Research-Grade Detection
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.02em', textWrap: 'balance' }}>
                  Detect deepfakes with multimodal analysis
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-prose">
                  Deep Trust combines audio-visual fusion with noise-resilient algorithms to identify synthetic media manipulation. Our research-backed platform provides accurate, explainable deepfake detection for critical applications.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/analyze">
                    <Button size="lg" className="gap-2">
                      Start Analysis
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/demo">
                    <Button size="lg" variant="outline">
                      View Demo
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t">
                  {stats.map((stat, index) => (
                    <div key={index}>
                      <div className="text-3xl font-bold text-primary mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
                <img
                  src="https://images.unsplash.com/photo-1701848055770-effbdb148e15"
                  alt="Advanced AI technology visualization"
                  className="relative rounded-2xl shadow-2xl w-full"
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ textWrap: 'balance' }}>
                Multimodal detection approach
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our platform analyzes multiple data streams simultaneously to achieve superior detection accuracy
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ textWrap: 'balance' }}>
                  Why deepfake detection matters
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Synthetic media manipulation poses serious threats to information integrity, personal privacy, and institutional trust. Deep Trust provides the tools needed to verify media authenticity in an era of increasingly sophisticated AI-generated content.
                </p>
                <ul className="space-y-3">
                  {[
                    'Protect against misinformation campaigns',
                    'Verify identity in sensitive communications',
                    'Maintain evidence integrity for legal proceedings',
                    'Safeguard brand reputation from manipulation'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-bold mb-4">Get started today</h3>
                <p className="text-muted-foreground mb-6">
                  Create a free account to analyze your first media file and experience the power of multimodal deepfake detection.
                </p>
                <Link to="/signup">
                  <Button size="lg" className="w-full gap-2">
                    Create Free Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;