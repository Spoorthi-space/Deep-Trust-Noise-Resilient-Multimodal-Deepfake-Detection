import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileCheck, TrendingUp, Activity, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AdminStatsCard from '@/components/AdminStatsCard.jsx';

const AdminPanelPage = () => {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    totalUsers: 0,
    deepfakeCount: 0,
    authenticCount: 0
  });
  const [analyses, setAnalyses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [analysesData, usersData] = await Promise.all([
        pb.collection('analyses').getList(1, 100, {
          sort: '-created',
          expand: 'userId',
          $autoCancel: false
        }),
        pb.collection('users').getList(1, 100, {
          sort: '-created',
          $autoCancel: false
        })
      ]);

      setAnalyses(analysesData.items);
      setUsers(usersData.items);

      const deepfakeCount = analysesData.items.filter(a => a.verdict === 'Deepfake').length;
      const authenticCount = analysesData.items.filter(a => a.verdict === 'Authentic').length;

      setStats({
        totalAnalyses: analysesData.items.length,
        totalUsers: usersData.items.length,
        deepfakeCount,
        authenticCount
      });
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id) => {
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

  const chartData = [
    { name: 'Deepfake', count: stats.deepfakeCount },
    { name: 'Authentic', count: stats.authenticCount }
  ];

  const detectionAccuracy = stats.totalAnalyses > 0 
    ? ((stats.deepfakeCount + stats.authenticCount) / stats.totalAnalyses * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin panel...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - Deep Trust</title>
        <meta name="description" content="Deep Trust admin dashboard and analytics" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">System analytics and user management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AdminStatsCard
                title="Total Analyses"
                value={stats.totalAnalyses}
                icon={FileCheck}
                description="All time submissions"
              />
              <AdminStatsCard
                title="Total Users"
                value={stats.totalUsers}
                icon={Users}
                description="Registered accounts"
              />
              <AdminStatsCard
                title="Detection Accuracy"
                value={`${detectionAccuracy}%`}
                icon={TrendingUp}
                description="Overall system accuracy"
              />
              <AdminStatsCard
                title="Deepfakes Detected"
                value={stats.deepfakeCount}
                icon={Activity}
                description={`${stats.authenticCount} authentic`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Detection Results Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Confidence</span>
                    <span className="font-semibold">
                      {analyses.length > 0 
                        ? (analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">High Risk Detections</span>
                    <span className="font-semibold">
                      {analyses.filter(a => a.riskLevel === 'High').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Medium Risk Detections</span>
                    <span className="font-semibold">
                      {analyses.filter(a => a.riskLevel === 'Medium').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Low Risk Detections</span>
                    <span className="font-semibold">
                      {analyses.filter(a => a.riskLevel === 'Low').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Verdict</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyses.slice(0, 10).map((analysis) => (
                        <TableRow key={analysis.id}>
                          <TableCell className="font-medium">{analysis.fileName}</TableCell>
                          <TableCell>{analysis.userId}</TableCell>
                          <TableCell>
                            <Badge variant={analysis.verdict === 'Deepfake' ? 'destructive' : 'default'}>
                              {analysis.verdict}
                            </Badge>
                          </TableCell>
                          <TableCell>{analysis.confidence}%</TableCell>
                          <TableCell>
                            <Badge variant="outline">{analysis.riskLevel}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(analysis.created), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const userAnalyses = analyses.filter(a => a.userId === user.id).length;
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role || 'user'}
                              </Badge>
                            </TableCell>
                            <TableCell>{userAnalyses}</TableCell>
                            <TableCell>{format(new Date(user.created), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminPanelPage;