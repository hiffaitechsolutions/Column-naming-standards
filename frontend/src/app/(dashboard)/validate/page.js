'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { standardsAPI, classwordsAPI, abbreviationsAPI, validationAPI, userAPI } from '@/lib/api';
import { formatFileSize, getErrorMessage, formatCurrency } from '@/lib/utils';
import useAuthStore from '../../../store/authstore';

export default function ValidatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { number: 1, title: 'Select Files',    description: 'Choose classwords and data' },
    { number: 2, title: 'Select Sheet',    description: 'Pick sheet to validate' },
    { number: 3, title: 'Select Columns', description: 'Choose columns' },
    { number: 4, title: 'Preview',         description: 'Review before validation' },
    { number: 5, title: 'Validate',        description: 'Run validation' },
  ];

  const [standards, setStandards]               = useState([]);
  const [classwords, setClasswords]             = useState([]);
  const [abbreviations, setAbbreviations]       = useState([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedClassword, setSelectedClassword] = useState('');
  const [selectedAbbreviation, setSelectedAbbreviation] = useState('');
  const [dataFile, setDataFile]                 = useState(null);
  const [dataFilePath, setDataFilePath]         = useState('');
  const [isDDL, setIsDDL]                       = useState(false);   // ← NEW: tracks .txt mode
  const [sheets, setSheets]                     = useState([]);
  const [selectedSheet, setSelectedSheet]       = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns]   = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [canValidate, setCanValidate]           = useState(null);

  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchInitialData();
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [standardsRes, classwordsRes, abbreviationsRes, canValidateRes] = await Promise.all([
        standardsAPI.getParsed(),
        classwordsAPI.getParsed(),
        abbreviationsAPI.getAll(),
        userAPI.canValidate(),
      ]);
      setStandards(standardsRes.data.data.standards || []);
      setClasswords(classwordsRes.data.data.classwords || []);
      setAbbreviations(abbreviationsRes.data.data.abbreviations || []);
      setCanValidate(canValidateRes.data.data);
    } catch (error) {
      setError(getErrorMessage(error));
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
    if (e.dataTransfer.files?.[0]) handleDataFileSelect(e.dataTransfer.files[0]);
  };

  const handleDataFileInput = (e) => {
    if (e.target.files?.[0]) handleDataFileSelect(e.target.files[0]);
  };

  const handleDataFileSelect = async (file) => {
    const validTypes = ['.xlsx', '.xls', '.csv', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      setError('Invalid file type. Please upload .xlsx, .xls, .csv, or .txt files only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('File size exceeds 10MB limit.'); return; }
    setDataFile(file);
    setError('');
    await uploadDataFile(file);
  };

  const uploadDataFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await validationAPI.uploadData(formData);
      const { dataSheets, filePath, isDDL: ddlFlag } = response.data.data;

      setSheets(dataSheets || []);
      setDataFilePath(filePath);
      setIsDDL(!!ddlFlag);

      // For DDL files: auto-select the synthetic sheet and sentinel column
      // so the user can skip steps 2 & 3.
      if (ddlFlag) {
        setSelectedSheet('DDL');
        setAvailableColumns(['ALL_DDL_COLUMNS']);
        setSelectedColumns(['ALL_DDL_COLUMNS']);
      }

      setSuccess('Data file uploaded successfully!');
    } catch (error) {
      setError(getErrorMessage(error));
      setDataFile(null);
    } finally {
      setUploading(false);
    }
  };

  // For DDL mode: skip steps 2 & 3 entirely
  const canProceedToStep2 = () => selectedStandard && dataFile && sheets.length > 0;

  const handleSheetSelect = async (sheetName) => {
    setSelectedSheet(sheetName);
    setLoading(true);
    try {
      const response = await validationAPI.getColumns({ filePath: dataFilePath, sheetName });
      const cols = response.data.data.validColumns || [];
      setAvailableColumns(cols);
      // For DDL sentinel, auto-select everything
      if (response.data.data.isDDL) {
        setSelectedColumns(cols);
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(
      selectedColumns.length === availableColumns.length ? [] : [...availableColumns]
    );
  };

  // ── Step navigation — skip steps 2 & 3 for DDL files ────────────────────
  const nextStep = () => {
    setError('');
    if (isDDL && currentStep === 1) {
      setCurrentStep(4);   // jump straight to Preview
    } else if (isDDL && currentStep === 4) {
      setCurrentStep(5);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setError('');
    if (isDDL && currentStep === 4) {
      setCurrentStep(1);   // jump back to step 1
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleValidate = async () => {
    if (!canValidate) return;

    setValidating(true);
    setError('');
    setCurrentStep(5);

    try {
      const validationData = {
        standardsId:     selectedStandard,
        classwordsId:    selectedClassword && selectedClassword !== 'none' ? selectedClassword : undefined,
        // Send 'none' explicitly so the backend knows the user intentionally skipped abbreviations.
        // If we send undefined, the backend might auto-pick the latest file.
        abbreviationsId: selectedAbbreviation && selectedAbbreviation !== 'none' ? selectedAbbreviation : 'none',
        filepath:        dataFilePath,
        dataFilename:    dataFile.name,
        sheetName:       selectedSheet || 'DDL',
        columns:         isDDL ? ['ALL_DDL_COLUMNS'] : selectedColumns,
      };

      console.log('Sending validation data:', validationData);

      if (canValidate.requiresPayment) {
        setError('Payment required. Please upgrade or contact support.');
        setValidating(false);
        return;
      }

      const response = await validationAPI.validate(validationData);
      setValidationResult(response.data.data);
      setSuccess('Validation completed successfully!');

      setTimeout(() => {
        router.push(`/validation/${response.data.data.validation?.id}`);
      }, 1500);

    } catch (error) {
      console.error('Validation error:', error);
      setError(getErrorMessage(error));
    } finally {
      setValidating(false);
    }
  };

  if (loading && currentStep === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Column Validation</h1>
        <p className="text-muted-foreground mt-2">Upload and validate your Column against classwords and abbreviations</p>
      </div>

      {/* Step indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep >= step.number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.number ? <CheckCircle2 className="w-5 h-5" /> : step.number}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">

          {/* ── Step 1: Select Files ── */}
          {currentStep === 1 && (
            <div className="space-y-6">

              <div>
                <h3 className="text-lg font-semibold mb-4">Select classwords File</h3>
                {standards.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No classwords found. Please{' '}
                      <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/standards')}>
                        upload classwords file
                      </Button>{' '}first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a classwords file" />
                    </SelectTrigger>
                    <SelectContent>
                      {standards.map((standard) => (
                        <SelectItem key={standard._id} value={standard._id}>
                          {standard.standardsName} ({standard.totalColumns} columns)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Select Abbreviations File{' '}
                  <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </h3>
                <Select value={selectedAbbreviation} onValueChange={setSelectedAbbreviation}>
                  <SelectTrigger>
                    <SelectValue placeholder="None — abbreviation check will be skipped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {abbreviations.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No abbreviations files uploaded yet.
                      </div>
                    ) : (
                      abbreviations.map((abbr) => (
                        <SelectItem key={abbr._id || abbr.id} value={abbr._id || abbr.id}>
                          {abbr.filename} ({abbr.totalCount} definitions)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Data file upload */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload Data File</h3>

                {/* DDL mode banner */}
                {isDDL && dataFile && (
                  <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <strong>DDL Mode:</strong> SQL CREATE TABLE file detected. Sheet and column selection will be skipped — all columns in the DDL will be validated automatically.
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    id="data-file-input"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleDataFileInput}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 rounded-full bg-primary/10">
                      {uploading
                        ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        : <Upload className="w-8 h-8 text-primary" />
                      }
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium">
                        {dataFile ? dataFile.name : 'Drop your data file here'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {uploading ? 'Uploading...' : 'Supports .xlsx, .xls, .csv, .txt (DDL)'}
                      </p>
                      {dataFile && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">{formatFileSize(dataFile.size)}</p>
                          {isDDL ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">DDL file</Badge>
                          ) : sheets.length > 0 ? (
                            <Badge variant="outline" className="bg-green-50">{sheets.length} sheets found</Badge>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('data-file-input').click()}
                      disabled={uploading}
                    >
                      Select File
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Select Sheet (skipped for DDL) ── */}
          {currentStep === 2 && !isDDL && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Sheet to Validate</h3>
              <p className="text-sm text-muted-foreground">
                Choose which sheet from your data file you want to validate
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sheets.map((sheet) => (
                  <Card
                    key={sheet}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSheet === sheet ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleSheetSelect(sheet)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <span className="font-medium">{sheet}</span>
                      </div>
                      {selectedSheet === sheet && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {loading && selectedSheet && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Loading columns...</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Select Columns (skipped for DDL) ── */}
          {currentStep === 3 && !isDDL && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Select Columns to Validate</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which columns you want to validate ({selectedColumns.length} selected)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllColumns}>
                  {selectedColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {availableColumns.map((column, index) => (
                  <div
                    key={`column-${index}`}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleColumnToggle(column)}
                  >
                    <Checkbox
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => handleColumnToggle(column)}
                    />
                    <Label className="cursor-pointer flex-1">{column}</Label>
                  </div>
                ))}
              </div>
              {selectedColumns.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please select at least one column to validate</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* ── Step 4: Preview ── */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview & Confirm</h3>

              {isDDL && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <strong>DDL Mode:</strong> All columns from CREATE TABLE statements in your .txt file will be validated.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Classwords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">
                      {standards.find(s => s._id === selectedStandard)?.standardsName}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Abbreviations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">
                      {selectedAbbreviation && selectedAbbreviation !== 'none'
                        ? abbreviations.find(a => (a._id || a.id) === selectedAbbreviation)?.filename ?? 'Selected'
                        : <span className="text-muted-foreground">None (skipped)</span>
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Data File</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">{dataFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isDDL ? 'DDL mode — all columns' : `Sheet: ${selectedSheet}`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Columns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">
                      {isDDL ? 'All (from DDL)' : `${selectedColumns.length} selected`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {canValidate && (
                <Alert className={canValidate.requiresPayment
                  ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-green-200 bg-green-50 dark:bg-green-900/20'
                }>
                  {canValidate.requiresPayment ? (
                    <>
                      <CreditCard className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        <strong>Payment Required:</strong> You've used all free validations.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>Free Validation:</strong> You have {canValidate.freeValidationsRemaining} free validations remaining.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}
            </div>
          )}

          {/* ── Step 5: Validating ── */}
          {currentStep === 5 && (
            <div className="text-center py-12">
              {validating ? (
                <div className="space-y-4">
                  <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Validating Your Data...</h3>
                  <p className="text-muted-foreground">This may take a few moments depending on file size</p>
                  <Progress value={45} className="max-w-md mx-auto" />
                </div>
              ) : validationResult ? (
                <div className="space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                  <h3 className="text-xl font-semibold">Validation Complete!</h3>
                  <p className="text-muted-foreground">Redirecting to results...</p>
                </div>
              ) : null}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={
                (currentStep === 1 && !canProceedToStep2()) ||
                (currentStep === 2 && !selectedSheet) ||
                (currentStep === 3 && selectedColumns.length === 0)
              }
              className="gradient-primary text-white"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : currentStep === 4 ? (
            <Button
              onClick={handleValidate}
              disabled={validating || !canValidate}
              className="gradient-primary text-white"
            >
              {validating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validating...</>
              ) : (
                <><FileCheck className="mr-2 h-4 w-4" />Start Validation</>
              )}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}