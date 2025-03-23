import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { t } from "@/lib/i18n";
import { UploadIcon, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface StudentImportProps {
  courseId?: number;
  onSuccess: () => void;
}

export function StudentImport({ courseId, onSuccess }: StudentImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const validTypes = [
      'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: t("error"),
        description: t("invalidFileType"),
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    
    // Preview the CSV/Excel content
    try {
      // For demonstration, we'll just read the file as text and show a few lines
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(0, 5);
        setPreview(lines);
      };
      reader.readAsText(selectedFile);
    } catch (error) {
      console.error("Error previewing file:", error);
    }
  };

  // Import students mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulate progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 20);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);

      try {
        const response = await apiRequest('POST', '/api/students/import', formData, true);
        clearInterval(interval);
        setUploadProgress(100);
        return response;
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      
      // If courseId provided, enroll students to this course
      if (courseId && data.students && data.students.length > 0) {
        // Here we would call another API to enroll students in the course
        // For now we'll just show success
      }
      
      toast({
        title: t("success"),
        description: t("studentsImportedSuccessfully", { count: data.count }),
      });
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    },
    onError: (error: any) => {
      if (error.errors) {
        setErrors(error.errors);
      }
      
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToImportStudents"),
        variant: "destructive",
      });
    }
  });

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: t("error"),
        description: t("pleaseSelectFile"),
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // If courseId is provided, add it to the formData
    if (courseId) {
      formData.append('courseId', courseId.toString());
    }
    
    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload">{t("selectCsvOrExcelFile")}</Label>
        <Input
          id="file-upload"
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">
          {t("csvFormatDescription")}
        </p>
      </div>

      {file && (
        <div className="rounded-md border bg-muted/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {preview.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">{t("preview")}:</p>
              <div className="text-xs bg-background p-2 rounded-md max-h-20 overflow-auto">
                {preview.map((line, i) => (
                  <div key={i} className="text-xs">{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {importMutation.isPending && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("importing")}</p>
            <p className="text-xs">{uploadProgress}%</p>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("importErrors")}</AlertTitle>
          <AlertDescription>
            <div className="text-xs mt-2 space-y-1">
              {errors.slice(0, 3).map((error, i) => (
                <p key={i}>{t("rowWithError", { row: error.row })}: {error.message || error.errors?.[0]?.message}</p>
              ))}
              {errors.length > 3 && (
                <p>+ {errors.length - 3} {t("moreErrors")}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {importMutation.isSuccess && (
        <Alert variant="success" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">{t("importSuccessful")}</AlertTitle>
          <AlertDescription className="text-green-600">
            {t("studentsImportedSuccessfully", { count: importMutation.data?.count || 0 })}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleUpload} 
          disabled={!file || importMutation.isPending || importMutation.isSuccess}
        >
          {importMutation.isPending ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("importing")}
            </div>
          ) : importMutation.isSuccess ? (
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("completed")}
            </div>
          ) : (
            <div className="flex items-center">
              <UploadIcon className="mr-2 h-4 w-4" />
              {t("importStudents")}
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
