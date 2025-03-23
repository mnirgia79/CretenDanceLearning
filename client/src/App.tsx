import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth.jsx";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SchoolYears from "@/pages/school-years/index";
import Courses from "@/pages/courses/index";
import CourseDetails from "@/pages/courses/course-details";
import Students from "@/pages/students/index";
import StudentDetails from "@/pages/students/student-details";
import Attendance from "@/pages/attendance/index";
import Payments from "@/pages/payments/index";

import { MainLayout } from "@/components/layout/main-layout";
import { i18n } from "@/lib/i18n";

function Router() {
  // Set up Greek language
  i18n.setup();

  // Get current location for auth redirect
  const [location] = useLocation();
  
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </Route>
      <Route path="/school-years">
        <MainLayout>
          <SchoolYears />
        </MainLayout>
      </Route>
      <Route path="/courses">
        <MainLayout>
          <Courses />
        </MainLayout>
      </Route>
      <Route path="/courses/:id">
        {(params) => (
          <MainLayout>
            <CourseDetails id={Number(params.id)} />
          </MainLayout>
        )}
      </Route>
      <Route path="/students">
        <MainLayout>
          <Students />
        </MainLayout>
      </Route>
      <Route path="/students/:id">
        {(params) => (
          <MainLayout>
            <StudentDetails id={Number(params.id)} />
          </MainLayout>
        )}
      </Route>
      <Route path="/attendance">
        <MainLayout>
          <Attendance />
        </MainLayout>
      </Route>
      <Route path="/payments">
        <MainLayout>
          <Payments />
        </MainLayout>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
