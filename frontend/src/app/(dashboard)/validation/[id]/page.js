'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Filter,
  FileSpreadsheet,
  TrendingUp,
  ArrowLeft,
  Eye,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validationAPI } from '@/lib/api';
import { formatDateTime, getStatusColor, getValidationRateColor, getErrorMessage } from '@/lib/utils';
import useAuthStore from '../../../../store/authstore'

export default function ValidationResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const validationId = params?.id;

  const [validation, setValidation] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filterColumn, setFilterColumn] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const errorsPerPage = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (validationId) {
      fetchValidationResults();
    }
  }, [isAuthenticated, validationId]);

  const fetchValidationResults = async () => {
    try {
      setLoading(true);
      const [validationRes, errorsRes] = await Promise.all([
        validationAPI.getById(validationId),
        validationAPI.getErrors(validationId)
      ]);

      setValidation(validationRes.data.data.validation || validationRes.data.data);
      setErrors(errorsRes.data.data.errors || []);
    } catch (error) {
      console.error('Error fetching validation results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResults = async () => {
    setDownloading(true);
    try {
     
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `validation-errors-${validationId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const generateCSV = () => {
    const headers = ['Row Number', 'Column Name', 'Cell Value', 'Error Type', 'Error Message', 'Severity'];
    const rows = filteredErrors.map(error => [
      error.rowNumber,
      error.columnName,
      error.cellValue,
      error.errorType,
      error.errorMessage,
      error.severity
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  };

  const filteredErrors = errors.filter(error => {
    if (filterColumn !== 'all' && error.columnName !== filterColumn) return false;
    if (filterSeverity !== 'all' && error.severity !== filterSeverity) return false;
    return true;
  });

  const paginatedErrors = filteredErrors.slice(
    (currentPage - 1) * errorsPerPage,
    currentPage * errorsPerPage
  );

  const totalPages = Math.ceil(filteredErrors.length / errorsPerPage);

  const uniqueColumns = [...new Set(errors.map(e => e.columnName))];
  const errorTypes = [...new Set(errors.map(e => e.errorType))];

  const getErrorTypeColor = (type) => {
    const colors = {
      'REQUIRED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'INVALID_DATATYPE': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'MIN_LENGTH': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'MAX_LENGTH': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'MIN_VALUE': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'MAX_VALUE': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'PATTERN_MISMATCH': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'INVALID_ENUM': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Validation Not Found</h2>
        <p className="text-muted-foreground mb-4">The validation you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/validate')}>
          Start New Validation
        </Button>
      </div>
    );
  }

  const validationRate = validation.validationRate || 
    ((validation.validRowsCount / validation.totalRows) * 100).toFixed(2);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
     
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/history')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Validation Results</h1>
          <p className="text-muted-foreground mt-2">
            {validation.dataFilename} • {formatDateTime(validation.createdAt)}
          </p>
        </div>
        <Button
          onClick={handleDownloadResults}
          disabled={downloading || errors.length === 0}
          className="gradient-primary text-white"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Results
            </>
          )}
        </Button>
      </div>

      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Status</CardTitle>
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {validation.isValid ? 'Valid' : 'Invalid'}
            </div>
            <Badge className={getStatusColor(validation.status)}>
              {validation.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getValidationRateColor(validationRate)}`}>
              {validationRate}%
            </div>
            <Progress value={validationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validation.totalRows || 0}</div>
            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
              <span className="text-green-600">✓ {validation.validRowsCount || 0} valid</span>
              <span className="text-red-600">✗ {validation.invalidRowsCount || 0} invalid</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {validation.totalErrorsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {validation.selectedColumns?.length || 0} columns
            </p>
          </CardContent>
        </Card>
      </div>

      
      <Tabs defaultValue="errors" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="errors">
            Errors ({errors.length})
          </TabsTrigger>
          <TabsTrigger value="summary">
            Column Summary
          </TabsTrigger>
        </TabsList>

        
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Validation Errors</CardTitle>
                  <CardDescription>
                    Showing {filteredErrors.length} of {errors.length} errors
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                 
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Columns</SelectItem>
                      {uniqueColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredErrors.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Errors Found!</h3>
                  <p className="text-muted-foreground">
                    {errors.length === 0 
                      ? 'All data is valid!' 
                      : 'No errors match your filters.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Row</TableHead>
                          <TableHead>Column</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Error Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="w-[100px]">Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedErrors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {error.rowNumber}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {error.columnName}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {error.cellValue?.toString() || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getErrorTypeColor(error.errorType)}>
                                {error.errorType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {error.errorMessage}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={error.severity === 'error' ? 'destructive' : 'secondary'}
                              >
                                {error.severity}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Column-wise Summary</CardTitle>
              <CardDescription>
                Validation summary for each column
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validation.columnSummaries?.map((summary, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg">{summary.columnName}</h4>
                        <Badge className={getValidationRateColor(summary.validationRate)}>
                          {summary.validationRate}% valid
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Rows</p>
                          <p className="text-lg font-semibold">{summary.totalRows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valid</p>
                          <p className="text-lg font-semibold text-green-600">{summary.validRows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Invalid</p>
                          <p className="text-lg font-semibold text-red-600">{summary.invalidRows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Errors</p>
                          <p className="text-lg font-semibold">{summary.errorCount}</p>
                        </div>
                      </div>

                      <Progress value={summary.validationRate} className="mb-3" />

                      {summary.mostCommonErrors?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Most Common Errors:</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.mostCommonErrors.map((error, i) => (
                              <Badge key={i} variant="outline" className={getErrorTypeColor(error.errorType)}>
                                {error.errorType} ({error.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}