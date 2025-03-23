import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Course, Class, Student, Enrollment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassForm } from "@/components/courses/class-form";
import { StudentImport } from "@/components/students/student-import";
import { ArrowLeft, BookOpen, Users, Calendar, Edit, Trash, PlusCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";

interface CourseDetailsProps {
  id: number;
}

export default function CourseDetails({ id }: CourseDetailsProps) {
  const [activeTab, setActiveTab] = useState("classes");
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [isDeleteClassOpen, setIsDeleteClassOpen] = useState(false);
  const [isImportStudentsOpen, setIsImportStudentsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch course details
  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${id}`],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchCourseDetails"),
        variant: "destructive",
      });
      navigate("/courses");
    }
  });

  // Fetch classes for this course
  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes', id],
    queryFn: async () => {
      const res = await fetch(`/api/classes?courseId=${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch classes');
      return res.json();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchClasses"),
        variant: "destructive",
      });
    }
  });

  // Fetch enrollments for this course's classes
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ['/api/enrollments', 'course', id],
    queryFn: async () => {
      if (!classes || classes.length === 0) return [];
      
      const classIds = classes.map(c => c.id);
      const enrollmentsPromises = classIds.map(classId => 
        fetch(`/api/enrollments?classId=${classId}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : [])
      );
      
      const allEnrollments = await Promise.all(enrollmentsPromises);
      return allEnrollments.flat();
    },
    enabled: !!classes && classes.length > 0,
  });

  // Fetch all enrolled students
  const { data: students, isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['/api/students', 'course', id],
    queryFn: async () => {
      if (!enrollments || enrollments.length === 0) return [];
      
      const studentIds = [...new Set(enrollments.map(e => e.studentId))];
      const studentsPromises = studentIds.map(studentId => 
        fetch(`/api/students/${studentId}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
      );
      
      const allStudents = await Promise.all(studentsPromises);
      return allStudents.filter(s => s !== null);
    },
    enabled: !!enrollments && enrollments.length > 0,
  });

  // Create a new class
  const createClassMutation = useMutation({
    mutationFn: async (newClass: Omit<Class, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/classes', newClass);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', id] });
      setIsClassFormOpen(false);
      toast({
        title: t("success"),
        description: t("classCreated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToCreateClass"),
        variant: "destructive",
      });
    }
  });

  // Update class
  const updateClassMutation = useMutation({
    mutationFn: async (data: { id: number; classData: Partial<Class> }) => {
      return apiRequest('PUT', `/api/classes/${data.id}`, data.classData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', id] });
      setIsClassFormOpen(false);
      toast({
        title: t("success"),
        description: t("classUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToUpdateClass"),
        variant: "destructive",
      });
    }
  });

  // Delete class
  const deleteClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      return apiRequest('DELETE', `/api/classes/${classId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', id] });
      setIsDeleteClassOpen(false);
      toast({
        title: t("success"),
        description: t("classDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToDeleteClass"),
        variant: "destructive",
      });
    }
  });

  // Handle class actions
  const handleAddClass = () => {
    setSelectedClass(null);
    setIsClassFormOpen(true);
  };

  const handleEditClass = (classData: Class) => {
    setSelectedClass(classData);
    setIsClassFormOpen(true);
  };

  const handleDeleteClass = (classData: Class) => {
    setSelectedClass(classData);
    setIsDeleteClassOpen(true);
  };

  // Handle create/update class form submission
  const handleClassFormSubmit = (data: Partial<Class>) => {
    if (selectedClass) {
      updateClassMutation.mutate({ id: selectedClass.id, classData: data });
    } else {
      createClassMutation.mutate({
        ...data as Omit<Class, 'id' | 'createdAt'>,
        courseId: id
      });
    }
  };

  // Get the count of students in a class
  const getClassStudentCount = (classId: number) => {
    if (!enrollments) return 0;
    return enrollments.filter(e => e.classId === classId && e.active).length;
  };

  // Get level badge color
  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "green";
      case "intermediate":
        return "blue";
      case "advanced":
        return "purple";
      default:
        return "default";
    }
  };

  // Format class schedule for display
  const formatClassSchedule = (schedule: { day: string; startTime: string; endTime: string; location: string }[]) => {
    if (!schedule || schedule.length === 0) return t("noSchedule");
    
    const days = schedule.map(s => t(s.day.toLowerCase())).join(", ");
    const times = schedule[0] ? `${schedule[0].startTime} - ${schedule[0].endTime}` : "";
    return `${days}, ${times}`;
  };

  // Get student by id
  const getStudentById = (studentId: number) => {
    return students?.find(s => s.id === studentId);
  };

  // Get class by id
  const getClassById = (classId: number) => {
    return classes?.find(c => c.id === classId);
  };

  if (loadingCourse) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 rounded-full mr-3" />
          <div>
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[200px] w-full mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-3">
          <Link href="/courses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{course.name}</h1>
          <p className="text-sm text-gray-600">{t("courseDetails")}</p>
        </div>
      </div>

      {/* Course Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t("courseInformation")}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("courseName")}</h4>
                  <p className="mt-1 text-sm text-gray-900">{course.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("description")}</h4>
                  <p className="mt-1 text-sm text-gray-900">{course.description || t("noDescription")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("monthlyFee")}</h4>
                    <p className="mt-1 text-sm text-gray-900">{course.monthlyFee}€</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("courseType")}</h4>
                    <p className="mt-1">
                      <Badge variant={course.type === "dance" ? "green" : course.type === "music" ? "blue" : "yellow"} className="flex w-fit items-center">
                        {t(course.type)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("status")}</h4>
                    <p className="mt-1">
                      <Badge variant={course.active ? "success" : "outline"} className="flex w-fit items-center">
                        {course.active ? t("active") : t("inactive")}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t("summary")}</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="text-primary mr-2 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">{t("totalStudents")}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loadingEnrollments ? <Skeleton className="h-4 w-8" /> : enrollments?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="text-primary mr-2 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">{t("classes")}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loadingClasses ? <Skeleton className="h-4 w-8" /> : classes?.length || 0}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/courses/${id}/edit`}>
                    <Edit className="mr-1 h-4 w-4" />
                    {t("edit")}
                  </Link>
                </Button>
                <Button size="sm" onClick={handleAddClass}>
                  <PlusCircle className="mr-1 h-4 w-4" />
                  {t("addClass")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="classes" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="classes" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("classes")}
            {!loadingClasses && classes && (
              <Badge variant="outline" className="ml-2">
                {classes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            {t("students")}
            {!loadingEnrollments && enrollments && (
              <Badge variant="outline" className="ml-2">
                {enrollments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {t("schedule")}
          </TabsTrigger>
        </TabsList>

        {/* Classes Tab */}
        <TabsContent value="classes">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <CardTitle>{t("classesList")}</CardTitle>
                <Button size="sm" onClick={handleAddClass}>
                  <PlusCircle className="mr-1 h-4 w-4" />
                  {t("addClass")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingClasses ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !classes || classes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("noClassesYet")}</p>
                  <Button size="sm" onClick={handleAddClass} className="mt-4">
                    {t("createFirstClass")}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("className")}</TableHead>
                      <TableHead>{t("level")}</TableHead>
                      <TableHead>{t("ageRange")}</TableHead>
                      <TableHead>{t("students")}</TableHead>
                      <TableHead>{t("schedule")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell className="font-medium">{classItem.name}</TableCell>
                        <TableCell>
                          <Badge variant={getLevelBadgeColor(classItem.level)} className="flex w-fit items-center">
                            {t(classItem.level)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {classItem.minAge && classItem.maxAge 
                            ? `${classItem.minAge}-${classItem.maxAge} ${t("years")}`
                            : classItem.minAge 
                              ? `${t("from")} ${classItem.minAge} ${t("years")}`
                              : classItem.maxAge 
                                ? `${t("to")} ${classItem.maxAge} ${t("years")}`
                                : t("allAges")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium">{getClassStudentCount(classItem.id)}</span>
                            {classItem.maxStudents && (
                              <span className="text-gray-500 text-sm ml-1">/ {classItem.maxStudents}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {classItem.schedule ? formatClassSchedule(classItem.schedule) : t("noSchedule")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditClass(classItem)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDeleteClass(classItem)}>
                              <Trash className="h-4 w-4" />
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
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <CardTitle>{t("studentsList")}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setIsImportStudentsOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {t("importStudents")}
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/students/new?courseId=${id}`}>
                      <PlusCircle className="mr-1 h-4 w-4" />
                      {t("addStudent")}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingStudents || loadingEnrollments ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !enrollments || enrollments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("noStudentsYet")}</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href={`/students/new?courseId=${id}`}>
                      {t("addFirstStudent")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("student")}</TableHead>
                      <TableHead>{t("contact")}</TableHead>
                      <TableHead>{t("class")}</TableHead>
                      <TableHead>{t("guardian")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => {
                      const student = getStudentById(enrollment.studentId);
                      const classItem = getClassById(enrollment.classId);
                      
                      if (!student || !classItem) return null;
                      
                      return (
                        <TableRow key={enrollment.id}>
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
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getLevelBadgeColor(classItem.level)} className="flex w-fit items-center">
                              {classItem.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {student.guardianName || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="icon" asChild>
                                <Link href={`/students/${student.id}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </Link>
                              </Button>
                              <Button variant="outline" size="icon" asChild>
                                <Link href={`/students/${student.id}/edit`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>{t("weeklySchedule")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingClasses ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : !classes || classes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("noClassesScheduled")}</p>
                  <Button size="sm" onClick={handleAddClass} className="mt-4">
                    {t("addClassToSchedule")}
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg overflow-hidden">
                  <div className="grid grid-cols-8 gap-px bg-gray-200">
                    {/* Header */}
                    <div className="bg-gray-100 h-12 flex items-center justify-center"></div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("monday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("tuesday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("wednesday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("thursday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("friday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("saturday")}</div>
                    <div className="bg-gray-50 h-12 flex items-center justify-center font-medium text-gray-900">{t("sunday")}</div>
                    
                    {/* Time slots */}
                    {['17:00-18:30', '18:30-20:00', '20:00-21:30'].map((timeSlot, index) => (
                      <>
                        <div key={`time-${index}`} className="bg-white h-20 p-1 border-t border-gray-200">
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs text-gray-500">{timeSlot}</span>
                          </div>
                        </div>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, dayIndex) => {
                          // Find classes that have this day and time slot
                          const classesForSlot = classes.filter(c => 
                            c.schedule && c.schedule.some(s => 
                              s.day.toLowerCase() === day && 
                              s.startTime <= timeSlot.split('-')[0] && 
                              s.endTime >= timeSlot.split('-')[1]
                            )
                          );
                          
                          return (
                            <div key={`${day}-${index}`} className="bg-white h-20 p-1 border-t border-gray-200">
                              {classesForSlot.length > 0 ? (
                                <div className={`h-full rounded-md bg-${getLevelBadgeColor(classesForSlot[0].level)}-100 p-2 flex flex-col`}>
                                  <span className={`text-xs font-medium text-${getLevelBadgeColor(classesForSlot[0].level)}-800`}>
                                    {classesForSlot[0].name}
                                  </span>
                                  <span className={`text-xs text-${getLevelBadgeColor(classesForSlot[0].level)}-600`}>
                                    {classesForSlot[0].schedule?.find(s => s.day.toLowerCase() === day)?.startTime} - {classesForSlot[0].schedule?.find(s => s.day.toLowerCase() === day)?.endTime}
                                  </span>
                                  <span className={`text-xs text-${getLevelBadgeColor(classesForSlot[0].level)}-600`}>
                                    {classesForSlot[0].schedule?.find(s => s.day.toLowerCase() === day)?.location || ""}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Class Form Dialog */}
      <Dialog open={isClassFormOpen} onOpenChange={setIsClassFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? t("editClass") : t("createClass")}
            </DialogTitle>
          </DialogHeader>
          <ClassForm
            classData={selectedClass}
            courseId={id}
            onSubmit={handleClassFormSubmit}
            isSubmitting={createClassMutation.isPending || updateClassMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation */}
      <AlertDialog open={isDeleteClassOpen} onOpenChange={setIsDeleteClassOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteClassConfirmation")} <strong>{selectedClass?.name}</strong>?
              {t("thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedClass && deleteClassMutation.mutate(selectedClass.id)}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Students Dialog */}
      <Dialog open={isImportStudentsOpen} onOpenChange={setIsImportStudentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("importStudents")}</DialogTitle>
          </DialogHeader>
          <StudentImport courseId={id} onSuccess={() => setIsImportStudentsOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
