import { GradeStage } from "@/generated/prisma/enums";

export const activeCohortWindowSize = 3;

const academicYearNameStartPattern = /(\d{4})/u;
const activeGradeNamePattern = /^(\d{4})\s*级$/u;
const archivedGradeNamePattern = /^(\d{4})\s*级入学\s*\/\s*(\d{4})\s*届毕业$/u;
const gradeDepartmentNamePattern = /(\d{4})\s*级\s*年级/u;
const legacyGraduationNamePattern = /^(\d{4})\s*届$/u;

export function buildCohortGradeName(enrollmentYear: number) {
  return `${enrollmentYear}级`;
}

export function buildArchivedGradeName(
  enrollmentYear: number,
  graduationYear: number,
) {
  return `${enrollmentYear}级入学 / ${graduationYear}届毕业`;
}

export function buildGradeDepartmentName(enrollmentYear: number) {
  return `${enrollmentYear}级年级`;
}

export function buildCompatibilityAcademicYearName(enrollmentYear: number) {
  return `${enrollmentYear}-${enrollmentYear + 1}学年`;
}

export function buildCompatibilityAcademicYearDateRange(enrollmentYear: number) {
  return {
    startDate: new Date(Date.UTC(enrollmentYear, 8, 1)),
    endDate: new Date(Date.UTC(enrollmentYear + 1, 7, 31)),
  } as const;
}

export function buildVisibleCohortLifecycle(enrollmentYear: number) {
  return {
    name: buildCohortGradeName(enrollmentYear),
    stage: null,
    enrollmentYear,
    isVisibleInMain: true,
    graduationYear: null,
  } as const;
}

export function buildArchivedCohortLifecycle(
  enrollmentYear: number,
  graduationYear = enrollmentYear + activeCohortWindowSize,
) {
  return {
    name: buildArchivedGradeName(enrollmentYear, graduationYear),
    stage: GradeStage.ALUMNI,
    enrollmentYear,
    isVisibleInMain: false,
    graduationYear,
  } as const;
}

export function parseEnrollmentYearFromName(name: string) {
  const normalized = name.trim();
  const archivedMatch = normalized.match(archivedGradeNamePattern);

  if (archivedMatch) {
    return Number(archivedMatch[1]);
  }

  const activeMatch = normalized.match(activeGradeNamePattern);
  return activeMatch ? Number(activeMatch[1]) : null;
}

export function parseGraduationYearFromName(name: string) {
  const normalized = name.trim();
  const archivedMatch = normalized.match(archivedGradeNamePattern);

  if (archivedMatch) {
    return Number(archivedMatch[2]);
  }

  const legacyMatch = normalized.match(legacyGraduationNamePattern);
  return legacyMatch ? Number(legacyMatch[1]) : null;
}

export function parseEnrollmentYearFromGradeDepartmentName(name: string) {
  const matched = name.trim().match(gradeDepartmentNamePattern);
  return matched ? Number(matched[1]) : null;
}

export function replaceEnrollmentYearInGradeDepartmentName(
  name: string,
  enrollmentYear: number,
) {
  const normalized = name.trim();

  if (!gradeDepartmentNamePattern.test(normalized)) {
    return null;
  }

  return normalized.replace(
    gradeDepartmentNamePattern,
    buildGradeDepartmentName(enrollmentYear),
  );
}

