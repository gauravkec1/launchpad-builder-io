import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Calendar, MessageSquare, BookOpen, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalStaff: number;
  todayAttendance: number;
  totalClasses: number;
  activeAssignments: number;
  unreadMessages: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalStaff: 0,
    todayAttendance: 0,
    totalClasses: 0,
    activeAssignments: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch user counts by role
      const { data: userCounts } = await supabase
        .from('profiles')
        .select('role')
        .eq('is_active', true);

      // Fetch students count
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch classes count
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('attendance_date', today)
        .eq('status', 'present');

      // Fetch active assignments
      const { count: assignmentsCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .gte('due_date', today);

      // Fetch unread messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user?.id)
        .eq('is_read', false);

      // Count users by role
      const roleCounts = userCounts?.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalStudents: studentsCount || 0,
        totalTeachers: roleCounts?.teacher || 0,
        totalParents: roleCounts?.parent || 0,
        totalStaff: roleCounts?.staff || 0,
        todayAttendance: attendanceCount || 0,
        totalClasses: classesCount || 0,
        activeAssignments: assignmentsCount || 0,
        unreadMessages: messagesCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Parents',
      value: stats.totalParents,
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Staff Members',
      value: stats.totalStaff,
      icon: UserCheck,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: UserCheck,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Active Classes',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Assignments',
      value: stats.activeAssignments,
      icon: Calendar,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: MessageSquare,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your school operations and monitor key metrics
          </p>
        </div>
        <Button onClick={fetchAdminStats} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.title === "Today's Attendance" ? 'students present today' : 'total active'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Manage users and operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <GraduationCap className="h-4 w-4 mr-2" />
              Manage Students
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Classes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">New</Badge>
                <span className="text-sm">5 new parent registrations</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Update</Badge>
                <span className="text-sm">Attendance marked for Grade 5A</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Alert</Badge>
                <span className="text-sm">3 assignments due tomorrow</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Upcoming Events</span>
            </CardTitle>
            <CardDescription>School calendar events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Parent-Teacher Meeting</p>
                <p className="text-muted-foreground">Tomorrow, 2:00 PM</p>
              </div>
              <div>
                <p className="font-medium">Annual Sports Day</p>
                <p className="text-muted-foreground">Next Friday</p>
              </div>
              <div>
                <p className="font-medium">Mid-term Exams</p>
                <p className="text-muted-foreground">Next Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}