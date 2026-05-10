"use client";

import { useMemo, useState } from "react";

type GradeOption = {
  id: string;
  name: string;
};

type ClassOption = {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
};

type StudentScopeFieldsProps = {
  grades: GradeOption[];
  classes: ClassOption[];
  gradeName: string;
  className: string;
  defaultGradeId?: string | null;
  defaultClassId?: string | null;
  gradePlaceholder: string;
  classPlaceholder: string;
  classPrompt: string;
  emptyClassLabel: string;
  disabledClassLabel: string;
  requiredGrade?: boolean;
};

const selectClassName =
  "h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)] disabled:bg-slate-50 disabled:text-[var(--text-muted)]";

export function StudentScopeFields({
  grades,
  classes,
  gradeName,
  className,
  defaultGradeId,
  defaultClassId,
  gradePlaceholder,
  classPlaceholder,
  classPrompt,
  emptyClassLabel,
  disabledClassLabel,
  requiredGrade = false,
}: StudentScopeFieldsProps) {
  const resolvedDefaultGradeId =
    defaultGradeId ||
    classes.find((classItem) => classItem.id === defaultClassId)?.gradeId ||
    "";
  const [selectedGradeId, setSelectedGradeId] = useState(resolvedDefaultGradeId);
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId ?? "");

  const filteredClasses = useMemo(
    () =>
      selectedGradeId
        ? classes.filter((classItem) => classItem.gradeId === selectedGradeId)
        : [],
    [classes, selectedGradeId],
  );

  const classValue = filteredClasses.some((classItem) => classItem.id === selectedClassId)
    ? selectedClassId
    : "";
  const classLabel = !selectedGradeId
    ? disabledClassLabel
    : filteredClasses.length > 0
      ? classPrompt
      : emptyClassLabel;

  return (
    <>
      <select
        name={gradeName}
        value={selectedGradeId}
        required={requiredGrade}
        onChange={(event) => {
          const nextGradeId = event.target.value;
          setSelectedGradeId(nextGradeId);

          if (
            selectedClassId &&
            !classes.some(
              (classItem) =>
                classItem.id === selectedClassId && classItem.gradeId === nextGradeId,
            )
          ) {
            setSelectedClassId("");
          }
        }}
        className={selectClassName}
      >
        <option value="">{gradePlaceholder}</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </select>

      <select
        name={className}
        value={classValue}
        disabled={!selectedGradeId || filteredClasses.length === 0}
        onChange={(event) => setSelectedClassId(event.target.value)}
        className={selectClassName}
      >
        <option value="">{selectedGradeId ? classLabel : classPlaceholder}</option>
        {filteredClasses.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.name}
          </option>
        ))}
      </select>
    </>
  );
}
