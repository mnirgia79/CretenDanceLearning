import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, UsersIcon, BookOpenIcon, CheckSquareIcon, CreditCardIcon } from "lucide-react";
import { SchoolYear, Course, Student } from "@shared/schema";
import { Link } from "wouter";

export default function Dashboard() {
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
    queryKey: ['/api/courses'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchCourses"),
        variant: "destructive",
      });
    }
  });

  const { data: students, isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToFetchStudents"),
        variant: "destructive",
      });
    }
  });

  // Get active school year
  const activeSchoolYear = schoolYears?.find(year => year.active);

  // Get courses for active school year
  const activeCourses = courses?.filter(course => 
    course.schoolYearId === activeSchoolYear?.id && course.active
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("dashboard")}</h1>
          <p className="text-sm text-gray-600">{t("welcomeToDashboard")}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("activeSchoolYear")}</CardTitle>
            <CalendarIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingYears ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {activeSchoolYear ? activeSchoolYear.name : t("noActiveYear")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("totalCourses")}</CardTitle>
            <BookOpenIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingCourses ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {activeCourses?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("totalStudents")}</CardTitle>
            <UsersIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {students?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t("activeClasses")}</CardTitle>
            <CheckSquareIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCourses ? <Skeleton className="h-8 w-24" /> : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <h2 className="text-xl font-semibold mb-4">{t("quickAccess")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/courses">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <BookOpenIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t("manageCourses")}</h3>
                <p className="text-sm text-gray-500 mt-2">{t("manageCoursesDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/students">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t("manageStudents")}</h3>
                <p className="text-sm text-gray-500 mt-2">{t("manageStudentsDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/attendance">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <CheckSquareIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t("trackAttendance")}</h3>
                <p className="text-sm text-gray-500 mt-2">{t("trackAttendanceDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Payments (Placeholder for now) */}
      <h2 className="text-xl font-semibold mb-4">{t("recentPayments")}</h2>
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 py-6">
            <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t("noRecentPayments")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
