export const teacherStatusOptions = [
  { value: "ACTIVE", label: "正常" },
  { value: "PREGNANCY_PREPARATION", label: "备孕" },
  { value: "MATERNITY_LEAVE", label: "产假" },
  { value: "LONG_SICK_LEAVE", label: "长病假" },
] as const;

export const studentStatusOptions = [
  { value: "ACTIVE", label: "正常" },
  { value: "SUSPENDED", label: "休学" },
  { value: "LONG_TERM_LEAVE", label: "长期请假" },
] as const;

export const teacherStatuses = teacherStatusOptions.map((option) => option.value) as [
  (typeof teacherStatusOptions)[number]["value"],
  ...(typeof teacherStatusOptions)[number]["value"][],
];

export const studentStatuses = studentStatusOptions.map((option) => option.value) as [
  (typeof studentStatusOptions)[number]["value"],
  ...(typeof studentStatusOptions)[number]["value"][],
];

const teacherStatusLabelMap = Object.fromEntries(
  teacherStatusOptions.map((option) => [option.value, option.label]),
) as Record<string, string>;

const studentStatusLabelMap = Object.fromEntries(
  studentStatusOptions.map((option) => [option.value, option.label]),
) as Record<string, string>;

export function getTeacherStatusLabel(status: string) {
  return teacherStatusLabelMap[status] ?? "正常";
}

export function getStudentStatusLabel(status: string) {
  return studentStatusLabelMap[status] ?? "正常";
}

export function isTeacherActiveStatus(status: string) {
  return status === "ACTIVE";
}

export function isStudentActiveStatus(status: string) {
  return status === "ACTIVE";
}
