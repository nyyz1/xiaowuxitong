"use client";

import { useState } from "react";

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

type DepartmentOption = {
  id: string;
  name: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type TeacherOption = {
  id: string;
  name: string;
  idCardNumber?: string | null;
  departmentId?: string | null;
  department?: DepartmentOption | null;
  departmentAssignments?: Array<{
    departmentId: string;
    department?: DepartmentOption | null;
  }>;
  subjectId?: string | null;
  subject?: SubjectOption | null;
};

const selectClassName =
  "h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]";

function getTeacherDepartments(teacher: TeacherOption) {
  const departments = (teacher.departmentAssignments ?? [])
    .filter((assignment) => assignment.departmentId && assignment.department?.name)
    .map((assignment) => ({
      id: assignment.departmentId,
      name: assignment.department?.name?.trim() ?? "",
    }))
    .filter((department) => department.name);

  if (departments.length > 0) {
    return Array.from(
      new Map(departments.map((department) => [department.id, department])).values(),
    );
  }

  if (teacher.departmentId && teacher.department?.name?.trim()) {
    return [
      {
        id: teacher.departmentId,
        name: teacher.department.name.trim(),
      },
    ];
  }

  return [];
}

function buildDepartmentOptions(teachers: TeacherOption[]) {
  return Array.from(
    new Map(
      teachers.flatMap((teacher) =>
        getTeacherDepartments(teacher).map((department) => [
          department.id,
          department,
        ]),
      ),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function buildSubjectOptions(teachers: TeacherOption[]) {
  return Array.from(
    new Map(
      teachers
        .filter((teacher) => teacher.subjectId && teacher.subject?.name)
        .map((teacher) => [
          teacher.subjectId ?? "",
          {
            id: teacher.subjectId ?? "",
            name: teacher.subject?.name?.trim() ?? "",
          },
        ]),
    ).values(),
  )
    .filter((subject) => subject.id && subject.name)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function formatTeacherOptionLabel(teacher: TeacherOption) {
  const parts = [teacher.name];

  if (teacher.idCardNumber) {
    parts.push(teacher.idCardNumber);
  }

  const departmentNames = getTeacherDepartments(teacher).map(
    (department) => department.name,
  );

  if (departmentNames.length > 0) {
    parts.push(departmentNames.join("、"));
  }

  return parts.join(" / ");
}

function matchesTeacherFilters(
  teacher: TeacherOption,
  departmentId: string,
  subjectId: string,
) {
  const matchesDepartment = departmentId
    ? getTeacherDepartments(teacher).some((department) => department.id === departmentId)
    : true;
  const matchesSubject = subjectId ? teacher.subjectId === subjectId : true;

  return matchesDepartment && matchesSubject;
}

function StudentScopeFields({
  grades,
  classes,
  defaultGradeId,
  defaultClassId,
}: {
  grades: GradeOption[];
  classes: ClassOption[];
  defaultGradeId?: string | null;
  defaultClassId?: string | null;
}) {
  const [selectedGradeId, setSelectedGradeId] = useState(
    defaultGradeId ||
      classes.find((classItem) => classItem.id === defaultClassId)?.gradeId ||
      (grades.length === 1 ? grades[0]?.id ?? "" : ""),
  );
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId ?? "");

  const filteredClasses = selectedGradeId
    ? classes.filter((classItem) => classItem.gradeId === selectedGradeId)
    : [];
  const classValue = filteredClasses.some(
    (classItem) => classItem.id === selectedClassId,
  )
    ? selectedClassId
    : "";

  const classPlaceholder = !selectedGradeId
    ? "请先选择年级"
    : filteredClasses.length > 0
      ? "请选择具体班级"
      : "当前年级暂无班级";

  return (
    <>
      <select
        name="gradeId"
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
        required
        className={selectClassName}
      >
        <option value="">请选择年级</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </select>
      <select
        name="classId"
        value={classValue}
        onChange={(event) => setSelectedClassId(event.target.value)}
        disabled={!selectedGradeId || filteredClasses.length === 0}
        className={selectClassName}
      >
        <option value="">{classPlaceholder}</option>
        {filteredClasses.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.name}
          </option>
        ))}
      </select>
    </>
  );
}

function TeacherScopeFields({
  teachers,
  defaultTeacherId,
}: {
  teachers: TeacherOption[];
  defaultTeacherId?: string | null;
}) {
  const defaultTeacher = teachers.find((teacher) => teacher.id === defaultTeacherId);
  const defaultDepartmentId = defaultTeacher
    ? getTeacherDepartments(defaultTeacher)[0]?.id ?? ""
    : "";
  const defaultSubjectId = defaultTeacher?.subjectId ?? "";
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(defaultSubjectId);
  const [selectedTeacherId, setSelectedTeacherId] = useState(defaultTeacherId ?? "");

  const departmentOptions = buildDepartmentOptions(teachers);
  const subjectOptions = buildSubjectOptions(teachers);
  const hasFilterSelection = Boolean(selectedDepartmentId || selectedSubjectId);
  const canKeepSelectedTeacher = Boolean(defaultTeacherId);
  const filteredTeachers = teachers.filter((teacher) =>
    matchesTeacherFilters(teacher, selectedDepartmentId, selectedSubjectId),
  );
  const visibleTeachers = hasFilterSelection
    ? filteredTeachers
    : canKeepSelectedTeacher && selectedTeacherId
      ? teachers.filter((teacher) => teacher.id === selectedTeacherId)
      : [];
  const teacherValue = visibleTeachers.some(
    (teacher) => teacher.id === selectedTeacherId,
  )
    ? selectedTeacherId
    : "";

  const teacherPlaceholder = !hasFilterSelection && !canKeepSelectedTeacher
    ? "请先选择部门或学科"
    : visibleTeachers.length > 0
      ? "请选择教师"
      : "当前筛选下暂无教师";

  return (
    <>
      <select
        name="teacherDepartmentId"
        value={selectedDepartmentId}
        onChange={(event) => {
          const nextDepartmentId = event.target.value;
          setSelectedDepartmentId(nextDepartmentId);

          if (
            selectedTeacherId &&
            !teachers.some(
              (teacher) =>
                teacher.id === selectedTeacherId &&
                matchesTeacherFilters(teacher, nextDepartmentId, selectedSubjectId),
            )
          ) {
            setSelectedTeacherId("");
          }
        }}
        className={selectClassName}
      >
        <option value="">全部部门</option>
        {departmentOptions.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
      <select
        name="teacherSubjectId"
        value={selectedSubjectId}
        onChange={(event) => {
          const nextSubjectId = event.target.value;
          setSelectedSubjectId(nextSubjectId);

          if (
            selectedTeacherId &&
            !teachers.some(
              (teacher) =>
                teacher.id === selectedTeacherId &&
                matchesTeacherFilters(teacher, selectedDepartmentId, nextSubjectId),
            )
          ) {
            setSelectedTeacherId("");
          }
        }}
        className={selectClassName}
      >
        <option value="">全部学科</option>
        {subjectOptions.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </select>
      <select
        name="teacherId"
        value={teacherValue}
        onChange={(event) => setSelectedTeacherId(event.target.value)}
        required
        disabled={visibleTeachers.length === 0}
        className={selectClassName}
      >
        <option value="">{teacherPlaceholder}</option>
        {visibleTeachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {formatTeacherOptionLabel(teacher)}
          </option>
        ))}
      </select>
    </>
  );
}

export function InspectionRecordScopeFields({
  targetType,
  grades,
  classes,
  teachers,
  defaultGradeId,
  defaultClassId,
  defaultTeacherId,
}: {
  targetType: "STUDENT" | "TEACHER";
  grades: GradeOption[];
  classes: ClassOption[];
  teachers: TeacherOption[];
  defaultGradeId?: string | null;
  defaultClassId?: string | null;
  defaultTeacherId?: string | null;
}) {
  if (targetType === "TEACHER") {
    return (
      <TeacherScopeFields
        teachers={teachers}
        defaultTeacherId={defaultTeacherId}
      />
    );
  }

  return (
    <StudentScopeFields
      grades={grades}
      classes={classes}
      defaultGradeId={defaultGradeId}
      defaultClassId={defaultClassId}
    />
  );
}
