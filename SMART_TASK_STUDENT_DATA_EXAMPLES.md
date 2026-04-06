# 🎯 SMART TASK SYSTEM - STUDENT DATA EXAMPLES

## Real Student Data Scenarios

This document shows how real student data maps to the task generation system.

---

## Scenario 1: Low Attendance Student

**Student Data:**
```javascript
{
  attendance: 68,              // Below 75% threshold
  attendanceTrend: -1,         // Declining
  mid1: 14,                    // Low
  mid2: 0,                     // Not yet taken
  assignment: 7,               // Average
  pendingAssignments: [
    {
      id: 101,
      title: "Web Dev Project",
      subject: "Web Technologies",
      due_date: "2025-01-18",
      status: "pending",
      submitted: false
    },
    {
      id: 102,
      title: "Database Design",
      subject: "Database Systems",
      due_date: "2025-01-25",
      status: "pending",
      submitted: false
    }
  ],
  upcomingEvents: [
    {
      id: 201,
      title: "Technical Symposium",
      event_type: "event",
      event_date: "2025-01-20",
      venue: "Auditorium"
    }
  ]
}
```

**Generated Tasks:**
```javascript
[
  {
    id: "attendance-critical-1640001",
    title: "Attend all classes tomorrow",
    reason: "Your attendance is at 68% — less than 75% minimum",
    priority: "HIGH",
    type: "attendance",
    deadline: "today",
    completed: false,
    impact: "Maintains safe attendance above 75%"
  },
  {
    id: "assignment-101-1640002",
    title: "Complete: Web Dev Project",
    reason: "Due in 2 day(s) — Web Technologies",
    priority: "HIGH",
    type: "assignment",
    deadline: "today",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 2
  },
  {
    id: "assignment-102-1640003",
    title: "Complete: Database Design",
    reason: "Due in 9 day(s) — Database Systems",
    priority: "MEDIUM",
    type: "assignment",
    deadline: "this week",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 9
  }
]
```

**Task Limits Applied:**
- TODAY: 2/2 (Attendance + Web Dev)
- THIS WEEK: 1/3 (Database Design)

---

## Scenario 2: Struggling in Marks

**Student Data:**
```javascript
{
  attendance: 82,              // Safe
  attendanceTrend: 0,          // Stable
  mid1: 12,                    // Below 50% of 25
  mid2: 0,                     // Not yet taken
  assignment: 6,               // Low
  pendingAssignments: [
    {
      id: 103,
      title: "Algorithm Analysis Report",
      subject: "Data Structures",
      due_date: "2025-01-22",
      status: "pending"
    }
  ],
  upcomingEvents: [
    {
      id: 202,
      title: "Programming Contest",
      event_type: "competition",
      event_date: "2025-01-20",
      venue: "Lab 5"
    }
  ]
}
```

**Generated Tasks:**
```javascript
[
  {
    id: "marks-mid2-1640101",
    title: "Start Mid-2 preparation",
    reason: "Your Mid-1 score was 12/25. Target: 17.5 or higher in Mid-2",
    priority: "HIGH",
    type: "marks",
    deadline: "today",
    completed: false,
    impact: "Better internal marks → higher final score",
    targetScore: 17.5
  },
  {
    id: "event-202-1640102",
    title: "Prepare for: Programming Contest",
    reason: "Event in 1 day(s) at Lab 5",
    priority: "HIGH",
    type: "event",
    deadline: "today",
    completed: false,
    impact: "Better performance in academic events",
    daysLeft: 1
  },
  {
    id: "assignment-103-1640103",
    title: "Complete: Algorithm Analysis Report",
    reason: "Due in 6 day(s) — Data Structures",
    priority: "MEDIUM",
    type: "assignment",
    deadline: "this week",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 6
  }
]
```

---

## Scenario 3: At-Risk Student (Multiple Issues)

**Student Data:**
```javascript
{
  attendance: 64,              // Critical - below 75%
  attendanceTrend: -1,         // Declining
  mid1: 8,                     // Very low (32% of max)
  mid2: 0,
  assignment: 4,               // Poor
  pendingAssignments: [
    {
      id: 104,
      title: "Thermodynamics Lab Report",
      subject: "Physics",
      due_date: "2025-01-16",    // Due today!
      status: "pending"
    },
    {
      id: 105,
      title: "Organic Chemistry Problem Set",
      subject: "Chemistry",
      due_date: "2025-01-17",    // Due tomorrow
      status: "pending"
    }
  ],
  upcomingEvents: []
}
```

