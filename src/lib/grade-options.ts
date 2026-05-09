export type GradeWithClassesLike<TClass> = {
  id: string;
  name: string;
  classes: TClass[];
};

export type ClassWithGradeLabel<TClass extends { id: string; name: string }> = TClass & {
  gradeId: string;
  gradeName: string;
};

export function flattenClassOptions<
  TClass extends { id: string; name: string },
  TGrade extends GradeWithClassesLike<TClass>,
>(grades: TGrade[]): Array<ClassWithGradeLabel<TClass>> {
  return grades.flatMap((grade) =>
    grade.classes.map((classItem) => ({
      ...classItem,
      gradeId: grade.id,
      gradeName: grade.name,
    })),
  );
}

export function formatGradeScopeLabel(
  gradeName: string | null | undefined,
  className?: string | null,
) {
  const normalizedGradeName = gradeName?.trim() || "未关联年级";

  if (className?.trim()) {
    return `${normalizedGradeName} / ${className.trim()}`;
  }

  return `${normalizedGradeName} / 全年级`;
}
