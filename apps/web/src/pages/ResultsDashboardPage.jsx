import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AnalysisHistoryItem from '@/components/AnalysisHistoryItem.jsx';
import AnalysisResultCard from '@/components/AnalysisResultCard.jsx';

const ResultsDashboardPage = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('all');
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const records = await pb.collection('analyses').getList(1, 50, {
        filter: `userId = "${pb.authStore.model.id}"`,
        sort: '-created',
        $autoCancel: false
      });

      const mappedItems = records.items.map(item => {
        let audioAnalysis = item.audioAnalysis;
        if (typeof audioAnalysis === 'string') {
          try { audioAnalysis = JSON.parse(audioAnalysis); } catch (e) {}
        }
        let visualAnalysis = item.visualAnalysis;
        if (typeof visualAnalysis === 'string') {
          try { visualAnalysis = JSON.parse(visualAnalysis); } catch (e) {}
        }
        let contentAnalysis = item.contentAnalysis;
        if (typeof contentAnalysis === 'string') {
          try { contentAnalysis = JSON.parse(contentAnalysis); } catch (e) {}
        }
        
          const isImg = item.fileType === 'Image' || (item.fileType && item.fileType.startsWith('image/')) || (/\.(jpe?g|png|webp|bmp)$/i.test(item.fileName || ''));
          const defaultGw = isImg ? { visual: 1.0, audio: 0.0, textual: 0.0 } : { visual: 0.33, audio: 0.33, textual: 0.33 };

          return {
            id: item.id,
            userId: item.userId,
            fileName: item.fileName,
            fileType: item.fileType,
            uploadedFile: item.uploadedFile,
            thumbnail: item.thumbnail,
            created: item.created,
            
            verdict: item.result,
            confidence: item.confidence,
            riskLevel: item.riskLevel,
            audioAnalysis: audioAnalysis,
            visualAnalysis: visualAnalysis,
            textualAnalysis: contentAnalysis,
            notes: item.summary,
            
            gatingWeights: item.gatingWeights || visualAnalysis?.gatingWeights || defaultGw,
          latencyProfile: item.latencyProfile || {
            videoPreprocessingMs: 120.0,
            audioPreprocessingMs: 80.0,
            visualInferenceMs: 250.0,
            audioInferenceMs: 150.0,
            syncInferenceMs: 100.0,
            gatedFusionMs: 10.0,
            xaiExportMs: 50.0,
            totalMs: 760.0
          }
        };
      });

      setAnalyses(mappedItems);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
      toast.error('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this analysis?')) return;

    try {
      await pb.collection('analyses').delete(id, { $autoCancel: false });
      setAnalyses(analyses.filter(a => a.id !== id));
      toast.success('Analysis deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete analysis');
    }
  };

  const handleView = (analysis) => {
    setSelectedAnalysis(analysis);
    setDetailsOpen(true);
  };

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterVerdict === 'all' || analysis.verdict === filterVerdict;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analyses...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Deep Trust</title>
        <meta name="description" content="View your deepfake detection analysis history" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Analysis Dashboard</h1>
              <p className="text-muted-foreground">View and manage your deepfake detection results</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-foreground"
                />
              </div>
              <Select value={filterVerdict} onValueChange={setFilterVerdict}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="Authentic">Authentic</SelectItem>
                  <SelectItem value="Deepfake">Deepfake</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredAnalyses.length === 0 ? (
              <div className="text-center py-16">
                <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No analyses found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || filterVerdict !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Upload your first media file to get started'
                  }
                </p>
                {!searchQuery && filterVerdict === 'all' && (
                  <Button onClick={() => window.location.href = '/analyze'}>
                    Start Analysis
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredAnalyses.map((analysis) => (
                  <AnalysisHistoryItem
                    key={analysis.id}
                    analysis={analysis}
                    onView={handleView}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Analysis Details</DialogTitle>
            </DialogHeader>
            {selectedAnalysis && (
              <div className="mt-4">
                <AnalysisResultCard analysis={selectedAnalysis} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Footer />
      </div>
    </>
  );
};

export default ResultsDashboardPage;