export function buildGradeDepartmentNameSyncPlan<T extends { id: string; name: string }>(args: {
  departments: T[];
  activeEnrollmentYears: number[];
}) {
  const activeEnrollmentYears = Array.from(new Set(args.activeEnrollmentYears)).sort(
    (left, right) => left - right,
  );
  const activeEnrollmentYearSet = new Set(activeEnrollmentYears);
  const gradeDepartments = args.departments
    .map((department) => ({
      department,
      enrollmentYear: parseEnrollmentYearFromGradeDepartmentName(department.name),
    }))
    .filter(
      (
        item,
      ): item is {
        department: T;
        enrollmentYear: number;
      } => item.enrollmentYear !== null,
    );

  const departmentEnrollmentYears = new Set(
    gradeDepartments.map((item) => item.enrollmentYear),
  );
  const missingEnrollmentYears = activeEnrollmentYears.filter(
    (enrollmentYear) => !departmentEnrollmentYears.has(enrollmentYear),
  );
  const staleEnrollmentYears = Array.from(
    new Set(
      gradeDepartments
        .map((item) => item.enrollmentYear)
        .filter((enrollmentYear) => !activeEnrollmentYearSet.has(enrollmentYear)),
    ),
  ).sort((left, right) => left - right);

  if (missingEnrollmentYears.length === 0 || staleEnrollmentYears.length === 0) {
    return [];
  }

  const replacementByStaleYear = new Map(
    staleEnrollmentYears.map((staleEnrollmentYear, index) => [
      staleEnrollmentYear,
      missingEnrollmentYears[index] ??
        missingEnrollmentYears[missingEnrollmentYears.length - 1],
    ]),
  );
  const existingNames = new Set(args.departments.map((department) => department.name.trim()));
  const originalNamesPlannedForUpdate = new Set<string>();
  const candidates = gradeDepartments
    .map((item) => {
      const replacementYear = replacementByStaleYear.get(item.enrollmentYear);
      const nextName =
        replacementYear === undefined
          ? null
          : replaceEnrollmentYearInGradeDepartmentName(
              item.department.name,
              replacementYear,
            );

      return nextName && nextName !== item.department.name.trim()
        ? {
            id: item.department.id,
            from: item.department.name,
            to: nextName,
          }
        : null;
    })
    .filter((item): item is { id: string; from: string; to: string } => item !== null);

  for (const candidate of candidates) {
    originalNamesPlannedForUpdate.add(candidate.from.trim());
  }

  const nextNames = new Set<string>();

  return candidates.filter((candidate) => {
    if (nextNames.has(candidate.to)) {
      return false;
    }

    if (existingNames.has(candidate.to) && !originalNamesPlannedForUpdate.has(candidate.to)) {
      return false;
    }

    nextNames.add(candidate.to);
    return true;
  });
}

export function parseAcademicYearStartYear(
  academicYearName: string | null | undefined,
  startDate: Date | null | undefined,
) {
  if (startDate) {
    return startDate.getUTCFullYear();
  }

  const normalized = academicYearName?.trim() ?? "";
  const matched = normalized.match(academicYearNameStartPattern);
  return matched ? Number(matched[1]) : null;
}

export function inferEnrollmentYearFromLegacyStage(args: {
  stage: GradeStage | string | null | undefined;
  name: string;
  academicYearName?: string | null;
  academicYearStartDate?: Date | null;
  graduationYear?: number | null;
}) {
  const explicitEnrollmentYear = parseEnrollmentYearFromName(args.name);

  if (explicitEnrollmentYear !== null) {
    return explicitEnrollmentYear;
  }

  const explicitGraduationYear =
    args.graduationYear ?? parseGraduationYearFromName(args.name);

  if (args.stage === GradeStage.ALUMNI || args.stage === "ALUMNI") {
    return explicitGraduationYear !== null
      ? explicitGraduationYear - activeCohortWindowSize
      : null;
  }

  const academicYearStart = parseAcademicYearStartYear(
    args.academicYearName,
    args.academicYearStartDate,
  );

  if (academicYearStart === null) {
    return null;
  }

  if (args.stage === GradeStage.HIGH_ONE || args.stage === "HIGH_ONE") {
    return academicYearStart;
  }

  if (args.stage === GradeStage.HIGH_TWO || args.stage === "HIGH_TWO") {
    return academicYearStart - 1;
  }

  if (args.stage === GradeStage.HIGH_THREE || args.stage === "HIGH_THREE") {
    return academicYearStart - 2;
  }

  return null;
}

export function resolveTargetEnrollmentYear(
  academicYearStartDate: Date | null | undefined,
  sourceEnrollmentYears: number[],
  fallbackDate = new Date(),
) {
  if (academicYearStartDate) {
    return academicYearStartDate.getUTCFullYear();
  }

  if (sourceEnrollmentYears.length > 0) {
    return Math.max(...sourceEnrollmentYears) + 1;
  }

  return fallbackDate.getFullYear();
}

export function sortByEnrollmentYear<T extends { enrollmentYear: number | null }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftYear = left.enrollmentYear ?? Number.NEGATIVE_INFINITY;
    const rightYear = right.enrollmentYear ?? Number.NEGATIVE_INFINITY;
    return leftYear - rightYear;
  });
}

export function buildNumberedClassName(index: number) {
  return `${index}班`;
}

export function parseClassSequence(name: string) {
  const normalized = name.trim();
  const matched = normalized.match(/^(\d+)\s*班?$/u);

  if (matched) {
    return Number(matched[1]);
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
}

export function sortClassNamesForLifecycle<T extends { name: string }>(classes: T[]) {
  return [...classes].sort((left, right) => {
    const leftSequence = parseClassSequence(left.name);
    const rightSequence = parseClassSequence(right.name);

    if (leftSequence !== null && rightSequence !== null && leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    if (leftSequence !== null && rightSequence === null) {
      return -1;
    }

    if (leftSequence === null && rightSequence !== null) {
      return 1;
    }

    return left.name.localeCompare(right.name, "zh-Hans-CN");
  });
}
