import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
import { zfd } from "zod-form-data";
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";

import {
  insertUserSchema,
  insertSchoolYearSchema,
  insertCourseSchema,
  insertClassSchema,
  insertStudentSchema,
  insertEnrollmentSchema,
  insertAttendanceSchema,
  insertPaymentSchema
} from "@shared/schema";

const MemorySessionStore = MemoryStore(session);

// Helper to authenticate API routes
const authenticate = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'cretanclubsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000, // 24 hours
    },
    store: new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  }));

  // Configure file upload middleware
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) { // In production, use proper password comparison
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user session
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin;
      
      // Return user info (excluding password)
      const { password: _, ...userInfo } = user;
      res.json({ user: userInfo });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userInfo } = user;
      res.json({ user: userInfo });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // User management routes (Admin only)
  app.post("/api/users", authenticate, async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Unauthorized - Admin rights required" });
      }
      
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      
      // Don't return the password
      const { password: _, ...userInfo } = user;
      res.status(201).json(userInfo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // School Year routes
  app.get("/api/school-years", authenticate, async (req, res) => {
    try {
      const schoolYears = await storage.getSchoolYears();
      res.json(schoolYears);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch school years" });
    }
  });
  
  app.get("/api/school-years/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schoolYear = await storage.getSchoolYear(id);
      
      if (!schoolYear) {
        return res.status(404).json({ message: "School year not found" });
      }
      
      res.json(schoolYear);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch school year" });
    }
  });
  
  app.post("/api/school-years", authenticate, async (req, res) => {
    try {
      const validatedData = insertSchoolYearSchema.parse(req.body);
      const schoolYear = await storage.createSchoolYear(validatedData);
      res.status(201).json(schoolYear);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create school year" });
    }
  });
  
  app.put("/api/school-years/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSchoolYearSchema.partial().parse(req.body);
      
      const updatedSchoolYear = await storage.updateSchoolYear(id, validatedData);
      
      if (!updatedSchoolYear) {
        return res.status(404).json({ message: "School year not found" });
      }
      
      res.json(updatedSchoolYear);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update school year" });
    }
  });
  
  app.delete("/api/school-years/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSchoolYear(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "School year not found" });
      }
      
      res.json({ message: "School year deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete school year" });
    }
  });
  
  // Course routes
  app.get("/api/courses", authenticate, async (req, res) => {
    try {
      const schoolYearId = req.query.schoolYearId 
        ? parseInt(req.query.schoolYearId as string) 
        : undefined;
      
      const courses = await storage.getCourses(schoolYearId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });
  
  app.get("/api/courses/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });
  
  app.post("/api/courses", authenticate, async (req, res) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validatedData);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course" });
    }
  });
  
  app.put("/api/courses/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseSchema.partial().parse(req.body);
      
      const updatedCourse = await storage.updateCourse(id, validatedData);
      
      if (!updatedCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update course" });
    }
  });
  
  app.delete("/api/courses/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCourse(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });
  
  // Class routes
  app.get("/api/classes", authenticate, async (req, res) => {
    try {
      const courseId = req.query.courseId 
        ? parseInt(req.query.courseId as string) 
        : undefined;
      
      const classes = await storage.getClasses(courseId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });
  
  app.get("/api/classes/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const classData = await storage.getClass(id);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.json(classData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });
  
  app.post("/api/classes", authenticate, async (req, res) => {
    try {
      const validatedData = insertClassSchema.parse(req.body);
      const classData = await storage.createClass(validatedData);
      res.status(201).json(classData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });
  
  app.put("/api/classes/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClassSchema.partial().parse(req.body);
      
      const updatedClass = await storage.updateClass(id, validatedData);
      
      if (!updatedClass) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.json(updatedClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update class" });
    }
  });
  
  app.delete("/api/classes/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClass(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete class" });
    }
  });
  
  // Student routes
  app.get("/api/students", authenticate, async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });
  
  app.get("/api/students/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getStudent(id);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });
  
  app.post("/api/students", authenticate, async (req, res) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });
  
  app.post("/api/students/import", authenticate, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer.toString('utf-8');
      const records = parseCsv(fileBuffer, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Validate each record
      const students: any[] = [];
      const errors: any[] = [];
      
      records.forEach((record: any, index: number) => {
        try {
          // Map CSV columns to expected schema
          const studentData = {
            firstName: record.firstName || record['First Name'] || record['Όνομα'],
            lastName: record.lastName || record['Last Name'] || record['Επώνυμο'],
            phone: record.phone || record['Phone'] || record['Τηλέφωνο'],
            email: record.email || record['Email'] || record['Email'],
            guardianName: record.guardianName || record['Guardian Name'] || record['Κηδεμόνας'] || undefined
          };
          
          const validatedStudent = insertStudentSchema.parse(studentData);
          students.push(validatedStudent);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push({
              row: index + 1,
              errors: error.errors
            });
          } else {
            errors.push({
              row: index + 1,
              message: "Invalid data format"
            });
          }
        }
      });
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Invalid data in CSV file", 
          errors,
          totalErrors: errors.length,
          totalRecords: records.length
        });
      }
      
      // Import students
      const createdStudents = await storage.createManyStudents(students);
      
      res.status(201).json({ 
        message: "Students imported successfully",
        count: createdStudents.length,
        students: createdStudents
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  });
  
  app.put("/api/students/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStudentSchema.partial().parse(req.body);
      
      const updatedStudent = await storage.updateStudent(id, validatedData);
      
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(updatedStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update student" });
    }
  });
  
  app.delete("/api/students/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStudent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });
  
  // Enrollment routes
  app.get("/api/enrollments", authenticate, async (req, res) => {
    try {
      const studentId = req.query.studentId 
        ? parseInt(req.query.studentId as string) 
        : undefined;
      
      const classId = req.query.classId 
        ? parseInt(req.query.classId as string) 
        : undefined;
      
      const enrollments = await storage.getEnrollments(studentId, classId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });
  
  app.post("/api/enrollments", authenticate, async (req, res) => {
    try {
      const validatedData = insertEnrollmentSchema.parse(req.body);
      const enrollment = await storage.createEnrollment(validatedData);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });
  
  app.put("/api/enrollments/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEnrollmentSchema.partial().parse(req.body);
      
      const updatedEnrollment = await storage.updateEnrollment(id, validatedData);
      
      if (!updatedEnrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      res.json(updatedEnrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update enrollment" });
    }
  });
  
  app.delete("/api/enrollments/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEnrollment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      res.json({ message: "Enrollment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete enrollment" });
    }
  });
  
  // Attendance routes
  app.get("/api/attendance", authenticate, async (req, res) => {
    try {
      if (!req.query.classId) {
        return res.status(400).json({ message: "Class ID is required" });
      }
      
      const classId = parseInt(req.query.classId as string);
      const date = req.query.date 
        ? new Date(req.query.date as string) 
        : undefined;
      
      const attendanceRecords = await storage.getAttendance(classId, date);
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });
  
  app.get("/api/attendance/student/:studentId", authenticate, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const classId = req.query.classId 
        ? parseInt(req.query.classId as string) 
        : undefined;
      
      const attendanceRecords = await storage.getStudentAttendance(studentId, classId);
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student attendance" });
    }
  });
  
  app.post("/api/attendance", authenticate, async (req, res) => {
    try {
      const validatedData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create attendance record" });
    }
  });
  
  app.post("/api/attendance/bulk", authenticate, async (req, res) => {
    try {
      const { records } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "Records array is required" });
      }
      
      // Validate each record
      const validatedRecords = [];
      
      for (const record of records) {
        try {
          const validRecord = insertAttendanceSchema.parse(record);
          validatedRecords.push(validRecord);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              message: "Invalid attendance record", 
              errors: error.errors, 
              record 
            });
          }
          throw error;
        }
      }
      
      const results = await storage.bulkUpdateAttendance(validatedRecords);
      
      res.status(201).json({
        message: "Attendance records updated",
        count: results.length,
        records: results
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance records" });
    }
  });
  
  app.put("/api/attendance/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAttendanceSchema.partial().parse(req.body);
      
      const updatedAttendance = await storage.updateAttendance(id, validatedData);
      
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(updatedAttendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update attendance record" });
    }
  });
  
  // Payment routes
  app.get("/api/payments", authenticate, async (req, res) => {
    try {
      const studentId = req.query.studentId 
        ? parseInt(req.query.studentId as string) 
        : undefined;
      
      const courseId = req.query.courseId 
        ? parseInt(req.query.courseId as string) 
        : undefined;
      
      const month = req.query.month 
        ? parseInt(req.query.month as string) 
        : undefined;
      
      const year = req.query.year 
        ? parseInt(req.query.year as string) 
        : undefined;
      
      const payments = await storage.getPayments(studentId, courseId, month, year);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  
  app.get("/api/payments/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });
  
  app.post("/api/payments", authenticate, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  
  app.put("/api/payments/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      
      const updatedPayment = await storage.updatePayment(id, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment" });
    }
  });
  
  app.delete("/api/payments/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePayment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
