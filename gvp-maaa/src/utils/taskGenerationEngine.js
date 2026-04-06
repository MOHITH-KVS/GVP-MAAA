/**
 * SMART TASK GENERATION ENGINE
 * Dynamically generates actionable tasks based on real student data
 */

export class TaskGenerationEngine {
  constructor(studentData) {
    this.studentData = studentData;
    this.tasks = [];
  }

  createTask(task) {
    return {
      completed: false,
      verificationType: "system",
      verified: false,
      xpAwarded: 0,
      ...task,
    };
  }

  /**
   * Generate all tasks based on current student data
   */
  generateAllTasks() {
    this.tasks = [];
    
    // Check all conditions
    this.checkAttendance();
    this.checkMarks();
    this.checkAssignments();
    this.checkUpcomingEvents();
    this.checkStudyTasks();
    
    // Limit and prioritize tasks
    return this.prioritizeAndLimitTasks();
  }

  /**
   * ATTENDANCE CHECK
   * IF attendance < 75:
   *   "Attend all classes tomorrow to avoid attendance shortage"
   * IF attendance dropping:
   *   "Attend next 2 classes to stabilize attendance trend"
   */
  checkAttendance() {
    const attendancePercentage = this.studentData?.attendance_percentage || 0;
    const attendanceDropping = this.studentData?.attendance_dropping || false;
    const attendanceTrend = this.studentData?.attendance_trend || 0; // -1, 0, 1

    if (attendancePercentage < 75) {
      this.addTask(this.createTask({
        id: "attendance-critical",
        title: "Attend all classes tomorrow",
        reason: `Your attendance is at ${Math.round(attendancePercentage)}% — less than 75% minimum`,
        priority: "HIGH",
        type: "attendance",
        deadline: "today",
        impact: "Maintains safe attendance above 75%",
        verificationType: "system",
        verified: false,
        xpAwarded: 0,
        baseline: {
          attendance: Number(attendancePercentage || 0),
        },
      }));
    } else if (attendanceDropping || attendanceTrend < 0) {
      this.addTask(this.createTask({
        id: "attendance-trending",
        title: "Attend next 2 classes to stabilize attendance",
        reason: "Your attendance is trending downward",
        priority: "MEDIUM",
        type: "attendance",
        deadline: "this week",
        impact: "Prevents future attendance shortage warnings",
        verificationType: "system",
        verified: false,
        xpAwarded: 0,
        baseline: {
          attendance: Number(attendancePercentage || 0),
        },
      }));
    }
  }

  /**
   * MARKS CHECK
   * IF mid performance low (< 50% of full marks):
   *   "Start Mid-2 preparation — target {required_marks}"
   * IF overall performance is declining:
   *   "Improve in upcoming assessments"
   */
  checkMarks() {
    const marks = this.studentData?.marks || {};
    const mid1 = parseFloat(marks?.mid1) || 0;
    const mid2 = parseFloat(marks?.mid2) || 0;
    const assignment = parseFloat(marks?.assignment) || 0;
    const maxMarks = marks?.max_marks || 25; // Typical mid marks
    const mid2Target = parseFloat(marks?.mid2_target) || maxMarks * 0.7;

    // Mid-1 already happened, focus on Mid-2
    if (mid1 > 0 && mid1 < maxMarks * 0.5) {
      this.addTask(this.createTask({
        id: "marks-mid2-prep",
        title: "Start Mid-2 preparation",
        reason: `Your Mid-1 score was ${mid1}/${maxMarks}. Target: ${mid2Target} or higher in Mid-2`,
        priority: "HIGH",
        type: "marks",
        deadline: "this week",
        impact: "Better internal marks → higher final score",
        targetScore: mid2Target,
        verificationType: "system",
        verified: false,
        xpAwarded: 0,
        baseline: {
          score: Number(mid1 + mid2 + assignment),
        },
      }));
    }

    const totalScore = mid1 + mid2 + assignment;
    if (totalScore > 0 && totalScore < 40) {
      this.addTask(this.createTask({
        id: "marks-improvement",
        title: "Focus on assessment preparation",
        reason: "Your current performance is below target",
        priority: "MEDIUM",
        type: "marks",
        deadline: "this week",
        impact: "Improves chances of better final grade",
        verificationType: "system",
        verified: false,
        xpAwarded: 0,
        baseline: {
          score: Number(totalScore),
        },
      }));
    }
  }

