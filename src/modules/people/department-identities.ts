import { TeacherDepartmentIdentityType } from "@/generated/prisma/enums";

export const teacherDepartmentIdentityOptions = [
  TeacherDepartmentIdentityType.FRONTLINE_TEACHER,
  TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
  TeacherDepartmentIdentityType.GRADE_MANAGER,
  TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF,
  TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF,
  TeacherDepartmentIdentityType.LOGISTICS_STAFF,
  TeacherDepartmentIdentityType.GRADE_SUBJECT_LEADER,
] as const;

export const teacherDepartmentIdentityLabels: Record<
  TeacherDepartmentIdentityType,
  string
> = {
  [TeacherDepartmentIdentityType.FRONTLINE_TEACHER]: "一线教师",
  [TeacherDepartmentIdentityType.DEPARTMENT_LEADER]: "部门领导",
  [TeacherDepartmentIdentityType.GRADE_MANAGER]: "年级管理员",
  [TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF]: "政教工作人员",
  [TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF]: "教务工作人员",
  [TeacherDepartmentIdentityType.LOGISTICS_STAFF]: "后勤工作人员",
  [TeacherDepartmentIdentityType.GRADE_SUBJECT_LEADER]: "年级学科组长",
};

export function normalizeTeacherDepartmentIdentity(value: string) {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  const byLabel = Object.entries(teacherDepartmentIdentityLabels).find(
    ([, label]) => label === trimmed,
  )?.[0];

  if (byLabel) {
    return byLabel as TeacherDepartmentIdentityType;
  }

  if (
    teacherDepartmentIdentityOptions.includes(
      upper as TeacherDepartmentIdentityType,
    )
  ) {
    return upper as TeacherDepartmentIdentityType;
  }

  return TeacherDepartmentIdentityType.FRONTLINE_TEACHER;
}