**Generated Tasks (Prioritized):**
```javascript
[
  {
    id: "assignment-104-1640201",
    title: "Complete: Thermodynamics Lab Report",
    reason: "Due in 0 day(s) — Physics",
    priority: "HIGH",
    type: "assignment",
    deadline: "today",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 0
  },
  {
    id: "attendance-critical-1640202",
    title: "Attend all classes tomorrow",
    reason: "Your attendance is at 64% — less than 75% minimum",
    priority: "HIGH",
    type: "attendance",
    deadline: "today",
    completed: false,
    impact: "Maintains safe attendance above 75%"
  },
  {
    id: "marks-mid2-1640203",
    title: "Start Mid-2 preparation",
    reason: "Your Mid-1 score was 8/25. Target: 17.5 or higher in Mid-2",
    priority: "MEDIUM",
    type: "marks",
    deadline: "this week",
    completed: false,
    impact: "Better internal marks → higher final score",
    targetScore: 17.5
  },
  {
    id: "assignment-105-1640204",
    title: "Complete: Organic Chemistry Problem Set",
    reason: "Due in 1 day(s) — Chemistry",
    priority: "MEDIUM",
    type: "assignment",
    deadline: "this week",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 1
  }
]
```

**Note:** Max 2 TODAY tasks + max 3 THIS WEEK = Total 5 visible tasks

---

## Scenario 4: Performing Well (No Tasks)

**Student Data:**
```javascript
{
  attendance: 92,              // Safe
  attendanceTrend: 1,          // Improving
  mid1: 22,                    // Excellent (88% of max)
  mid2: 0,                     // Not yet taken (but predicted high)
  assignment: 9,               // Good
  pendingAssignments: [],      // All submitted
  upcomingEvents: []           // No upcoming events requiring prep
}
```

**Generated Tasks:**
```javascript
[]
// Empty state:
// "All caught up! No tasks needed right now. Keep maintaining your good performance."
```

---

## Scenario 5: Event-Heavy Week

**Student Data:**
```javascript
{
  attendance: 78,
  mid1: 16,
  mid2: 0,
  assignment: 7,
  pendingAssignments: [
    {
      id: 106,
      title: "Research Paper on ML",
      subject: "Machine Learning",
      due_date: "2025-01-25",
      status: "pending"
    }
  ],
  upcomingEvents: [
    {
      id: 203,
      title: "AI Hackathon",
      event_type: "competition",
      event_date: "2025-01-19",    // 3 days away
      venue: "Main Lab"
    },
    {
      id: 204,
      title: "Data Science Workshop",
      event_type: "workshop",
      event_date: "2025-01-21",    // 5 days away
      venue: "Seminar Hall"
    }
  ]
}
```

**Generated Tasks:**
```javascript
[
  {
    id: "event-203-1640301",
    title: "Prepare for: AI Hackathon",
    reason: "Event in 3 day(s) at Main Lab",
    priority: "HIGH",
    type: "event",
    deadline: "today",
    completed: false,
    impact: "Better performance in academic events",
    daysLeft: 3
  },
  {
    id: "marks-mid2-1640302",
    title: "Start Mid-2 preparation",
    reason: "Your Mid-1 score was 16/25. Target: 17.5 or higher in Mid-2",
    priority: "MEDIUM",
    type: "marks",
    deadline: "today",
    completed: false,
    impact: "Better internal marks → higher final score",
    targetScore: 17.5
  },
  {
    id: "assignment-106-1640303",
    title: "Complete: Research Paper on ML",
    reason: "Due in 9 day(s) — Machine Learning",
    priority: "MEDIUM",
    type: "assignment",
    deadline: "this week",
    completed: false,
    impact: "Stays on track with coursework",
    daysLeft: 9
  }
]
```

**Note:** Data Science Workshop not included (limit: 2 event tasks)

---

## Data Structure Reference

### StudentData Object (Passed to SmartTaskManager)

```typescript
interface StudentData {
  // Attendance
  attendance: number;              // 0-100 percentage
  attendanceTrend?: number;        // -1 (declining), 0 (stable), 1 (improving)
  
  // Marks
  mid1?: number;                   // 0-25 typically
  mid2?: number;                   // 0-25 typically
  assignment?: number;             // 0-10 typically
  
  // Assignments
  pendingAssignments?: Array<{
    id: number;
    title: string;
    subject: string;
    due_date: string;              // ISO format: "2025-01-20" or "2025-01-20T23:59:00"
    status?: string;               // "pending", "submitted", etc.
    submitted?: boolean;
  }>;
  
  // Events
  upcomingEvents?: Array<{
    id: number;
    title: string;
    event_type: string;            // "competition", "workshop", "presentation", "exam", "event"
    event_date: string;            // ISO format: "2025-01-20"
    venue?: string;                // Location name
    location?: string;             // Alternative to venue
  }>;
}
```

