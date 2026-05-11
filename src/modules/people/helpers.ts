import type { Prisma } from "@/generated/prisma/client";
import type { TeacherDepartmentIdentityType } from "@/generated/prisma/enums";
import { teacherDepartmentIdentityLabels } from "@/modules/people/department-identities";

export const PROFILE_FIELD_INPUT_PREFIX = "profileField__";
export const PROFILE_FIELD_VALUE_MAX_LENGTH = 120;

type ProfileFieldTargetType = "TEACHER" | "STUDENT";

export type ProfileFieldDefinitionLike = {
  id: string;
  name: string;
  fieldKey?: string | null;
  sortOrder: number;
  isActive: boolean;
  isDeleted?: boolean;
  targetType: ProfileFieldTargetType;
};

export type ProfileFieldValueMap = Record<string, string>;

type DepartmentLike = {
  id?: string;
  name: string;
};

type TeacherDepartmentAssignmentLike = {
  departmentId: string;
  identityType?: TeacherDepartmentIdentityType | null;
  department?: DepartmentLike | null;
};

type TeacherDepartmentLike = {
  departmentId?: string | null;
  department?: DepartmentLike | null;
  departmentAssignments?: TeacherDepartmentAssignmentLike[];
};

type ProfileFieldCollectionResult = {
  touchedFieldIds: string[];
  values: ProfileFieldValueMap;
};

export function splitMultiValueText(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，、;]/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function sortProfileFieldDefinitions<T extends ProfileFieldDefinitionLike>(
  definitions: T[],
) {
  return [...definitions].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return Number(right.isActive) - Number(left.isActive);
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name, "zh-Hans-CN");
  });
}

export function normalizeProfileFieldValue(value: string) {
  return value.trim();
}

function normalizeDormitoryFieldValue(value: string) {
  return normalizeProfileFieldValue(value).toUpperCase();
}

function normalizeDefinitionProfileValue(
  definition: ProfileFieldDefinitionLike,
  value: string,
) {
  if (definition.name.includes("宿舍")) {
    return normalizeDormitoryFieldValue(value);
  }

  return normalizeProfileFieldValue(value);
}

export function getProfileFieldInputName(fieldId: string) {
  return `${PROFILE_FIELD_INPUT_PREFIX}${fieldId}`;
}

export function normalizeProfileData(value: unknown): ProfileFieldValueMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawValue]) => {
      if (typeof rawValue !== "string") {
        return [];
      }

      const normalizedValue = normalizeProfileFieldValue(rawValue);
      return normalizedValue ? [[key, normalizedValue]] : [];
    }),
  );
}

export function profileDataToJsonInput(
  values: ProfileFieldValueMap,
): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => normalizeProfileFieldValue(value)),
  ) as Prisma.InputJsonObject;
}

export function mergeProfileData(
  existingProfileData: unknown,
  nextValues: ProfileFieldValueMap,
  touchedFieldIds: string[],
) {
  const merged = {
    ...normalizeProfileData(existingProfileData),
  };

  for (const fieldId of touchedFieldIds) {
    const value = normalizeProfileFieldValue(nextValues[fieldId] ?? "");

    if (value) {
      merged[fieldId] = value;
    } else {
      delete merged[fieldId];
    }
  }

  return merged;
}

export function mergeSystemProfileData(
  definitions: ProfileFieldDefinitionLike[],
  existingProfileData: unknown,
  systemValuesByKey: Record<string, string | null | undefined>,
) {
  const merged = {
    ...normalizeProfileData(existingProfileData),
  };

  for (const definition of definitions) {
    if (!definition.fieldKey) {
      continue;
    }

    const value = normalizeProfileFieldValue(
      systemValuesByKey[definition.fieldKey] ?? "",
    );

    if (value && !merged[definition.id]) {
      merged[definition.id] = value;
    }
  }

  return merged;
}

