'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileCheck, 
  FileSpreadsheet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ArrowRight,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import useAuthStore from '../../../store/authstore';
import { userAPI } from '@/lib/api';
import { formatDateTime, getStatusColor } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentValidations, setRecentValidations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data...');
      
      const [dashResponse, validationsResponse] = await Promise.all([
        userAPI.getDashboard(),
        userAPI.getValidations({ limit: 5 })
      ]);

      console.log('Dashboard data:', dashResponse.data.data);
      setDashboardData(dashResponse.data.data);
      setRecentValidations(validationsResponse.data.data.validations || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const freeValidationsRemaining = dashboardData?.freeValidationsRemaining || dashboardData?.usage?.freeValidationsRemaining || 0;
  const freeValidationsLimit = 3;
  const totalValidations = dashboardData?.totalValidationsCount || dashboardData?.validations?.total || 0;
  const paidValidations = dashboardData?.paidValidationsCount || dashboardData?.usage?.paidValidationsCount || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your data validations today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Free Validations
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {freeValidationsRemaining} / {freeValidationsLimit}
            </div>
            <Progress 
              value={(freeValidationsRemaining / freeValidationsLimit) * 100} 
              className="mt-3"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {freeValidationsRemaining > 0 
                ? `${freeValidationsRemaining} free validations remaining`
                : 'No free validations left'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Validations
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValidations}</div>
            <p className="text-xs text-muted-foreground mt-2">
              All time validations
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Paid Validations
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidValidations}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Premium validations used
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quick Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full gradient-primary text-white"
                onClick={() => router.push('/validate')}
              >
                <Upload className="mr-2 h-3 w-3" />
                New Validation
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/history')}
              >
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Validations</CardTitle>
              <CardDescription>
                Your latest validation activities
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/history')}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentValidations.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No validations yet</h3>
              <p className="text-muted-foreground mt-2">
                Start by uploading your first data file for validation
              </p>
              <Button 
                className="mt-4 gradient-primary text-white"
                onClick={() => router.push('/validate')}
              >
                <Upload className="mr-2 h-4 w-4" />
                Start Validation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentValidations.map((validation) => (
                <div 
                  key={validation.id || validation._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      validation.isValid 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      {validation.isValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{validation.dataFilename || 'Data File'}</p>
                      <p className="text-sm text-muted-foreground">
                        {validation.totalRows || 0} rows • {validation.totalErrorsCount || 0} errors
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge className={getStatusColor(validation.status)}>
                        {validation.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(validation.createdAt)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => router.push(`/validation/${validation.id || validation._id}`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalValidations === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to validate your first data file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Upload Standards File</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload your Excel file containing validation standards
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => router.push('/standards')}
                  >
                    Upload Standards
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Upload Classwords (Optional)</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload classwords file for enhanced validation rules
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => router.push('/classwords')}
                  >
                    Upload Classwords
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Validate Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload your data file and select columns to validate
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-2 gradient-primary text-white"
                    onClick={() => router.push('/validate')}
                  >
                    Start Validation
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}