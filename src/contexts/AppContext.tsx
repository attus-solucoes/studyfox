import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Course, Subject } from '@/types/course';

interface AppContextType {
  courses: Course[];
  addCourse: (course: Course) => void;
  addSubject: (courseId: string, subject: Subject) => void;
  updateSubject: (courseId: string, subjectId: string, updates: Partial<Subject>) => void;
  getSubject: (subjectId: string) => { course: Course; subject: Subject } | null;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'studyos_courses';

function loadCourses(): Course[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(loadCourses);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => [...prev, course]);
  }, []);

  const addSubject = useCallback((courseId: string, subject: Subject) => {
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, subjects: [...c.subjects, subject] } : c)
    );
  }, []);

  const updateSubject = useCallback((courseId: string, subjectId: string, updates: Partial<Subject>) => {
    setCourses(prev =>
      prev.map(c =>
        c.id === courseId
          ? { ...c, subjects: c.subjects.map(s => s.id === subjectId ? { ...s, ...updates } : s) }
          : c
      )
    );
  }, []);

  const getSubject = useCallback((subjectId: string): { course: Course; subject: Subject } | null => {
    for (const course of courses) {
      const subject = course.subjects.find(s => s.id === subjectId);
      if (subject) return { course, subject };
    }
    return null;
  }, [courses]);

  return (
    <AppContext.Provider value={{ courses, addCourse, addSubject, updateSubject, getSubject }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
