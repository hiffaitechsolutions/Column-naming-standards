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
  BookMarked,
  Download,
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
import { abbreviationsAPI } from '@/lib/api';
import { formatDate, formatFileSize, getErrorMessage } from '@/lib/utils';
import useAuthStore from '../../../store/authstore';

export default function AbbreviationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [abbreviations, setAbbreviations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchAbbreviations();
  }, [isAuthenticated]);

  const fetchAbbreviations = async () => {
    try {
      setLoading(true);
      const response = await abbreviationsAPI.getAll();
      setAbbreviations(response.data.data.abbreviations || []);
    } catch (err) {
      console.error('Error fetching abbreviations:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────
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
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      setError('Invalid file type. Please upload .xlsx or .xls files only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a file first'); return; }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await abbreviationsAPI.upload(formData);
      const { totalCount, categories } = response.data.data;

      setSuccess(
        `Abbreviations file uploaded — ${totalCount} definitions loaded` +
        (categories?.length ? ` across ${categories.join(', ')}` : '') + '.'
      );
      setSelectedFile(null);
      await fetchAbbreviations();

      const input = document.getElementById('abbreviations-file-input');
      if (input) input.value = '';

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this abbreviations file?')) return;
    try {
      await abbreviationsAPI.delete(id);
      setSuccess('Abbreviations file deleted successfully');
      fetchAbbreviations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
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
        <h1 className="text-3xl font-bold tracking-tight">Abbreviations Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your approved abbreviations standard file
        </p>
      </div>

      {/* Info banner */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <BookMarked className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>What are abbreviations?</strong> The abbreviations file defines which short
          word segments are approved for use in column names (e.g. <code>Amt</code> for Amount,
          <code>Cust</code> for Customer). During validation any unapproved abbreviation found
          in a column name is flagged as a warning. Upload the provided{' '}
          <strong>Approved_Abbreviations_Standard.xlsx</strong> to get started with 147 industry
          standard definitions sourced from Oracle OFSAA, IBM InfoSphere, and DAMA.
        </AlertDescription>
      </Alert>

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
          <CardTitle>Upload Abbreviations File</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx, .xls) containing your approved abbreviations.
            Expected columns: <strong>Full Word</strong> · <strong>Approved Abbreviation</strong> · Category · Notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Drop zone */}
          <div
            className={`file-upload-area ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="abbreviations-file-input"
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
            />

            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-indigo-500/10">
                <BookMarked className="w-8 h-8 text-indigo-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-medium">
                  {selectedFile ? selectedFile.name : 'Drop your abbreviations file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .xlsx and .xls
                </p>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatFileSize(selectedFile.size)}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => document.getElementById('abbreviations-file-input').click()}
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Abbreviations
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Uploaded files table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Abbreviation Files</CardTitle>
          <CardDescription>
            The most recently uploaded file is used automatically during validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {abbreviations.length === 0 ? (
            <div className="text-center py-12">
              <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No abbreviations file uploaded yet</h3>
              <p className="text-muted-foreground mt-2">
                Abbreviation checking is optional. You can skip this and proceed to validation —
                the abbreviation check will simply be skipped.
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={() => router.push('/validate')}>
                  Skip to Validation
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Definitions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abbreviations.map((abbr, index) => (
                  <TableRow key={abbr.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                        {abbr.filename}
                        {index === 0 && (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{abbr.totalCount || 0} definitions</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Parsed
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(abbr.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/abbreviations/${abbr.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(abbr.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {abbreviations.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Ready to validate?</h3>
              <p className="text-muted-foreground mb-4">
                Your abbreviations are loaded. The latest file will be used automatically
                during validation — no extra steps needed.
              </p>
              <Button
                className="gradient-primary text-white"
                onClick={() => router.push('/validate')}
              >
                Continue to Validation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}