import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { SchoolYear } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, CalendarIcon, PencilIcon, TrashIcon, CheckCircleIcon } from "lucide-react";
import { SchoolYearForm } from "@/components/school-years/school-year-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function SchoolYears() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null);
  const { toast } = useToast();

  const { data: schoolYears, isLoading } = useQuery<SchoolYear[]>({
    queryKey: ['/api/school-years'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchSchoolYears"),
        variant: "destructive",
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newSchoolYear: Omit<SchoolYear, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/school-years', newSchoolYear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-years'] });
      setIsCreateOpen(false);
      toast({
        title: t("success"),
        description: t("schoolYearCreated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToCreateSchoolYear"),
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; schoolYear: Partial<SchoolYear> }) => {
      return apiRequest('PUT', `/api/school-years/${data.id}`, data.schoolYear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-years'] });
      setIsEditOpen(false);
      toast({
        title: t("success"),
        description: t("schoolYearUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToUpdateSchoolYear"),
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/school-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-years'] });
      setIsDeleteOpen(false);
      toast({
        title: t("success"),
        description: t("schoolYearDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToDeleteSchoolYear"),
        variant: "destructive",
      });
    }
  });

  const handleEdit = (schoolYear: SchoolYear) => {
    setSelectedYear(schoolYear);
    setIsEditOpen(true);
  };

  const handleDelete = (schoolYear: SchoolYear) => {
    setSelectedYear(schoolYear);
    setIsDeleteOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("schoolYears")}</h1>
          <p className="text-sm text-gray-600">{t("schoolYearsDescription")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("newSchoolYear")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createSchoolYear")}</DialogTitle>
            </DialogHeader>
            <SchoolYearForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("period")}</TableHead>
                <TableHead>{t("status")}</TableHead>
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
              ) : schoolYears && schoolYears.length > 0 ? (
                schoolYears.map(schoolYear => (
                  <TableRow key={schoolYear.id}>
                    <TableCell className="font-medium">{schoolYear.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <span>
                          {format(new Date(schoolYear.startDate), 'dd/MM/yyyy')} - {format(new Date(schoolYear.endDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schoolYear.active ? (
                        <Badge variant="success" className="flex w-fit items-center gap-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          {t("active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex w-fit items-center">
                          {t("inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(schoolYear)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(schoolYear)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    {t("noSchoolYears")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editSchoolYear")}</DialogTitle>
          </DialogHeader>
          {selectedYear && (
            <SchoolYearForm 
              schoolYear={selectedYear}
              onSubmit={(data) => updateMutation.mutate({ id: selectedYear.id, schoolYear: data })}
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
              {t("deleteSchoolYearConfirmation")} <strong>{selectedYear?.name}</strong>?
              {t("thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedYear && deleteMutation.mutate(selectedYear.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