  /**
   * ASSIGNMENTS CHECK
   * IF assignments pending:
   *   "Complete pending assignment before deadline"
   */
  checkAssignments() {
    const assignments = this.studentData?.pending_assignments || [];
    
    assignments.forEach((assignment, index) => {
      if (index < 2) { // Limit to 2 assignment tasks
        const daysUntilDeadline = this.daysUntilDeadline(assignment.due_date);
        const isUrgent = daysUntilDeadline <= 2;
        
        this.addTask(this.createTask({
          id: `assignment-${assignment.id}`,
          title: `Complete: ${assignment.title}`,
          reason: `Due in ${daysUntilDeadline} day(s) — ${assignment.subject}`,
          priority: isUrgent ? "HIGH" : "MEDIUM",
          type: "assignment",
          deadline: isUrgent ? "today" : "this week",
          impact: "Stays on track with coursework",
          assignmentId: assignment.id,
          daysLeft: daysUntilDeadline,
          verificationType: "system",
          verified: false,
          xpAwarded: 0,
        }));
      }
    });
  }

  /**
   * EVENTS CHECK
   * IF events upcoming:
   *   "Prepare for upcoming academic event"
   */
  checkUpcomingEvents() {
    const events = this.studentData?.upcoming_events || [];
    
    events.forEach((event, index) => {
      if (index < 2) { // Limit to 2 event tasks
        const daysUntilEvent = this.daysUntilDeadline(event.event_date);
        const requiresPrep = event.event_type === "competition" || event.event_type === "exam" || event.event_type === "presentation";
        
        if (requiresPrep && daysUntilEvent <= 7) {
          this.addTask(this.createTask({
            id: `event-${event.id}`,
            title: `Prepare for: ${event.title}`,
            reason: `Event in ${daysUntilEvent} day(s) at ${event.venue || event.location}`,
            priority: daysUntilEvent <= 2 ? "HIGH" : "MEDIUM",
            type: "event",
            deadline: daysUntilEvent <= 2 ? "today" : "this week",
            impact: "Better performance in academic events",
            eventId: event.id,
            daysLeft: daysUntilEvent,
            verificationType: "assisted",
            verified: false,
            xpAwarded: 0,
          }));
        }
      }
    });
  }

  checkStudyTasks() {
    const marks = this.studentData?.marks || {};
    const mid1 = parseFloat(marks?.mid1) || 0;
    const maxMarks = parseFloat(marks?.max_marks) || 25;

    if (mid1 > 0 && mid1 < maxMarks * 0.6) {
      this.addTask(this.createTask({
        id: "study-marks-recovery",
        title: "Do a 45-minute focused study session",
        reason: "A focused session today can improve your next marks update",
        priority: "MEDIUM",
        type: "study",
        deadline: "today",
        impact: "Builds preparation consistency for marks improvement",
        verificationType: "self",
        verified: false,
        xpAwarded: 0,
        linkedTo: "marks",
      }));
    }
  }

  /**
   * Add task to list with validation
   */
  addTask(task) {
    // Validate required fields
    if (!task.id || !task.title || !task.reason) {
      console.warn("Invalid task:", task);
      return;
    }
    this.tasks.push(task);
  }

  /**
   * Prioritize and limit tasks
   * - Max 2 tasks for TODAY
   * - Max 3 tasks for THIS WEEK
   * - Sort by priority (HIGH > MEDIUM > LOW)
   */
  prioritizeAndLimitTasks() {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    
    // Sort by priority
    this.tasks.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

    // Separate by deadline
    const todayTasks = this.tasks.filter(t => t.deadline === "today").slice(0, 2);
    const weekTasks = this.tasks.filter(t => t.deadline === "this week").slice(0, 3);

    return {
      today: todayTasks,
      thisWeek: weekTasks.filter(t => !todayTasks.includes(t)),
      allTasks: [...todayTasks, ...weekTasks.filter(t => !todayTasks.includes(t))],
    };
  }

  /**
   * Calculate days until deadline
   */
  daysUntilDeadline(dateString) {
    if (!dateString) return 999;
    
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timeDiff = targetDate - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(daysDiff, 0);
  }
}

/**
 * Calculate task metrics for display
 */
export const calculateTaskMetrics = (tasks, completedTasks = []) => {
  const now = new Date();
  const today = now.toDateString();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay());

  const todayCompleted = completedTasks.filter((t) => new Date(t.completedAt).toDateString() === today).length;
  const weekCompleted = completedTasks.filter((t) => new Date(t.completedAt) >= weekStart).length;

  const allTodayTasks = tasks?.today?.length || 0;
  const allWeekTasks = (tasks?.today?.length || 0) + (tasks?.thisWeek?.length || 0);

  return {
    todayCompleted,
    todayTotal: allTodayTasks,
    weekTotal: allWeekTasks,
    todayMetric: `${todayCompleted}/${allTodayTasks}`,
    weekProgress: allWeekTasks > 0 ? Math.round((weekCompleted / allWeekTasks) * 100) : 0,
  };
};

/**
 * Calculate streak
 */
export const calculateStreak = (completedTasks = []) => {
  if (completedTasks.length === 0) return 0;

  const uniqueDays = new Set(
    completedTasks.map((task) => {
      const d = new Date(task.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (uniqueDays.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};
