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

type QuickStudentScopeFieldsProps = {
  grades: GradeOption[];
  classes: ClassOption[];
  defaultGradeId?: string | null;
  defaultClassId?: string | null;
};

const selectClassName =
  "h-12 rounded-md border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] disabled:bg-slate-50 disabled:text-[var(--text-muted)]";

export function QuickStudentScopeFields({
  grades,
  classes,
  defaultGradeId,
  defaultClassId,
}: QuickStudentScopeFieldsProps) {
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

  return (
    <>
      <select
        name="studentGradeId"
        value={selectedGradeId}
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
        <option value="">全部年级</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </select>

      <select
        name="studentClassId"
        value={classValue}
        disabled={!selectedGradeId}
        onChange={(event) => setSelectedClassId(event.target.value)}
        className={selectClassName}
      >
        <option value="">
          {!selectedGradeId
            ? "请先选择年级"
            : filteredClasses.length > 0
              ? "全部班级"
              : "本年级暂无班级"}
        </option>
        {filteredClasses.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.name}
          </option>
        ))}
      </select>
    </>
  );
}
