'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Eye,
  Download,
  Trash2,
  Filter,
  Calendar,
  Search,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { userAPI, validationAPI } from '@/lib/api';
import { formatDateTime, getStatusColor, getValidationRateColor, getErrorMessage } from '@/lib/utils';
import useAuthStore from '../../../store/authstore';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [validations, setValidations] = useState([]);
  const [filteredValidations, setFilteredValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchValidationHistory();
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [validations, searchQuery, statusFilter, sortBy]);

  const fetchValidationHistory = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getValidations({ limit: 100 });
      setValidations(response.data.data.validations || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...validations];

    
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.dataFilename?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'errors-desc':
          return (b.totalErrorsCount || 0) - (a.totalErrorsCount || 0);
        case 'errors-asc':
          return (a.totalErrorsCount || 0) - (b.totalErrorsCount || 0);
        default:
          return 0;
      }
    });

    setFilteredValidations(filtered);
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this validation?')) {
      return;
    }

    try {
      await validationAPI.delete(id);
      fetchValidationHistory();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const paginatedValidations = filteredValidations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredValidations.length / itemsPerPage);

  const stats = {
    total: validations.length,
    completed: validations.filter(v => v.status === 'completed').length,
    failed: validations.filter(v => v.status === 'failed').length,
    processing: validations.filter(v => v.status === 'processing' || v.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your past validations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchValidationHistory}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="gradient-primary text-white"
            onClick={() => router.push('/validate')}
          >
            New Validation
          </Button>
        </div>
      </div>

      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
      </div>

      
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="errors-desc">Most Errors</SelectItem>
                <SelectItem value="errors-asc">Least Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle>All Validations</CardTitle>
          <CardDescription>
            Showing {paginatedValidations.length} of {filteredValidations.length} validations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredValidations.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {validations.length === 0 
                  ? 'No validations yet' 
                  : 'No validations match your filters'}
              </h3>
              <p className="text-muted-foreground mt-2">
                {validations.length === 0 
                  ? 'Start by uploading your first data file' 
                  : 'Try adjusting your filters'}
              </p>
              {validations.length === 0 && (
                <Button
                  className="mt-4 gradient-primary text-white"
                  onClick={() => router.push('/validate')}
                >
                  Start Validation
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Rows</TableHead>
                      <TableHead className="text-center">Errors</TableHead>
                      <TableHead className="text-center">Valid Rate</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedValidations.map((validation) => {
                      const validationRate = validation.validationRate || 
                        (validation.totalRows > 0 
                          ? ((validation.validRowsCount / validation.totalRows) * 100).toFixed(1)
                          : 0);

                      return (
                        <TableRow key={validation.id || validation._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{validation.dataFilename}</p>
                              <p className="text-xs text-muted-foreground">
                                {validation.sheetName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge className={getStatusColor(validation.status)}>
                                {validation.status}
                              </Badge>
                              {validation.isValid !== undefined && (
                                <div className="flex items-center gap-1">
                                  {validation.isValid ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      <span className="text-xs text-green-600">Valid</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      <span className="text-xs text-red-600">Invalid</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              <p className="font-medium">{validation.totalRows || 0}</p>
                              <p className="text-xs text-muted-foreground">
                                {validation.selectedColumns?.length || 0} cols
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-red-600">
                              {validation.totalErrorsCount || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${getValidationRateColor(validationRate)}`}>
                              {validationRate}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDateTime(validation.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/validation/${validation.id || validation._id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(validation.id || validation._id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
    </div>
  );
}