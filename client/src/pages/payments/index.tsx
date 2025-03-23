import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, CreditCard, PlusCircle, Calendar, Search, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { Course, SchoolYear, Student, Class, Payment } from "@shared/schema";

interface MonthOption {
  value: string;
  label: string;
  month: number;
  year: number;
}

export default function Payments() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  
  const { toast } = useToast();

  // Get months options (current month and 11 previous months)
  const monthOptions: MonthOption[] = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    return {
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `${date.toLocaleString('el-GR', { month: 'long' })} ${date.getFullYear()}`,
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  });

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  // Fetch active school year
  const { data: schoolYears } = useQuery<SchoolYear[]>({
    queryKey: ['/api/school-years'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchSchoolYears"),
        variant: "destructive",
      });
    }
  });

  const activeSchoolYear = schoolYears?.find(year => year.active);

  // Fetch courses
  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/courses', activeSchoolYear?.id],
    queryFn: async () => {
      if (!activeSchoolYear) return [];
      const res = await fetch(`/api/courses?schoolYearId=${activeSchoolYear.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    },
    enabled: !!activeSchoolYear,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchCourses"),
        variant: "destructive",
      });
    }
  });

  // Reset selected class when course changes
  useEffect(() => {
    setSelectedClass("");
  }, [selectedCourse]);

  // Fetch classes for selected course
  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes', selectedCourse ? parseInt(selectedCourse) : undefined],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const res = await fetch(`/api/classes?courseId=${selectedCourse}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch classes');
      return res.json();
    },
    enabled: !!selectedCourse,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchClasses"),
        variant: "destructive",
      });
    }
  });

  // Fetch all students
  const { data: allStudents, isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchStudents"),
        variant: "destructive",
      });
    }
  });

  // Fetch payments for the selected month
  const { data: payments, isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: ['/api/payments', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      
      const [month, year] = selectedMonth.split('-').map(Number);
      const url = `/api/payments?month=${month}&year=${year}`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    enabled: !!selectedMonth,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchPayments"),
        variant: "destructive",
      });
    }
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      studentId: number;
      courseId: number;
      amount: number;
      month: number;
      year: number;
      paymentDate: string;
    }) => {
      return apiRequest('POST', '/api/payments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedStudent(null);
      toast({
        title: t("success"),
        description: t("paymentCreated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToCreatePayment"),
        variant: "destructive",
      });
    }
  });

  // Filter students based on search and filters
  useEffect(() => {
    if (!allStudents) {
      setFilteredStudents([]);
      return;
    }

    let filtered = [...allStudents];

    // Filter by course/class if selected
    if (selectedClass) {
      // Would normally fetch enrollments for this class
      // and filter students, but for simplicity we'll just filter by name
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.firstName.toLowerCase().includes(term) ||
        student.lastName.toLowerCase().includes(term) ||
        student.phone.includes(searchTerm)
      );
    }

    setFilteredStudents(filtered);
  }, [allStudents, selectedClass, searchTerm]);

  // Get month and year from selected month
  const getMonthAndYear = () => {
    if (!selectedMonth) return { month: 0, year: 0 };
    const [month, year] = selectedMonth.split('-').map(Number);
    return { month, year };
  };

  // Check if a student has paid for a course in the selected month
  const hasStudentPaid = (studentId: number, courseId: number) => {
    if (!payments) return false;
    
    const { month, year } = getMonthAndYear();
    
    return payments.some(payment => 
      payment.studentId === studentId &&
      payment.courseId === courseId &&
      payment.month === month &&
      payment.year === year
    );
  };

  // Get course by id
  const getCourseById = (id: number) => {
    return courses?.find(course => course.id === id);
  };

  // Handle opening payment dialog for a student
  const handleOpenPaymentDialog = (student: Student) => {
    setSelectedStudent(student);
    
    // Set default payment amount to the course's monthly fee if a course is selected
    if (selectedCourse) {
      const course = getCourseById(parseInt(selectedCourse));
      if (course) {
        setPaymentAmount(course.monthlyFee.toString());
      }
    }
    
    setIsPaymentDialogOpen(true);
  };

  // Handle creating a payment
  const handleCreatePayment = () => {
    if (!selectedStudent || !selectedCourse || !paymentAmount) {
      toast({
        title: t("error"),
        description: t("pleaseFillAllFields"),
        variant: "destructive",
      });
      return;
    }
    
    const { month, year } = getMonthAndYear();
    
    if (!month || !year) {
      toast({
        title: t("error"),
        description: t("invalidMonthOrYear"),
        variant: "destructive",
      });
      return;
    }
    
    createPaymentMutation.mutate({
      studentId: selectedStudent.id,
      courseId: parseInt(selectedCourse),
      amount: parseInt(paymentAmount),
      month,
      year,
      paymentDate: new Date().toISOString().split('T')[0]
    });
  };

  const isLoading = loadingCourses || loadingClasses || loadingStudents || loadingPayments;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("payments")}</h1>
        <p className="text-sm text-gray-600">{t("paymentsDescription")}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="payment-month" className="block text-sm font-medium text-gray-700 mb-1">
                {t("month")}
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="payment-month">
                  <SelectValue placeholder={t("selectMonth")} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="payment-course" className="block text-sm font-medium text-gray-700 mb-1">
                {t("course")}
              </label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="payment-course">
                  <SelectValue placeholder={t("selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingCourses ? (
                    <div className="p-2">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : courses && courses.length > 0 ? (
                    courses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-sm">{t("noCourses")}</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="payment-class" className="block text-sm font-medium text-gray-700 mb-1">
                {t("class")}
              </label>
              <Select 
                value={selectedClass} 
                onValueChange={setSelectedClass} 
                disabled={!selectedCourse}
              >
                <SelectTrigger id="payment-class">
                  <SelectValue placeholder={selectedCourse ? t("selectClass") : t("selectCourseFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingClasses ? (
                    <div className="p-2">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : classes && classes.length > 0 ? (
                    classes.map(classItem => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-sm">
                      {selectedCourse ? t("noClasses") : t("selectCourseFirst")}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="payment-search" className="block text-sm font-medium text-gray-700 mb-1">
                {t("search")}
              </label>
              <div className="relative">
                <Input
                  id="payment-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("searchStudents")}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students & Payments Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center">
            <CardTitle>{t("studentPayments")}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("filter")}
              </Button>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("recordPayment")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !allStudents || allStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("noStudents")}</p>
            </div>
          ) : filteredStudents.length === 0 && searchTerm ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("noStudentsMatchingSearch")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student")}</TableHead>
                  <TableHead>{t("contact")}</TableHead>
                  <TableHead>{t("course")}</TableHead>
                  <TableHead>{t("monthlyFee")}</TableHead>
                  <TableHead>{t("paymentStatus")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => {
                  const hasPaid = selectedCourse ? hasStudentPaid(student.id, parseInt(selectedCourse)) : false;
                  const course = selectedCourse ? getCourseById(parseInt(selectedCourse)) : null;
                  
                  return (
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
                        {course ? course.name : selectedCourse ? t("loading") : t("selectCourse")}
                      </TableCell>
                      <TableCell>
                        {course ? `${course.monthlyFee}€` : "—"}
                      </TableCell>
                      <TableCell>
                        {selectedCourse ? (
                          hasPaid ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              {t("paid")}
                            </div>
                          ) : (
                            <div className="text-amber-600">
                              {t("pending")}
                            </div>
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(student)}
                          disabled={!selectedCourse || !selectedMonth || hasPaid}
                        >
                          <CreditCard className="mr-1 h-4 w-4" />
                          {t("recordPayment")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("recentPayments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("noPaymentsForSelectedMonth")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student")}</TableHead>
                  <TableHead>{t("course")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("month")}</TableHead>
                  <TableHead>{t("paymentDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 5).map(payment => {
                  const student = allStudents?.find(s => s.id === payment.studentId);
                  const course = courses?.find(c => c.id === payment.courseId);
                  const monthName = new Date(payment.year, payment.month - 1).toLocaleString('el-GR', { month: 'long' });
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {student ? `${student.firstName} ${student.lastName}` : t("unknownStudent")}
                      </TableCell>
                      <TableCell>
                        {course ? course.name : t("unknownCourse")}
                      </TableCell>
                      <TableCell>
                        {payment.amount}€
                      </TableCell>
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

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedStudent && (
              <div>
                <Label>{t("student")}</Label>
                <div className="flex items-center mt-1 p-2 bg-gray-50 rounded-md">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="font-medium text-gray-600">
                      {selectedStudent.firstName.charAt(0)}{selectedStudent.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-2">
                    <div className="text-sm font-medium">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label>{t("course")}</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!courses}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses && courses.map(course => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t("month")}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("selectMonth")} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t("amount")} (€)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleCreatePayment} 
                disabled={!selectedStudent || !selectedCourse || !paymentAmount || !selectedMonth || createPaymentMutation.isPending} 
                className="w-full"
              >
                {createPaymentMutation.isPending ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("saving")}
                  </div>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t("savePayment")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
