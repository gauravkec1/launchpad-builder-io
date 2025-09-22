-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  grade_level TEXT,
  class_section TEXT,
  parent_id UUID REFERENCES public.profiles(user_id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(user_id),
  academic_year TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(grade_level, section, academic_year)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  teacher_id UUID NOT NULL REFERENCES public.profiles(user_id),
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  teacher_id UUID NOT NULL REFERENCES public.profiles(user_id),
  due_date DATE NOT NULL,
  attachment_url TEXT,
  total_marks INTEGER,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  submission_text TEXT,
  attachment_url TEXT,
  marks_obtained INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(user_id),
  subject TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'broadcast', 'notification')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('attendance', 'assignment', 'fee', 'general', 'emergency')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school events table
CREATE TABLE public.school_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday', 'exam', 'meeting', 'activity', 'announcement')),
  created_by UUID REFERENCES public.profiles(user_id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_students_parent_id ON public.students(parent_id);
CREATE INDEX idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, attendance_date);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- RLS Policies for students
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers can view their class students" ON public.students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.classes WHERE teacher_id = auth.uid() AND id IN (SELECT class_id FROM public.attendance WHERE student_id = students.id)));

CREATE POLICY "Parents can view their children" ON public.students FOR SELECT TO authenticated USING (parent_id = auth.uid());

-- RLS Policies for classes
CREATE POLICY "Admins can manage all classes" ON public.classes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers can view their classes" ON public.classes FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Staff can view all classes" ON public.classes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'staff'));

-- RLS Policies for attendance
CREATE POLICY "Admins can manage all attendance" ON public.attendance FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers can manage attendance for their classes" ON public.attendance FOR ALL TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Parents can view their children attendance" ON public.attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students WHERE id = attendance.student_id AND parent_id = auth.uid()));

-- RLS Policies for assignments
CREATE POLICY "Admins can manage all assignments" ON public.assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers can manage their assignments" ON public.assignments FOR ALL TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Parents can view assignments for their children's classes" ON public.assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON c.id = assignments.class_id WHERE s.parent_id = auth.uid()));

-- RLS Policies for messages
CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for school events
CREATE POLICY "Everyone can view school events" ON public.school_events FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins and staff can manage events" ON public.school_events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')));

-- Add triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_events_updated_at BEFORE UPDATE ON public.school_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();