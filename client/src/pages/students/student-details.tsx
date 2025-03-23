import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { Student, Enrollment, Class, Course, Attendance, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, BookOpen, Edit, Phone, Mail, User, CreditCard, CalendarDays, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface StudentDetailsProps {
  id: number;
}

export default function StudentDetails({ id }: StudentDetailsProps) {
  const [isDeleteEnrollmentOpen, setIsDeleteEnrollmentOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch student details
  const { data: student, isLoading: loadingStudent } = useQuery<Student>({
    queryKey: [`/api/students/${id}`],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchStudentDetails"),
        variant: "destructive",
      });
      navigate("/students");
    }
  });

  // Fetch enrollments for this student
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ['/api/enrollments', id],
    queryFn: async () => {
      const res = await fetch(`/api/enrollments?studentId=${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch enrollments');
      return res.json();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchEnrollments"),
        variant: "destructive",
      });
    }
  });

  // Fetch classes for the enrollments
  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes', 'student', id],
    queryFn: async () => {
      if (!enrollments || enrollments.length === 0) return [];
      
      const classIds = [...new Set(enrollments.map(e => e.classId))];
      const classesPromises = classIds.map(classId => 
        fetch(`/api/classes/${classId}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
      );
      
      const allClasses = await Promise.all(classesPromises);
      return allClasses.filter(c => c !== null);
    },
    enabled: !!enrollments && enrollments.length > 0,
  });

  // Fetch courses for the classes
  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/courses', 'student', id],
    queryFn: async () => {
      if (!classes || classes.length === 0) return [];
      
      const courseIds = [...new Set(classes.map(c => c.courseId))];
      const coursesPromises = courseIds.map(courseId => 
        fetch(`/api/courses/${courseId}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
      );
      
      const allCourses = await Promise.all(coursesPromises);
      return allCourses.filter(c => c !== null);
    },
    enabled: !!classes && classes.length > 0,
  });

  // Fetch attendance records
  const { data: attendance, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/student', id],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/student/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchAttendance"),
        variant: "destructive",
      });
    }
  });

  // Fetch payment records
  const { data: payments, isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: ['/api/payments', id],
    queryFn: async () => {
      const res = await fetch(`/api/payments?studentId=${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchPayments"),
        variant: "destructive",
      });
    }
  });

  // Delete enrollment mutation
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      return apiRequest('DELETE', `/api/enrollments/${enrollmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments', id] });
      setIsDeleteEnrollmentOpen(false);
      toast({
        title: t("success"),
        description: t("enrollmentDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToDeleteEnrollment"),
        variant: "destructive",
      });
    }
  });

  // Handle delete enrollment
  const handleDeleteEnrollment = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsDeleteEnrollmentOpen(true);
  };

  // Helper function to get class by id
  const getClassById = (classId: number) => {
    return classes?.find(c => c.id === classId);
  };

  // Helper function to get course by id
  const getCourseById = (courseId: number) => {
    return courses?.find(c => c.id === courseId);
  };

  // Helper function to get course name for a class
  const getCourseNameForClass = (classItem: Class) => {
    const course = getCourseById(classItem.courseId);
    return course ? course.name : "";
  };

  // Helper function to format level badge
  const getLevelBadge = (level: string) => {
    let color = "";
    switch (level) {
      case "beginner":
        color = "green";
        break;
      case "intermediate":
        color = "blue";
        break;
      case "advanced":
        color = "purple";
        break;
      default:
        color = "default";
    }
    return <Badge variant={color as any}>{t(level)}</Badge>;
  };

  // Group attendance by class
  const attendanceByClass = attendance?.reduce<Record<number, Attendance[]>>((acc, record) => {
    if (!acc[record.classId]) {
      acc[record.classId] = [];
    }
    acc[record.classId].push(record);
    return acc;
  }, {}) || {};

  if (loadingStudent) {
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

  if (!student) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-3">
          <Link href="/students">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-gray-600">{t("studentDetails")}</p>
        </div>
      </div>

      {/* Student Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t("studentInformation")}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("firstName")}</h4>
                    <p className="mt-1 text-sm text-gray-900">{student.firstName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("lastName")}</h4>
                    <p className="mt-1 text-sm text-gray-900">{student.lastName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("phone")}</h4>
                    <p className="mt-1 text-sm text-gray-900">{student.phone}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("email")}</h4>
                    <p className="mt-1 text-sm text-gray-900">{student.email || "—"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("guardian")}</h4>
                  <p className="mt-1 text-sm text-gray-900">{student.guardianName || t("noGuardian")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("joinedOn")}</h4>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(student.createdAt), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t("summary")}</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="text-primary mr-2 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">{t("enrolledCourses")}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loadingEnrollments ? <Skeleton className="h-4 w-8" /> : enrollments?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarDays className="text-primary mr-2 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">{t("attendanceRate")}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loadingAttendance ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      attendance && attendance.length > 0 ? (
                        `${Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)}%`
                      ) : "—"
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="text-primary mr-2 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">{t("paymentStatus")}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loadingPayments ? <Skeleton className="h-4 w-8" /> : payments && payments.length > 0 ? t("paid") : t("noPayments")}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/students/${id}/edit`}>
                    <Edit className="mr-1 h-4 w-4" />
                    {t("edit")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${student.phone}`}>
                    <Phone className="mr-1 h-4 w-4" />
                    {t("call")}
                  </a>
                </Button>
                {student.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${student.email}`}>
                      <Mail className="mr-1 h-4 w-4" />
                      {t("email")}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="courses">
        <TabsList className="mb-4">
          <TabsTrigger value="courses" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("enrolledCourses")}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4" />
            {t("attendance")}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            {t("payments")}
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>{t("enrolledCourses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEnrollments || loadingClasses || loadingCourses ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !enrollments || enrollments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("notEnrolledInAnyCourses")}</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/courses">
                      {t("browseCourses")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("course")}</TableHead>
                      <TableHead>{t("class")}</TableHead>
                      <TableHead>{t("level")}</TableHead>
                      <TableHead>{t("enrollmentDate")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map(enrollment => {
                      const classData = getClassById(enrollment.classId);
                      if (!classData) return null;

                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {getCourseNameForClass(classData)}
                          </TableCell>
                          <TableCell>{classData.name}</TableCell>
                          <TableCell>
                            {getLevelBadge(classData.level)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(enrollment.enrolledAt), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={enrollment.active ? "success" : "outline"}>
                              {enrollment.active ? t("active") : t("inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="icon" asChild>
                                <Link href={`/courses/${classData.courseId}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </Link>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => handleDeleteEnrollment(enrollment)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
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

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttendance || loadingClasses ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !attendance || attendance.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarDays className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("noAttendanceRecords")}</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/attendance">
                      {t("manageAttendance")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(attendanceByClass).map(([classId, records]) => {
                    const classData = getClassById(parseInt(classId));
                    if (!classData) return null;

                    // Sort records by date (newest first)
                    const sortedRecords = [...records].sort((a, b) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    return (
                      <div key={classId} className="space-y-3">
                        <h3 className="font-medium text-base">
                          {getCourseNameForClass(classData)} - {classData.name}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("date")}</TableHead>
                              <TableHead>{t("present")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedRecords.map(record => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {format(new Date(record.date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell>
                                  {record.present ? (
                                    <span className="flex items-center text-green-600">
                                      <Check className="h-4 w-4 mr-1" /> {t("present")}
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-red-600">
                                      <X className="h-4 w-4 mr-1" /> {t("absent")}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>{t("paymentHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !payments || payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>{t("noPaymentRecords")}</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/payments">
                      {t("recordPayment")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("course")}</TableHead>
                      <TableHead>{t("amount")}</TableHead>
                      <TableHead>{t("period")}</TableHead>
                      <TableHead>{t("paymentDate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => {
                      const course = getCourseById(payment.courseId);
                      const monthName = new Date(payment.year, payment.month - 1).toLocaleString('el-GR', { month: 'long' });
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {course?.name || t("unknownCourse")}
                          </TableCell>
                          <TableCell>{payment.amount}€</TableCell>
                          <TableCell>
                            {monthName} {payment.year}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
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
      </Tabs>

      {/* Delete Enrollment Confirmation */}
      <AlertDialog open={isDeleteEnrollmentOpen} onOpenChange={setIsDeleteEnrollmentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteEnrollmentConfirmation")}
              {t("thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedEnrollment && deleteEnrollmentMutation.mutate(selectedEnrollment.id)}
              disabled={deleteEnrollmentMutation.isPending}
            >
              {deleteEnrollmentMutation.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
