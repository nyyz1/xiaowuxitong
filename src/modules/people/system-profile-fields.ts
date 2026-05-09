export type ProfileFieldTargetType = "TEACHER" | "STUDENT";

export type TeacherSystemProfileFieldKey =
  | "employeeNumber"
  | "gender"
  | "phone"
  | "duties"
  | "remarks";

export type StudentSystemProfileFieldKey =
  | "studentNumber"
  | "gender"
  | "phone"
  | "guardianContact"
  | "remarks";

export type SystemProfileFieldKey =
  | TeacherSystemProfileFieldKey
  | StudentSystemProfileFieldKey;

export type SystemProfileFieldConfig = {
  targetType: ProfileFieldTargetType;
  fieldKey: SystemProfileFieldKey;
  name: string;
  sortOrder: number;
};

export const teacherSystemProfileFields = [
  {
    targetType: "TEACHER",
    fieldKey: "employeeNumber",
    name: "工号",
    sortOrder: -100,
  },
  {
    targetType: "TEACHER",
    fieldKey: "gender",
    name: "性别",
    sortOrder: -90,
  },
  {
    targetType: "TEACHER",
    fieldKey: "phone",
    name: "联系电话",
    sortOrder: -80,
  },
  {
    targetType: "TEACHER",
    fieldKey: "duties",
    name: "职务归属",
    sortOrder: -70,
  },
  {
    targetType: "TEACHER",
    fieldKey: "remarks",
    name: "备注",
    sortOrder: -60,
  },
] satisfies SystemProfileFieldConfig[];

export const studentSystemProfileFields = [
  {
    targetType: "STUDENT",
    fieldKey: "studentNumber",
    name: "学籍号",
    sortOrder: -100,
  },
  {
    targetType: "STUDENT",
    fieldKey: "gender",
    name: "性别",
    sortOrder: -90,
  },
  {
    targetType: "STUDENT",
    fieldKey: "phone",
    name: "联系电话",
    sortOrder: -80,
  },
  {
    targetType: "STUDENT",
    fieldKey: "guardianContact",
    name: "监护人联系方式",
    sortOrder: -70,
  },
  {
    targetType: "STUDENT",
    fieldKey: "remarks",
    name: "备注",
    sortOrder: -60,
  },
] satisfies SystemProfileFieldConfig[];

export const systemProfileFieldsByTarget = {
  TEACHER: teacherSystemProfileFields,
  STUDENT: studentSystemProfileFields,
} satisfies Record<ProfileFieldTargetType, SystemProfileFieldConfig[]>;

export function getSystemProfileFieldByName(
  targetType: ProfileFieldTargetType,
  name: string,
) {
  const normalizedName = name.trim();

  return systemProfileFieldsByTarget[targetType].find(
    (field) => field.name === normalizedName,
  );
}

export function getSystemProfileFieldByKey(
  targetType: ProfileFieldTargetType,
  fieldKey: string,
) {
  return systemProfileFieldsByTarget[targetType].find(
    (field) => field.fieldKey === fieldKey,
  );
}
