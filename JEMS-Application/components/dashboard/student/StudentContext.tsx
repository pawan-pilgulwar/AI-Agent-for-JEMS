"use client";

import { createContext, useContext } from "react";
import type { StudentView } from "@/lib/student";

const StudentContext = createContext<StudentView | null>(null);

/** Provides the signed-in student to every dashboard screen below it. */
export function StudentProvider({
  value,
  children,
}: {
  value: StudentView;
  children: React.ReactNode;
}) {
  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

/** Reads the signed-in student. Must be used under a StudentProvider. */
export function useStudent(): StudentView {
  const student = useContext(StudentContext);
  if (!student) {
    throw new Error("useStudent must be used within a StudentProvider");
  }
  return student;
}
