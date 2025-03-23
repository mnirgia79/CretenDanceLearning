import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Course, SchoolYear } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, BookOpenIcon, MusicIcon, TheaterIcon } from "lucide-react";
import { CourseForm } from "@/components/courses/course-form";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Courses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("");
  const [courseType, setCourseType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { toast } = useToast();

  const { data: schoolYears, isLoading: loadingYears } = useQuery<SchoolYear[]>({
    queryKey: ['/api/school-years'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchSchoolYears"),
        variant: "destructive",
      });
    }
  });

  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/courses', selectedSchoolYear ? parseInt(selectedSchoolYear) : undefined],
    queryFn: async () => {
      const url = selectedSchoolYear 
        ? `/api/courses?schoolYearId=${selectedSchoolYear}` 
        : '/api/courses';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchCourses"),
        variant: "destructive",
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newCourse: Omit<Course, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/courses', newCourse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsCreateOpen(false);
      toast({
        title: t("success"),
        description: t("courseCreated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToCreateCourse"),
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; course: Partial<Course> }) => {
      return apiRequest('PUT', `/api/courses/${data.id}`, data.course);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsEditOpen(false);
      toast({
        title: t("success"),
        description: t("courseUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToUpdateCourse"),
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsDeleteOpen(false);
      toast({
        title: t("success"),
        description: t("courseDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToDeleteCourse"),
        variant: "destructive",
      });
    }
  });

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setIsEditOpen(true);
  };

  const handleDelete = (course: Course) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  // Filter courses based on type and search term
  const filteredCourses = courses?.filter(course => {
    const matchesType = courseType === "all" || course.type === courseType;
    const matchesSearch = searchTerm === "" || 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Get school year name for a given ID
  const getSchoolYearName = (id: number) => {
    return schoolYears?.find(year => year.id === id)?.name || "";
  };

  // Get icon based on course type
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case "dance":
        return <BookOpenIcon className="h-4 w-4" />;
      case "music":
        return <MusicIcon className="h-4 w-4" />;
      case "culture":
        return <TheaterIcon className="h-4 w-4" />;
      default:
        return <BookOpenIcon className="h-4 w-4" />;
    }
  };

  // Get badge variant based on course type
  const getCourseTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "dance":
        return "green";
      case "music":
        return "blue";
      case "culture":
        return "yellow";
      default:
        return "default";
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("courses")}</h1>
          <p className="text-sm text-gray-600">{t("coursesManagement")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("newCourse")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createCourse")}</DialogTitle>
            </DialogHeader>
            <CourseForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isSubmitting={createMutation.isPending}
              schoolYears={schoolYears || []}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="w-full md:w-1/3">
              <label htmlFor="school-year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t("schoolYear")}
              </label>
              <Select value={selectedSchoolYear} onValueChange={setSelectedSchoolYear}>
                <SelectTrigger id="school-year-filter">
                  <SelectValue placeholder={t("allSchoolYears")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("allSchoolYears")}</SelectItem>
                  {schoolYears?.map(year => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/3 md:px-4">
              <label htmlFor="course-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t("courseType")}
              </label>
              <Select value={courseType} onValueChange={setCourseType}>
                <SelectTrigger id="course-type-filter">
                  <SelectValue placeholder={t("allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="dance">{t("dance")}</SelectItem>
                  <SelectItem value="music">{t("music")}</SelectItem>
                  <SelectItem value="culture">{t("culture")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/3">
              <label htmlFor="course-search" className="block text-sm font-medium text-gray-700 mb-1">
                {t("search")}
              </label>
              <div className="relative rounded-md shadow-sm">
                <Input
                  id="course-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("searchCourses")}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("courseName")}</TableHead>
                <TableHead>{t("schoolYear")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("monthlyFee")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCourses || loadingYears ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCourses && filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-primary-light text-white">
                          {getCourseTypeIcon(course.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{course.name}</div>
                          <div className="text-sm text-gray-500">{course.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getSchoolYearName(course.schoolYearId)}</TableCell>
                    <TableCell>
                      <Badge variant={getCourseTypeBadgeVariant(course.type)} className="flex w-fit items-center gap-1">
                        {getCourseTypeIcon(course.type)}
                        {t(course.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.active ? (
                        <Badge variant="success" className="flex w-fit items-center">
                          {t("active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex w-fit items-center">
                          {t("inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{course.monthlyFee}€</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/courses/${course.id}`}>
                          <Button variant="outline" size="icon">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(course)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(course)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {searchTerm || courseType !== "all" || selectedSchoolYear 
                      ? t("noCoursesMatchingFilters") 
                      : t("noCourses")}
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
            <DialogTitle>{t("editCourse")}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <CourseForm 
              course={selectedCourse}
              onSubmit={(data) => updateMutation.mutate({ id: selectedCourse.id, course: data })}
              isSubmitting={updateMutation.isPending}
              schoolYears={schoolYears || []}
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
              {t("deleteCourseConfirmation")} <strong>{selectedCourse?.name}</strong>?
              {t("thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedCourse && deleteMutation.mutate(selectedCourse.id)}
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
