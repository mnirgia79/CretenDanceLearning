import {
  type User, type InsertUser, 
  type SchoolYear, type InsertSchoolYear,
  type Course, type InsertCourse,
  type Class, type InsertClass,
  type Student, type InsertStudent,
  type Enrollment, type InsertEnrollment,
  type Attendance, type InsertAttendance,
  type Payment, type InsertPayment
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // School Year operations
  getSchoolYears(): Promise<SchoolYear[]>;
  getSchoolYear(id: number): Promise<SchoolYear | undefined>;
  createSchoolYear(schoolYear: InsertSchoolYear): Promise<SchoolYear>;
  updateSchoolYear(id: number, schoolYear: Partial<InsertSchoolYear>): Promise<SchoolYear | undefined>;
  deleteSchoolYear(id: number): Promise<boolean>;
  
  // Course operations
  getCourses(schoolYearId?: number): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;
  
  // Class operations
  getClasses(courseId?: number): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;
  
  // Student operations
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  createManyStudents(students: InsertStudent[]): Promise<Student[]>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  
  // Enrollment operations
  getEnrollments(studentId?: number, classId?: number): Promise<Enrollment[]>;
  getEnrollment(id: number): Promise<Enrollment | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: number, enrollment: Partial<InsertEnrollment>): Promise<Enrollment | undefined>;
  deleteEnrollment(id: number): Promise<boolean>;
  
  // Attendance operations
  getAttendance(classId: number, date?: Date): Promise<Attendance[]>;
  getStudentAttendance(studentId: number, classId?: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  bulkUpdateAttendance(records: InsertAttendance[]): Promise<Attendance[]>;
  
  // Payment operations
  getPayments(studentId?: number, courseId?: number, month?: number, year?: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private schoolYears: Map<number, SchoolYear>;
  private courses: Map<number, Course>;
  private classes: Map<number, Class>;
  private students: Map<number, Student>;
  private enrollments: Map<number, Enrollment>;
  private attendanceRecords: Map<number, Attendance>;
  private payments: Map<number, Payment>;
  
  private userId: number;
  private schoolYearId: number;
  private courseId: number;
  private classId: number;
  private studentId: number;
  private enrollmentId: number;
  private attendanceId: number;
  private paymentId: number;
  
  constructor() {
    this.users = new Map();
    this.schoolYears = new Map();
    this.courses = new Map();
    this.classes = new Map();
    this.students = new Map();
    this.enrollments = new Map();
    this.attendanceRecords = new Map();
    this.payments = new Map();
    
    this.userId = 1;
    this.schoolYearId = 1;
    this.courseId = 1;
    this.classId = 1;
    this.studentId = 1;
    this.enrollmentId = 1;
    this.attendanceId = 1;
    this.paymentId = 1;
    
    // Create a default admin user
    this.createUser({
      username: "admin",
      password: "password", // In production, this would be hashed
      name: "Διαχειριστής",
      isAdmin: true
    });

    // Initialize with sample school year
    this.createSchoolYear({
      name: "2023-2024",
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-06-30"),
      active: true
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...user, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // School Year operations
  async getSchoolYears(): Promise<SchoolYear[]> {
    return Array.from(this.schoolYears.values());
  }
  
  async getSchoolYear(id: number): Promise<SchoolYear | undefined> {
    return this.schoolYears.get(id);
  }
  
  async createSchoolYear(schoolYear: InsertSchoolYear): Promise<SchoolYear> {
    const id = this.schoolYearId++;
    const newSchoolYear: SchoolYear = { ...schoolYear, id, createdAt: new Date() };
    this.schoolYears.set(id, newSchoolYear);
    return newSchoolYear;
  }
  
  async updateSchoolYear(id: number, schoolYear: Partial<InsertSchoolYear>): Promise<SchoolYear | undefined> {
    const existingSchoolYear = this.schoolYears.get(id);
    if (!existingSchoolYear) return undefined;
    
    const updatedSchoolYear = { ...existingSchoolYear, ...schoolYear };
    this.schoolYears.set(id, updatedSchoolYear);
    return updatedSchoolYear;
  }
  
  async deleteSchoolYear(id: number): Promise<boolean> {
    return this.schoolYears.delete(id);
  }
  
  // Course operations
  async getCourses(schoolYearId?: number): Promise<Course[]> {
    let courses = Array.from(this.courses.values());
    if (schoolYearId) {
      courses = courses.filter(course => course.schoolYearId === schoolYearId);
    }
    return courses;
  }
  
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }
  
  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.courseId++;
    const newCourse: Course = { ...course, id, createdAt: new Date() };
    this.courses.set(id, newCourse);
    return newCourse;
  }
  
  async updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const existingCourse = this.courses.get(id);
    if (!existingCourse) return undefined;
    
    const updatedCourse = { ...existingCourse, ...course };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }
  
  async deleteCourse(id: number): Promise<boolean> {
    return this.courses.delete(id);
  }
  
  // Class operations
  async getClasses(courseId?: number): Promise<Class[]> {
    let classes = Array.from(this.classes.values());
    if (courseId) {
      classes = classes.filter(cls => cls.courseId === courseId);
    }
    return classes;
  }
  
  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }
  
  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.classId++;
    const newClass: Class = { ...classData, id, createdAt: new Date() };
    this.classes.set(id, newClass);
    return newClass;
  }
  
  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const existingClass = this.classes.get(id);
    if (!existingClass) return undefined;
    
    const updatedClass = { ...existingClass, ...classData };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }
  
  async deleteClass(id: number): Promise<boolean> {
    return this.classes.delete(id);
  }
  
  // Student operations
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }
  
  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.studentId++;
    const newStudent: Student = { ...student, id, createdAt: new Date() };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async createManyStudents(students: InsertStudent[]): Promise<Student[]> {
    const createdStudents: Student[] = [];
    
    for (const student of students) {
      const newStudent = await this.createStudent(student);
      createdStudents.push(newStudent);
    }
    
    return createdStudents;
  }
  
  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const existingStudent = this.students.get(id);
    if (!existingStudent) return undefined;
    
    const updatedStudent = { ...existingStudent, ...student };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }
  
  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }
  
  // Enrollment operations
  async getEnrollments(studentId?: number, classId?: number): Promise<Enrollment[]> {
    let enrollments = Array.from(this.enrollments.values());
    
    if (studentId) {
      enrollments = enrollments.filter(enrollment => enrollment.studentId === studentId);
    }
    
    if (classId) {
      enrollments = enrollments.filter(enrollment => enrollment.classId === classId);
    }
    
    return enrollments;
  }
  
  async getEnrollment(id: number): Promise<Enrollment | undefined> {
    return this.enrollments.get(id);
  }
  
  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const id = this.enrollmentId++;
    const newEnrollment: Enrollment = { ...enrollment, id, enrolledAt: new Date() };
    this.enrollments.set(id, newEnrollment);
    return newEnrollment;
  }
  
  async updateEnrollment(id: number, enrollment: Partial<InsertEnrollment>): Promise<Enrollment | undefined> {
    const existingEnrollment = this.enrollments.get(id);
    if (!existingEnrollment) return undefined;
    
    const updatedEnrollment = { ...existingEnrollment, ...enrollment };
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }
  
  async deleteEnrollment(id: number): Promise<boolean> {
    return this.enrollments.delete(id);
  }
  
  // Attendance operations
  async getAttendance(classId: number, date?: Date): Promise<Attendance[]> {
    let attendanceList = Array.from(this.attendanceRecords.values())
      .filter(attendance => attendance.classId === classId);
    
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      attendanceList = attendanceList.filter(attendance => {
        const attendanceDate = attendance.date instanceof Date 
          ? attendance.date.toISOString().split('T')[0]
          : new Date(attendance.date).toISOString().split('T')[0];
        return attendanceDate === dateString;
      });
    }
    
    return attendanceList;
  }
  
  async getStudentAttendance(studentId: number, classId?: number): Promise<Attendance[]> {
    let attendanceList = Array.from(this.attendanceRecords.values())
      .filter(attendance => attendance.studentId === studentId);
    
    if (classId) {
      attendanceList = attendanceList.filter(attendance => attendance.classId === classId);
    }
    
    return attendanceList;
  }
  
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.attendanceId++;
    const newAttendance: Attendance = { ...attendance, id, createdAt: new Date() };
    this.attendanceRecords.set(id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const existingAttendance = this.attendanceRecords.get(id);
    if (!existingAttendance) return undefined;
    
    const updatedAttendance = { ...existingAttendance, ...attendance };
    this.attendanceRecords.set(id, updatedAttendance);
    return updatedAttendance;
  }

  async bulkUpdateAttendance(records: InsertAttendance[]): Promise<Attendance[]> {
    const results: Attendance[] = [];
    
    for (const record of records) {
      // Find if the attendance record already exists for this student, class, and date
      const existingRecord = Array.from(this.attendanceRecords.values()).find(
        a => a.studentId === record.studentId && 
            a.classId === record.classId && 
            a.date.toISOString().split('T')[0] === new Date(record.date).toISOString().split('T')[0]
      );
      
      if (existingRecord) {
        // Update existing record
        const updated = await this.updateAttendance(existingRecord.id, record);
        if (updated) results.push(updated);
      } else {
        // Create new record
        const created = await this.createAttendance(record);
        results.push(created);
      }
    }
    
    return results;
  }
  
  // Payment operations
  async getPayments(studentId?: number, courseId?: number, month?: number, year?: number): Promise<Payment[]> {
    let payments = Array.from(this.payments.values());
    
    if (studentId) {
      payments = payments.filter(payment => payment.studentId === studentId);
    }
    
    if (courseId) {
      payments = payments.filter(payment => payment.courseId === courseId);
    }
    
    if (month) {
      payments = payments.filter(payment => payment.month === month);
    }
    
    if (year) {
      payments = payments.filter(payment => payment.year === year);
    }
    
    return payments;
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const newPayment: Payment = { ...payment, id, createdAt: new Date() };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;
    
    const updatedPayment = { ...existingPayment, ...payment };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }
}

export const storage = new MemStorage();
