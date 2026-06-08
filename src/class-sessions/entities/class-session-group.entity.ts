export interface SessionItem {
  id: number;
  topic: string | null;
  scheduledAt: Date;
  durationMin: number;
  bookedSeats: number;
  totalSeats: number;
}

export interface CourseGroup {
  courseId: number;
  courseName: string;
  branchName: string;
  sessions: SessionItem[];
}

export interface DayGroup {
  key: string;
  date: Date;
  courseGroups: CourseGroup[];
}
