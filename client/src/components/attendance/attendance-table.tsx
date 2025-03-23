import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { Student, Attendance } from "@shared/schema";
import { format } from "date-fns";

interface AttendanceTableProps {
  students: Student[];
  attendanceDays: Date[];
  attendanceRecords: Attendance[];
  onAttendanceChange: (studentId: number, date: Date, present: boolean) => void;
}

export function AttendanceTable({
  students,
  attendanceDays,
  attendanceRecords,
  onAttendanceChange
}: AttendanceTableProps) {
  // Check if a student has attendance for a specific day
  const hasAttendance = (studentId: number, date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceRecords.some(
      record => 
        record.studentId === studentId && 
        new Date(record.date).toISOString().split('T')[0] === dateStr &&
        record.present
    );
  };

  // Get the day of the week abbreviation
  const getDayAbbr = (date: Date): string => {
    const day = date.getDay();
    // Greek abbreviations
    const dayAbbrs = ["Κ", "Δ", "Τ", "Τ", "Π", "Π", "Σ"];
    return dayAbbrs[day];
  };

  // Get a student's payment status
  const getStudentPaymentStatus = (studentId: number): boolean => {
    // This would normally come from payment records
    // For now, return a random value for demonstration
    return Math.random() > 0.3;
  };

  return (
    <div className="overflow-x-auto">
      <Table className="attendance-table">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky-header px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider student-name">
              {t("student")}
            </TableHead>
            
            {/* Day columns */}
            {attendanceDays.map((day, index) => (
              <TableHead 
                key={index} 
                className="sticky-header px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex flex-col items-center">
                  <span>{getDayAbbr(day)}</span>
                  <span>{format(day, "d")}</span>
                </div>
              </TableHead>
            ))}
            
            {/* Payment column */}
            <TableHead className="sticky-header px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
              {t("payment")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id} className="hover:bg-gray-50">
              <TableCell className="px-3 py-3 whitespace-nowrap student-name">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900">
                    {student.firstName} {student.lastName}
                  </div>
                </div>
              </TableCell>
              
              {/* Attendance checkboxes */}
              {attendanceDays.map((day, index) => (
                <TableCell key={index} className="px-1 py-3 text-center">
                  <Checkbox
                    checked={hasAttendance(student.id, day)}
                    onCheckedChange={(checked) => 
                      onAttendanceChange(student.id, day, !!checked)
                    }
                    className="h-4 w-4 text-primary"
                  />
                </TableCell>
              ))}
              
              {/* Payment checkbox */}
              <TableCell className="px-3 py-3 text-center bg-gray-50">
                <div className="flex justify-center">
                  <Checkbox
                    checked={getStudentPaymentStatus(student.id)}
                    className="h-5 w-5 text-success"
                    // This would normally trigger a payment update
                    // onCheckedChange={...}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
