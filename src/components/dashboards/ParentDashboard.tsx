import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Calendar, MessageSquare, BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  grade_level: string;
  class_section: string;
  avatar_url: string | null;
}

interface StudentStats {
  attendanceRate: number;
  assignmentsDue: number;
  unreadMessages: number;
  recentGrades: number;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'graded';
  marks_obtained?: number;
  total_marks: number;
}

interface AttendanceRecord {
  attendance_date: string;
  status: string;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [stats, setStats] = useState<StudentStats>({
    attendanceRate: 0,
    assignmentsDue: 0,
    unreadMessages: 0,
    recentGrades: 0,
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent);
    }
  }, [selectedStudent]);

  const fetchChildren = async () => {
    if (!user) return;

    try {
      const { data: children } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('full_name');

      setStudents(children || []);
      
      // Auto-select first child if available
      if (children && children.length > 0 && !selectedStudent) {
        setSelectedStudent(children[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your children\'s data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      setLoading(true);

      // Fetch attendance for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('attendance_date, status')
        .eq('student_id', studentId)
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false });

      setRecentAttendance(attendanceData || []);

      // Calculate attendance rate
      const totalDays = attendanceData?.length || 0;
      const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      // Fetch assignments for student's class
      const student = students.find(s => s.id === studentId);
      let assignmentsData: Assignment[] = [];
      
      if (student) {
        // Find the class for this student
        const { data: classData } = await supabase
          .from('classes')
          .select('id')
          .eq('grade_level', student.grade_level)
          .eq('section', student.class_section)
          .single();

        if (classData) {
          const { data: assignmentsList } = await supabase
            .from('assignments')
            .select(`
              id, title, subject, due_date, total_marks,
              assignment_submissions(marks_obtained, submitted_at, graded_at)
            `)
            .eq('class_id', classData.id)
            .order('due_date', { ascending: false })
            .limit(5);

          assignmentsData = (assignmentsList || []).map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            subject: assignment.subject,
            due_date: assignment.due_date,
            total_marks: assignment.total_marks,
            marks_obtained: assignment.assignment_submissions?.[0]?.marks_obtained,
            status: assignment.assignment_submissions?.[0]?.graded_at ? 'graded' :
                   assignment.assignment_submissions?.[0]?.submitted_at ? 'submitted' : 'pending'
          }));
        }
      }

      setAssignments(assignmentsData);

      // Count due assignments
      const today = new Date().toISOString().split('T')[0];
      const dueSoon = assignmentsData.filter(a => 
        a.due_date >= today && a.status === 'pending'
      ).length;

      // Fetch unread messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user?.id)
        .eq('is_read', false);

      // Count recent grades
      const recentGrades = assignmentsData.filter(a => 
        a.status === 'graded' && a.marks_obtained !== null
      ).length;

      setStats({
        attendanceRate,
        assignmentsDue: dueSoon,
        unreadMessages: messagesCount || 0,
        recentGrades,
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-accent';
      case 'absent': return 'text-destructive';
      case 'late': return 'text-warning';
      case 'excused': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'absent': return AlertCircle;
      case 'late': return Clock;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2" />
          <div className="h-4 bg-muted rounded w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Parent Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your child's academic progress and school activities
          </p>
        </div>
      </div>

      {/* Child Selector */}
      {students.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Child</CardTitle>
            <CardDescription>View data for a specific child</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={student.avatar_url || ''} />
                        <AvatarFallback>{student.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{student.full_name} - {student.grade_level}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedStudentData && (
        <>
          {/* Student Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStudentData.avatar_url || ''} />
                  <AvatarFallback className="text-lg">
                    {selectedStudentData.full_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedStudentData.full_name}</h3>
                  <p className="text-muted-foreground">
                    {selectedStudentData.grade_level} - {selectedStudentData.class_section}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Student ID: {selectedStudentData.student_id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments Due</CardTitle>
                <Calendar className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.assignmentsDue}</div>
                <p className="text-xs text-muted-foreground">Due soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unreadMessages}</div>
                <p className="text-xs text-muted-foreground">From teachers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Grades</CardTitle>
                <GraduationCap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentGrades}</div>
                <p className="text-xs text-muted-foreground">New grades</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Recent Assignments</span>
                </CardTitle>
                <CardDescription>Latest homework and projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        assignment.status === 'graded' ? 'default' :
                        assignment.status === 'submitted' ? 'secondary' : 'outline'
                      }>
                        {assignment.status}
                      </Badge>
                      {assignment.marks_obtained !== undefined && (
                        <p className="text-sm mt-1">
                          {assignment.marks_obtained}/{assignment.total_marks}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No recent assignments
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Recent Attendance</span>
                </CardTitle>
                <CardDescription>Last 10 school days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentAttendance.slice(0, 10).map((record, index) => {
                  const StatusIcon = getAttendanceStatusIcon(record.status);
                  return (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">
                        {new Date(record.attendance_date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-1">
                        <StatusIcon 
                          className={`h-4 w-4 ${getAttendanceStatusColor(record.status)}`}
                        />
                        <span className={`text-sm capitalize ${getAttendanceStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {recentAttendance.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No attendance records found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {students.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Children Found</h3>
            <p className="text-muted-foreground">
              No students are linked to your parent account. Please contact the school administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}