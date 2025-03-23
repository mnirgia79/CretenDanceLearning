import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Student } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, UploadIcon } from "lucide-react";
import { Link } from "wouter";
import { StudentForm } from "@/components/students/student-form";
import { StudentImport } from "@/components/students/student-import";

export default function Students() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch students
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchStudents"),
        variant: "destructive",
      });
    }
  });

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/students', newStudent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsCreateOpen(false);
      toast({
        title: t("success"),
        description: t("studentCreated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToCreateStudent"),
        variant: "destructive",
      });
    }
  });

  // Update student mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; student: Partial<Student> }) => {
      return apiRequest('PUT', `/api/students/${data.id}`, data.student);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsEditOpen(false);
      toast({
        title: t("success"),
        description: t("studentUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToUpdateStudent"),
        variant: "destructive",
      });
    }
  });

  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsDeleteOpen(false);
      toast({
        title: t("success"),
        description: t("studentDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToDeleteStudent"),
        variant: "destructive",
      });
    }
  });

  // Handle edit student
  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsEditOpen(true);
  };

  // Handle delete student
  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  // Filter students based on search term
  const filteredStudents = students?.filter(student => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.phone.includes(searchTerm) ||
      (student.email && student.email.toLowerCase().includes(searchLower)) ||
      (student.guardianName && student.guardianName.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("students")}</h1>
          <p className="text-sm text-gray-600">{t("studentManagement")}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            {t("importStudents")}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t("newStudent")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createStudent")}</DialogTitle>
              </DialogHeader>
              <StudentForm 
                onSubmit={(data) => createMutation.mutate(data)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchStudents")}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("contact")}</TableHead>
                <TableHead>{t("guardian")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents && filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="font-medium text-gray-600">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{student.phone}</div>
                      <div className="text-xs text-gray-500">{student.email || "—"}</div>
                    </TableCell>
                    <TableCell>
                      {student.guardianName || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/students/${student.id}`}>
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(student)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(student)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    {searchTerm ? t("noStudentsMatchingSearch") : t("noStudents")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editStudent")}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm 
              student={selectedStudent}
              onSubmit={(data) => updateMutation.mutate({ id: selectedStudent.id, student: data })}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteStudentConfirmation")} <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong>?
              {t("thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedStudent && deleteMutation.mutate(selectedStudent.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Students Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("importStudents")}</DialogTitle>
          </DialogHeader>
          <StudentImport onSuccess={() => setIsImportOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