### Generated Task Object

```typescript
interface Task {
  id: string;                      // Unique identifier
  title: string;                   // What to do
  reason: string;                  // Why it matters
  priority: "HIGH" | "MEDIUM" | "LOW";
  type: "attendance" | "marks" | "assignment" | "event";
  deadline: "today" | "this week";
  completed: boolean;
  impact: string;                  // What improves if done
  
  // Optional fields (depending on task type)
  targetScore?: number;            // For marks tasks
  assignmentId?: number;           // For assignment tasks
  eventId?: number;                // For event tasks
  daysLeft?: number;               // Days until deadline
}
```

---

## Sample Data for Testing

### getStudentData(): StudentData
```javascript
export function getMockLowAttendanceStudent() {
  return {
    attendance: 70,
    attendanceTrend: -1,
    mid1: 18,
    mid2: 16,
    assignment: 8,
    pendingAssignments: [
      {
        id: 1,
        title: "Data Structures Assignment",
        subject: "DSA",
        due_date: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
        status: "pending"
      }
    ],
    upcomingEvents: []
  };
}

export function getMockHighRiskStudent() {
  return {
    attendance: 60,
    attendanceTrend: -1,
    mid1: 8,
    mid2: 0,
    assignment: 4,
    pendingAssignments: [
      {
        id: 1,
        title: "Physics Lab Report",
        subject: "Physics",
        due_date: new Date(Date.now() + 0.5*24*60*60*1000).toISOString(),
        status: "pending"
      },
      {
        id: 2,
        title: "Chemistry Project",
        subject: "Chemistry",
        due_date: new Date(Date.now() + 1.5*24*60*60*1000).toISOString(),
        status: "pending"
      }
    ],
    upcomingEvents: [
      {
        id: 1,
        title: "Coding Competition",
        event_type: "competition",
        event_date: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
        venue: "Lab A"
      }
    ]
  };
}

export function getMockHighPerformer() {
  return {
    attendance: 95,
    attendanceTrend: 1,
    mid1: 24,
    mid2: 0,
    assignment: 10,
    pendingAssignments: [],
    upcomingEvents: []
  };
}
```

---

## Backend API Response Format (For Future Integration)

If you want to add a backend endpoint:

```python
# FastAPI route example

@router.get("/student/tasks/generate")
async def generate_tasks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate smart tasks for a student based on their data
    
    Returns:
    {
      "today": [Task, Task, ...],
      "thisWeek": [Task, Task, ...]
    }
    """
    # Fetch student data
    attendance = get_student_attendance(student_id, db)
    marks = get_student_marks(student_id, db)
    assignments = get_pending_assignments(student_id, db)
    events = get_upcoming_events(student_id, db)
    
    # Prepare data
    student_data = {
        "attendance": attendance,
        "mid1": marks.mid1,
        "mid2": marks.mid2,
        "assignment": marks.assignment,
        "pending_assignments": assignments,
        "upcoming_events": events
    }
    
    # Generate tasks (client-side logic, but could be server-side)
    engine = TaskGenerationEngine(student_data)
    tasks = engine.generateAllTasks()
    
    return tasks
```

---

## Test Cases

### Test Case 1: Attendance Warning
```python
def test_attendance_warning():
    data = {"attendance": 72}
    engine = TaskGenerationEngine(data)
    tasks = engine.generateAllTasks()
    
    attendance_task = next(t for t in tasks.get("today", []) if t["type"] == "attendance")
    assert attendance_task["priority"] == "HIGH"
    assert "75%" in attendance_task["reason"]
```

### Test Case 2: No Tasks When Performing Well
```python
def test_no_tasks_when_good():
    data = {
        "attendance": 95,
        "mid1": 24,
        "pending_assignments": [],
        "upcoming_events": []
    }
    engine = TaskGenerationEngine(data)
    tasks = engine.generateAllTasks()
    
    assert len(tasks["today"]) == 0
    assert len(tasks["thisWeek"]) == 0
```

### Test Case 3: Task Prioritization
```python
def test_task_prioritization():
    data = {
        "attendance": 70,
        "mid1": 8,
        "pending_assignments": [
            {"id": 1, "due_date": tomorrow, "title": "A1"},
            {"id": 2, "due_date": next_week, "title": "A2"}
        ]
    }
    engine = TaskGenerationEngine(data)
    tasks = engine.generateAllTasks()
    
    # Attendance should be first (both HIGH priority)
    # Then urgent assignment
    first_task = tasks["today"][0]
    assert first_task["type"] == "attendance"  # or assignment with 0 days left
```

---

**Last Updated:** April 6, 2026  
**Status:** ✅ Complete with Real Examples

