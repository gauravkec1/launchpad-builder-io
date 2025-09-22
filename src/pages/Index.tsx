import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, LogOut, User } from 'lucide-react';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';

const Index = () => {
  const { user, profile, signOut } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'teacher': return 'bg-primary text-primary-foreground';
      case 'parent': return 'bg-accent text-accent-foreground';
      case 'staff': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getWelcomeMessage = (role: string) => {
    switch (role) {
      case 'admin': return 'Welcome to your Admin Dashboard';
      case 'teacher': return 'Welcome to your Teacher Portal';
      case 'parent': return 'Welcome to your Parent Dashboard';
      case 'staff': return 'Welcome to your Staff Portal';
      default: return 'Welcome to Classment';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Classment</h1>
              <p className="text-sm text-muted-foreground">School-Parent Connect</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                <Badge variant="outline" className={getRoleColor(profile?.role || '')}>
                  {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {profile?.role === 'admin' && <AdminDashboard />}
          {profile?.role === 'teacher' && <TeacherDashboard />}
          {profile?.role === 'parent' && <ParentDashboard />}
          {profile?.role === 'staff' && <StaffDashboard />}
        </div>
      </main>
    </div>
  );
};

export default Index;
