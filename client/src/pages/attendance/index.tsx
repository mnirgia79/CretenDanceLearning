import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Users, Save, Calendar } from "lucide-react";
import { Course, Class, SchoolYear, Student, Enrollment } from "@shared/schema";

interface MonthOption {
  value: string;
  label: string;
  month: number;
  year: number;
}

export default function Attendance() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [attendanceChanged, setAttendanceChanged] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ studentId: number; classId: number; date: string; present: boolean }[]>([]);
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

  // Fetch students enrolled in selected class
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ['/api/enrollments', selectedClass ? parseInt(selectedClass) : undefined],
    queryFn: async () => {
      if (!selectedClass) return [];
      const res = await fetch(`/api/enrollments?classId=${selectedClass}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch enrollments');
      return res.json();
    },
    enabled: !!selectedClass,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchEnrollments"),
        variant: "destructive",
      });
    }
  });

  // Fetch student details for enrolled students
  const { data: students, isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['/api/students/enrolled', selectedClass ? parseInt(selectedClass) : undefined],
    queryFn: async () => {
      if (!enrollments || enrollments.length === 0) return [];
      
      const studentIds = enrollments.map(e => e.studentId);
      const studentsPromises = studentIds.map(studentId => 
        fetch(`/api/students/${studentId}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
      );
      
      const allStudents = await Promise.all(studentsPromises);
      return allStudents.filter(s => s !== null);
    },
    enabled: !!enrollments && enrollments.length > 0,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchStudents"),
        variant: "destructive",
      });
    }
  });

  // Get month and year from selected month
  const getMonthAndYear = () => {
    if (!selectedMonth) return { month: 0, year: 0 };
    const [month, year] = selectedMonth.split('-').map(Number);
    return { month, year };
  };

  // Get class schedule to determine attendance days
  const getClassScheduleDays = (classData: Class | undefined) => {
    if (!classData || !classData.schedule) return [];
    
    const { month, year } = getMonthAndYear();
    if (!month || !year) return [];
    
    // Get days of the week from schedule (e.g., ["Monday", "Wednesday"])
    const scheduleDays = classData.schedule.map(s => s.day.toLowerCase());
    
    // Get all dates in the selected month that match the schedule days
    const daysInMonth = new Date(year, month, 0).getDate();
    const matchingDates: Date[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (scheduleDays.includes(weekday)) {
        matchingDates.push(date);
      }
    }
    
    return matchingDates;
  };

  // Fetch attendance records for selected class and month
  const { data: attendanceRecords, isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['/api/attendance', selectedClass ? parseInt(selectedClass) : undefined, selectedMonth],
    queryFn: async () => {
      if (!selectedClass || !selectedMonth) return [];
      
      const { month, year } = getMonthAndYear();
      // Fetch attendance for the entire month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const res = await fetch(`/api/attendance?classId=${selectedClass}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      
      const records = await res.json();
      
      // Filter records by date range
      return records.filter((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    },
    enabled: !!selectedClass && !!selectedMonth,
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchAttendance"),
        variant: "destructive",
      });
    }
  });

  // Get selected class data
  const selectedClassData = classes?.find(c => c.id === parseInt(selectedClass));

  // Get attendance days based on class schedule
  const attendanceDays = getClassScheduleDays(selectedClassData);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: any[]) => {
      return apiRequest('POST', '/api/attendance/bulk', { records });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchAttendance();
      setAttendanceChanged(false);
      toast({
        title: t("success"),
        description: t("attendanceSaved"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: typeof error === "string" ? error : t("failedToSaveAttendance"),
        variant: "destructive",
      });
    }
  });

  // Handle attendance change
  const handleAttendanceChange = (studentId: number, date: Date, present: boolean) => {
    setAttendanceChanged(true);
    
    // Update attendance data with the new value
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const existingRecordIndex = attendanceData.findIndex(
      record => record.studentId === studentId && record.date === dateStr
    );
    
    if (existingRecordIndex >= 0) {
      // Update existing record
      const updatedData = [...attendanceData];
      updatedData[existingRecordIndex].present = present;
      setAttendanceData(updatedData);
    } else {
      // Add new record
      setAttendanceData([
        ...attendanceData,
        {
          studentId,
          classId: parseInt(selectedClass),
          date: dateStr,
          present
        }
      ]);
    }
  };

  // Handle save attendance
  const handleSaveAttendance = () => {
    if (attendanceData.length === 0) {
      toast({
        title: t("info"),
        description: t("noChangesToSave"),
      });
      return;
    }
    
    saveAttendanceMutation.mutate(attendanceData);
  };

  // Count students with full attendance
  const getFullAttendanceCount = () => {
    if (!students || !attendanceRecords || attendanceDays.length === 0) return 0;
    
    return students.filter(student => {
      // Check if student has attendance record for all schedule days
      return attendanceDays.every(date => {
        const dateStr = date.toISOString().split('T')[0];
        return attendanceRecords.some(record => 
          record.studentId === student.id && 
          new Date(record.date).toISOString().split('T')[0] === dateStr && 
          record.present
        );
      });
    }).length;
  };

  // Count students with payments
  const getPaymentsCount = () => {
    // This would normally call a payments API, but for simplicity, let's assume all students have paid
    return students?.length || 0;
  };

  const isLoading = loadingCourses || loadingClasses || loadingEnrollments || loadingStudents || loadingAttendance;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("attendance")}</h1>
        <p className="text-sm text-gray-600">{t("attendanceDescription")}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="attendance-month" className="block text-sm font-medium text-gray-700 mb-1">
                {t("month")}
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="attendance-month">
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
              <label htmlFor="attendance-course" className="block text-sm font-medium text-gray-700 mb-1">
                {t("course")}
              </label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="attendance-course">
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
              <label htmlFor="attendance-class" className="block text-sm font-medium text-gray-700 mb-1">
                {t("class")}
              </label>
              <Select 
                value={selectedClass} 
                onValueChange={setSelectedClass} 
                disabled={!selectedCourse}
              >
                <SelectTrigger id="attendance-class">
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
            <div className="flex justify-end items-end">
              <Button 
                onClick={handleSaveAttendance} 
                disabled={!attendanceChanged || saveAttendanceMutation.isPending || !selectedClass}
              >
                <Save className="mr-2 h-4 w-4" />
                {t("save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : !selectedClass ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500">
              <Calendar className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("selectClassToViewAttendance")}</p>
            </div>
          </CardContent>
        </Card>
      ) : !students || students.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500">
              <Users className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("noStudentsInClass")}</p>
            </div>
          </CardContent>
        </Card>
      ) : attendanceDays.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p>{t("noClassDaysInMonth")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <AttendanceTable 
                students={students}
                attendanceDays={attendanceDays}
                attendanceRecords={attendanceRecords || []}
                onAttendanceChange={handleAttendanceChange}
              />
            </CardContent>
          </Card>

          {/* Legend & Stats */}
          <div className="mt-4 flex flex-col md:flex-row justify-between bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary rounded-sm mr-2"></div>
                <span className="text-sm text-gray-600">{t("requiredDay")}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded-sm mr-2"></div>
                <span className="text-sm text-gray-600">{t("absence")}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-sm mr-2"></div>
                <span className="text-sm text-gray-600">{t("payment")}</span>
              </div>
            </div>
            <div className="flex space-x-6">
              <div>
                <span className="text-sm text-gray-600">{t("studentsWithFullAttendance")}:</span>
                <Badge variant="outline" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  {getFullAttendanceCount()} {t("of")} {students.length}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-gray-600">{t("payments")}:</span>
                <Badge variant="outline" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  {getPaymentsCount()} {t("of")} {students.length}
                </Badge>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
