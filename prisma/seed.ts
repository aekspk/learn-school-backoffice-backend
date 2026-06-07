import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function setHour(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // Branch
  const BRANCH_NAME = 'Siam Branch';
  let branch = await prisma.branch.findFirst({ where: { name: BRANCH_NAME } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { name: BRANCH_NAME } });
    console.log(`Created branch: ${branch.name}`);
  } else {
    console.log(`Skipped branch: ${branch.name} (already exists)`);
  }

  // Courses + Lessons
  const courseData = [
    {
      name: 'Python for Beginners',
      lessons: [
        'Introduction to Python & Setup',
        'Variables & Data Types',
        'Control Flow & Logical Operators',
        'Functions',
        'Lists & Tuples',
        'Dictionaries & Sets',
        'File I/O',
        'Error Handling',
        'Modules & Packages',
        'Mini Project',
      ],
    },
    {
      name: 'JavaScript Fundamentals',
      lessons: [
        'Introduction to JavaScript',
        'Variables, let & const',
        'Data Types & Type Coercion',
        'Functions & Arrow Functions',
        'Arrays & Array Methods',
        'Objects & Destructuring',
        'DOM Manipulation',
        'Events & Event Listeners',
        'Async & Promises',
        'Mini Project',
      ],
    },
    {
      name: 'Web Design with HTML & CSS',
      lessons: [
        'HTML Structure & Semantic Tags',
        'Text, Links & Images',
        'CSS Selectors & Specificity',
        'Box Model & Layout',
        'Flexbox',
        'CSS Grid',
        'Responsive Design & Media Queries',
        'Forms & Inputs',
      ],
    },
  ];

  type CourseWithLessons = Prisma.CourseGetPayload<{ include: { courseLessons: true } }>;
  const seededCourses: CourseWithLessons[] = [];

  for (const { name, lessons } of courseData) {
    let course = await prisma.course.findFirst({
      where: { name },
      include: { courseLessons: { orderBy: { order: 'asc' } } },
    });

    if (!course) {
      course = await prisma.course.create({
        data: {
          name,
          totalSessions: lessons.length,
          courseLessons: {
            create: lessons.map((topic, i) => ({ order: i + 1, topic })),
          },
        },
        include: { courseLessons: { orderBy: { order: 'asc' } } },
      });
      console.log(`Created course: ${course.name} (${lessons.length} lessons)`);
    } else {
      console.log(`Skipped course: ${course.name} (already exists)`);
    }

    seededCourses.push(course);
  }

  // ClassSessions — 1 session per lesson, Mon/Wed/Fri at 10:00, starting 2026-06-08
  const BASE = new Date('2026-06-08T00:00:00.000Z');
  const DAY_PATTERN = [0, 2, 4]; // Mon, Wed, Fri offsets within a week

  let created = 0;
  let skipped = 0;

  for (const course of seededCourses) {
    for (const [lessonIdx, lesson] of course.courseLessons.entries()) {
      const existing = await prisma.classSession.findFirst({
        where: { branchId: branch.id, courseLessonId: lesson.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const weekOffset = Math.floor(lessonIdx / DAY_PATTERN.length) * 7;
      const dayOffset = DAY_PATTERN[lessonIdx % DAY_PATTERN.length];
      const scheduledAt = setHour(addDays(BASE, weekOffset + dayOffset), 10);

      await prisma.classSession.create({
        data: {
          branchId: branch.id,
          courseId: course.id,
          courseLessonId: lesson.id,
          scheduledAt,
          durationMin: 90,
          totalSeats: 10,
          bookedSeats: 0,
        },
      });
      created++;
    }
  }

  console.log(`Class sessions — created: ${created}, skipped: ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.log(e);
    await prisma.$disconnect();
  });
