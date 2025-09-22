import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Calendar, MessageSquare, ClipboardCheck, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TeacherStats {
  myClasses: number;
  myStudents: number;
  todayAttendance: number;
  activeAssignments: number;
  unreadMessages: number;
  pendingGrading: number;
}

interface Class {
  id: string;
  class_name: string;
  grade_level: string;
  section: string;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  total_marks: number;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeacherStats>({
    myClasses: 0,
    myStudents: 0,
    todayAttendance: 0,
    activeAssignments: 0,
    unreadMessages: 0,
    pendingGrading: 0,
  });
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const fetchTeacherData = async () => {
    if (!user) return;

    try {
      // Fetch teacher's classes
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true);

      setClasses(teacherClasses || []);

      // Fetch students in teacher's classes
      let totalStudents = 0;
      if (teacherClasses && teacherClasses.length > 0) {
        const classIds = teacherClasses.map(c => c.id);
        const { data: studentsInClasses } = await supabase
          .from('students')
          .select('id, class_section')
          .in('id', classIds)
          .eq('is_active', true);
        
        totalStudents = studentsInClasses?.length || 0;
      }

      // Fetch today's attendance for teacher's classes
      const today = new Date().toISOString().split('T')[0];
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('attendance_date', today);

      // Fetch teacher's assignments
      const { data: assignments, count: assignmentsCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact' })
        .eq('teacher_id', user.id)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(3);

      setRecentAssignments(assignments || []);

      // Fetch unread messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Fetch pending submissions for grading
      const { count: pendingCount } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .is('graded_at', null)
        .is('marks_obtained', null);

      setStats({
        myClasses: teacherClasses?.length || 0,
        myStudents: totalStudents,
        todayAttendance: attendanceCount || 0,
        activeAssignments: assignmentsCount || 0,
        unreadMessages: messagesCount || 0,
        pendingGrading: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickMarkAttendance = async (classId: string) => {
    try {
      // This would open the attendance marking interface
      toast({
        title: 'Attendance',
        description: 'Opening attendance marking for this class...',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open attendance marking',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Teacher Portal</h2>
          <p className="text-muted-foreground">
            Manage your classes, assignments, and student communications
          </p>
        </div>
        <Button onClick={fetchTeacherData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAttendance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingGrading}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>My Classes</span>
            </CardTitle>
            <CardDescription>Quick access to your classes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{cls.class_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.grade_level} - {cls.section}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => quickMarkAttendance(cls.id)}
                >
                  Mark Attendance
                </Button>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No classes assigned yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Recent Assignments</span>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </CardTitle>
            <CardDescription>Your latest assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAssignments.map((assignment) => (
              <div key={assignment.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{assignment.total_marks} pts</Badge>
                </div>
              </div>
            ))}
            {recentAssignments.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recent assignments
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Common teaching tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Parents
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Student Progress
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}