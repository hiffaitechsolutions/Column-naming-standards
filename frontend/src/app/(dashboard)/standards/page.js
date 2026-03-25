'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Trash2,
  Eye,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { standardsAPI } from '@/lib/api';
import { formatDate, formatFileSize, getErrorMessage } from '@/lib/utils';
import useAuthStore from '../../../store/authstore';

export default function StandardsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [standards, setStandards]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive]   = useState(false);
  const [justUploaded, setJustUploaded] = useState(false); // ← tracks fresh upload

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchStandards();
  }, [isAuthenticated]);

  const fetchStandards = async () => {
    try {
      setLoading(true);
      const response = await standardsAPI.getAll();
      setStandards(response.data.data.standards || []);
    } catch (error) {
      console.error('Error fetching Classwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  const handleFileSelect = (file) => {
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(ext)) {
      setError('Invalid file type. Please upload .xlsx, .xls, or .csv files only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('File size exceeds 10MB limit.'); return; }
    setSelectedFile(file);
    setJustUploaded(false);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a file first'); return; }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await standardsAPI.upload(formData);

      setSuccess('Classwords file uploaded successfully!');
      setSelectedFile(null);
      setJustUploaded(true); // ← show Next button

      await fetchStandards();

      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this standards file?')) return;
    try {
      await standardsAPI.delete(id);
      setSuccess('Classwords deleted successfully');
      setJustUploaded(false);
      fetchStandards();
    } catch (error) {
      setError(getErrorMessage(error));
    }
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

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classwords Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your validation classwords files
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Classwords File</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx, .xls) containing your validation classwords
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`file-upload-area ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
            />

            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="w-8 h-8 text-primary" />
              </div>

              <div className="text-center">
                <p className="text-lg font-medium">
                  {selectedFile ? selectedFile.name : 'Drop your file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatFileSize(selectedFile.size)}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => document.getElementById('file-input').click()}
                disabled={uploading}
              >
                Select File
              </Button>
            </div>
          </div>

          {/* Upload button */}
          {selectedFile && (
            <Button
              className="w-full gradient-primary text-white"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Upload Classwords</>
              )}
            </Button>
          )}

          {/* Next button — shown after successful upload */}
          {justUploaded && !selectedFile && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-sm text-muted-foreground text-center">
                Classwords uploaded. You can proceed to validation or upload another file.
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setJustUploaded(false);
                    document.getElementById('file-input').click();
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Another
                </Button>
                <Button
                  className="flex-1 gradient-primary text-white"
                  onClick={() => router.push('/validate')}
                >
                  Next — Go to Validation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded files table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Classwords</CardTitle>
          <CardDescription>Manage your uploaded classwords files</CardDescription>
        </CardHeader>
        <CardContent>
          {standards.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No classwords uploaded yet</h3>
              <p className="text-muted-foreground mt-2">
                Upload your first classwords file to get started
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards.map((standard) => (
                    <TableRow key={standard.id}>
                      <TableCell className="font-medium">
                        {standard.standardsName || standard.filename}
                      </TableCell>
                      <TableCell>{standard.totalColumns || 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={standard.isParsed ? 'default' : 'destructive'}
                          className={standard.isParsed ? 'bg-green-100 text-green-800' : ''}
                        >
                          {standard.isParsed ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />Parsed</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" />Failed</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(standard.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/standards/${standard.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(standard.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Persistent Next button when files already exist */}
              <div className="flex justify-end mt-4">
                <Button
                  className="gradient-primary text-white"
                  onClick={() => router.push('/classwords')}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}