export function collectProfileValuesFromFormData(
  formData: FormData,
  definitions: ProfileFieldDefinitionLike[],
): ProfileFieldCollectionResult {
  const touchedFieldIds: string[] = [];
  const values: ProfileFieldValueMap = {};

  for (const definition of definitions) {
    const inputName = getProfileFieldInputName(definition.id);

    if (!formData.has(inputName)) {
      continue;
    }

    touchedFieldIds.push(definition.id);
    const value = formData.get(inputName);
    values[definition.id] =
      typeof value === "string" ? normalizeDefinitionProfileValue(definition, value) : "";
  }

  return {
    touchedFieldIds,
    values,
  };
}

export function collectProfileValuesFromRow(
  row: Record<string, unknown>,
  definitions: ProfileFieldDefinitionLike[],
): ProfileFieldCollectionResult {
  const touchedFieldIds: string[] = [];
  const values: ProfileFieldValueMap = {};

  for (const definition of definitions) {
    if (!Object.prototype.hasOwnProperty.call(row, definition.name)) {
      continue;
    }

    touchedFieldIds.push(definition.id);
    const rawValue = row[definition.name];
    values[definition.id] =
      rawValue === undefined || rawValue === null
        ? ""
        : normalizeDefinitionProfileValue(definition, String(rawValue));
  }

  return {
    touchedFieldIds,
    values,
  };
}

export function getProfileFieldValue(profileData: unknown, fieldId: string) {
  return normalizeProfileData(profileData)[fieldId] ?? "";
}

export function getProfileFieldEntries(
  definitions: ProfileFieldDefinitionLike[],
  profileData: unknown,
  options: {
    activeOnly?: boolean;
    includeEmpty?: boolean;
  } = {},
) {
  const normalizedData = normalizeProfileData(profileData);
  const activeOnly = options.activeOnly ?? false;
  const includeEmpty = options.includeEmpty ?? false;

  return sortProfileFieldDefinitions(definitions)
    .filter((definition) => (activeOnly ? definition.isActive : true))
    .map((definition) => ({
      ...definition,
      value: normalizedData[definition.id] ?? "",
    }))
    .filter((entry) => (includeEmpty ? true : Boolean(entry.value)));
}

export function getTeacherDepartmentIds(teacher: TeacherDepartmentLike) {
  const assignmentIds = Array.from(
    new Set(
      (teacher.departmentAssignments ?? [])
        .map((assignment) => assignment.departmentId)
        .filter(Boolean),
    ),
  );

  if (assignmentIds.length > 0) {
    return assignmentIds;
  }

  return teacher.departmentId ? [teacher.departmentId] : [];
}

export function getTeacherDepartmentNames(teacher: TeacherDepartmentLike) {
  const assignmentNames = Array.from(
    new Set(
      (teacher.departmentAssignments ?? [])
        .map((assignment) => assignment.department?.name?.trim() ?? "")
        .filter(Boolean),
    ),
  );

  if (assignmentNames.length > 0) {
    return assignmentNames;
  }

  return teacher.department?.name ? [teacher.department.name] : [];
}

export function getTeacherDepartmentIdentityMap(teacher: TeacherDepartmentLike) {
  return Object.fromEntries(
    (teacher.departmentAssignments ?? [])
      .map((assignment) => [
        assignment.departmentId,
        assignment.identityType ?? "FRONTLINE_TEACHER",
      ])
      .filter(([departmentId]) => Boolean(departmentId)),
  ) as Record<string, TeacherDepartmentIdentityType>;
}

export function getTeacherDepartmentDisplayItems(teacher: TeacherDepartmentLike) {
  const assignmentItems = (teacher.departmentAssignments ?? [])
    .map((assignment) => {
      const departmentName = assignment.department?.name?.trim();

      if (!departmentName) {
        return "";
      }

      const identityType = assignment.identityType ?? "FRONTLINE_TEACHER";
      return `${departmentName} / ${teacherDepartmentIdentityLabels[identityType]}`;
    })
    .filter(Boolean);

  if (assignmentItems.length > 0) {
    return Array.from(new Set(assignmentItems));
  }

  return teacher.department?.name ? [teacher.department.name] : [];
}
