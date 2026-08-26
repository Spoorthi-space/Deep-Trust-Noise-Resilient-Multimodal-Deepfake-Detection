import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import pb from '@/lib/pocketbaseClient.js';

const AnalysisHistoryItem = ({ analysis, onView, onDelete }) => {
  const thumbnailUrl = analysis.thumbnail 
    ? pb.files.getUrl(analysis, analysis.thumbnail)
    : null;

  const isDeepfake = analysis.verdict === 'Deepfake';

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {thumbnailUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img 
                src={thumbnailUrl} 
                alt={analysis.fileName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold truncate">{analysis.fileName}</h3>
              <Badge variant={isDeepfake ? 'destructive' : 'default'}>
                {analysis.verdict}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(analysis.created), 'MMM d, yyyy')}
              </span>
              <span className="font-medium text-primary">
                {analysis.confidence}% confidence
              </span>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => onView(analysis)} className="gap-2">
                <Eye className="w-4 h-4" />
                View Details
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onDelete(analysis.id)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisHistoryItem;