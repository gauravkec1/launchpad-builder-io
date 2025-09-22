import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageSquare, Calendar, DollarSign, Users, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface StaffStats {
  totalNotifications: number;
  unreadMessages: number;
  upcomingEvents: number;
  totalStudents: number;
}

interface SchoolEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  description: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  created_at: string;
  sender: {
    full_name: string;
    role: string;
  };
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffStats>({
    totalNotifications: 0,
    unreadMessages: 0,
    upcomingEvents: 0,
    totalStudents: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, [user]);

  const fetchStaffData = async () => {
    if (!user) return;

    try {
      // Fetch total students
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch upcoming events (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: events, count: eventsCount } = await supabase
        .from('school_events')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte('event_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      setUpcomingEvents(events || []);

      // Fetch unread messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Fetch recent messages
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id, subject, content, created_at,
          sender:profiles!messages_sender_id_fkey(full_name, role)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentMessages(messages || []);

      // Fetch notifications count
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setStats({
        totalNotifications: notificationsCount || 0,
        unreadMessages: messagesCount || 0,
        upcomingEvents: eventsCount || 0,
        totalStudents: studentsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-secondary text-secondary-foreground';
      case 'exam': return 'bg-destructive text-destructive-foreground';
      case 'meeting': return 'bg-primary text-primary-foreground';
      case 'activity': return 'bg-accent text-accent-foreground';
      case 'announcement': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Staff Portal</h2>
          <p className="text-muted-foreground">
            Manage administrative tasks and school communications
          </p>
        </div>
        <Button onClick={fetchStaffData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">Unread alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Create Circular
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Fee Management
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Notifications
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Events
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Student Reports
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Upcoming Events</span>
            </CardTitle>
            <CardDescription>School calendar events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{event.title}</h4>
                  <Badge className={getEventTypeColor(event.event_type)}>
                    {event.event_type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {new Date(event.event_date).toLocaleDateString()}
                </p>
                {event.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Recent Messages</span>
            </CardTitle>
            <CardDescription>Latest communications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMessages.map((message) => (
              <div key={message.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm">{message.subject}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  From: {message.sender?.full_name} ({message.sender?.role})
                </p>
                <p className="text-sm line-clamp-2">{message.content}</p>
              </div>
            ))}
            {recentMessages.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recent messages
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Quick insights into school operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
              <p className="text-sm text-muted-foreground">Total Students Enrolled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{stats.upcomingEvents}</div>
              <p className="text-sm text-muted-foreground">Events This Month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.unreadMessages}</div>
              <p className="text-sm text-muted-foreground">Pending Communications</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}