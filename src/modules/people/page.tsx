import Link from "next/link";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createProfileFieldDefinition,
  createStudent,
  createTeacher,
  deleteProfileFieldDefinition,
  deleteStudent,
  deleteTeacher,
  importStudents,
  importTeachers,
  setProfileFieldDefinitionStatus,
  setStudentStatus,
  setTeacherStatus,
  updateProfileFieldDefinition,
  updateStudent,
  updateTeacher,
} from "@/modules/people/actions";
import {
  getProfileFieldEntries,
  getProfileFieldInputName,
  getTeacherDepartmentIds,
  getTeacherDepartmentNames,
  mergeSystemProfileData,
} from "@/modules/people/helpers";
import type {
  PeopleFilters,
  getPeopleManagementData,
} from "@/modules/people/queries";

type PeopleManagementData = Awaited<ReturnType<typeof getPeopleManagementData>>;
export type PeopleViewMode = "students" | "teachers";

type PeoplePageProps = {
  data: PeopleManagementData;
  filters: PeopleFilters;
  activeView: PeopleViewMode;
  notice: {
    tone: "success" | "error";
    message: string;
  } | null;
  access: {
    canViewTeacherData: boolean;
    canImportTeacherData: boolean;
    canImportStudentData: boolean;
    canEditPeople: boolean;
    canViewAlumniArchive: boolean;
    isGradeScoped: boolean;
  };
};

type GradeOption = PeopleManagementData["gradeOptions"][number];
type ClassOption = PeopleManagementData["classOptions"][number];
type TeacherProfileField = PeopleManagementData["teacherProfileFields"][number];
type StudentProfileField = PeopleManagementData["studentProfileFields"][number];

function getTeacherProfileData(
  teacher: PeopleManagementData["teachers"][number] | undefined,
  fields: TeacherProfileField[],
) {
  if (!teacher) {
    return {};
  }

  return mergeSystemProfileData(fields, teacher.profileData, {
    employeeNumber: teacher.employeeNumber,
    gender: teacher.gender,
    phone: teacher.phone,
    duties: teacher.duties.join("、"),
    remarks: teacher.remarks,
  });
}

function getStudentProfileData(
  student: PeopleManagementData["students"][number] | undefined,
  fields: StudentProfileField[],
) {
  if (!student) {
    return {};
  }

  return mergeSystemProfileData(fields, student.profileData, {
    studentNumber: student.studentNumber,
    gender: student.gender,
    phone: student.phone,
    guardianContact: student.guardianContact,
    remarks: student.remarks,
  });
}

function statusLabel(status: string) {
  return status === "ACTIVE" ? "正常" : "停用";
}

function statusBadgeClass(status: string) {
  return status === "ACTIVE"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-200 text-slate-600";
}

function buildTeacherExportHref(filters: PeopleFilters) {
  const params = new URLSearchParams();

  if (filters.teacherKeyword) {
    params.set("teacherKeyword", filters.teacherKeyword);
  }

  if (filters.teacherDepartmentId) {
    params.set("teacherDepartmentId", filters.teacherDepartmentId);
  }

  if (filters.teacherSubjectId) {
    params.set("teacherSubjectId", filters.teacherSubjectId);
  }

  if (filters.teacherStatus !== "ALL") {
    params.set("teacherStatus", filters.teacherStatus);
  }

  return `/dashboard/people/export/teachers?${params.toString()}`;
}

function buildStudentExportHref(filters: PeopleFilters) {
  const params = new URLSearchParams();

  if (filters.studentKeyword) {
    params.set("studentKeyword", filters.studentKeyword);
  }

  if (filters.studentGradeId) {
    params.set("studentGradeId", filters.studentGradeId);
  }

  if (filters.studentClassId) {
    params.set("studentClassId", filters.studentClassId);
  }

  if (filters.studentStatus !== "ALL") {
    params.set("studentStatus", filters.studentStatus);
  }

  return `/dashboard/people/export/students?${params.toString()}`;
}

function buildPeopleViewHref(view: PeopleViewMode, filters: PeopleFilters) {
  const params = new URLSearchParams({
    view,
  });

  if (view === "teachers") {
    if (filters.teacherKeyword) {
      params.set("teacherKeyword", filters.teacherKeyword);
    }

    if (filters.teacherDepartmentId) {
      params.set("teacherDepartmentId", filters.teacherDepartmentId);
    }

    if (filters.teacherSubjectId) {
      params.set("teacherSubjectId", filters.teacherSubjectId);
    }

    if (filters.teacherStatus !== "ALL") {
      params.set("teacherStatus", filters.teacherStatus);
    }
  } else {
    if (filters.studentKeyword) {
      params.set("studentKeyword", filters.studentKeyword);
    }

    if (filters.studentGradeId) {
      params.set("studentGradeId", filters.studentGradeId);
    }

    if (filters.studentClassId) {
      params.set("studentClassId", filters.studentClassId);
    }

    if (filters.studentStatus !== "ALL") {
      params.set("studentStatus", filters.studentStatus);
    }
  }

  return `/dashboard/people?${params.toString()}`;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--panel-border)] bg-white/78 p-6">
      <div className="flex flex-col gap-2 border-b border-[var(--panel-border)] pb-5">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function PeopleViewTabs({
  activeView,
  filters,
  canViewTeacherData,
}: {
  activeView: PeopleViewMode;
  filters: PeopleFilters;
  canViewTeacherData: boolean;
}) {
  const options: Array<{
    view: PeopleViewMode;
    label: string;
    href: string;
  }> = [
    {
      view: "students",
      label: "学生档案",
      href: buildPeopleViewHref("students", filters),
    },
  ];

  if (canViewTeacherData) {
    options.push({
      view: "teachers",
      label: "教师档案",
      href: buildPeopleViewHref("teachers", filters),
    });
  }

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--panel-border)] bg-white/80 p-2">
      {options.map((option) => {
        const isActive = activeView === option.view;

        return (
          <Link
            key={option.view}
            href={option.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--panel-soft)]"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function TextInput({
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

function FileInput({ name }: { name: string }) {
  return (
    <input
      type="file"
      name={name}
      accept=".xlsx,.xls,.csv"
      required
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[var(--accent-strong)]"
    />
  );
}

function SelectBox({
  name,
  defaultValue,
  children,
  required = false,
}: {
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    >
      {children}
    </select>
  );
}

function UtilityLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent-strong)]"
    >
      {children}
    </a>
  );
}

function DynamicProfileInputs({
  fields,
  profileData,
}: {
  fields: Array<TeacherProfileField | StudentProfileField>;
  profileData?: unknown;
}) {
  const activeFields = fields.filter((field) => field.isActive);

  if (activeFields.length === 0) {
    return null;
  }

  const entries = getProfileFieldEntries(activeFields, profileData, {
    activeOnly: true,
    includeEmpty: true,
  });

  return (
    <div className="lg:col-span-4 grid gap-3 md:grid-cols-2">
      {entries.map((entry) => (
        <TextInput
          key={entry.id}
          name={getProfileFieldInputName(entry.id)}
          defaultValue={entry.value}
          placeholder={entry.name}
        />
      ))}
    </div>
  );
}

function DynamicProfileSummary({
  fields,
  profileData,
}: {
  fields: Array<TeacherProfileField | StudentProfileField>;
  profileData?: unknown;
}) {
  const entries = getProfileFieldEntries(fields, profileData, {
    activeOnly: true,
  });

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <span
          key={entry.id}
          className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]"
        >
          {entry.name}：{entry.value}
        </span>
      ))}
    </div>
  );
}

function DepartmentCheckboxGroup({
  departments,
  selectedIds,
}: {
  departments: PeopleManagementData["departments"];
  selectedIds: string[];
}) {
  return (
    <div className="lg:col-span-4 rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-3">
      <div className="mb-3 text-sm font-medium text-[var(--text-primary)]">
        归属部门
      </div>
      {departments.length === 0 ? (
        <div className="text-sm text-[var(--text-secondary)]">
          请先去学校结构页面维护部门。
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <label
              key={department.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <input
                type="checkbox"
                name="departmentIds"
                value={department.id}
                defaultChecked={selectedIds.includes(department.id)}
                className="h-4 w-4 rounded border-[var(--panel-border)] text-[var(--accent-strong)]"
              />
              <span>{department.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileFieldManager({
  title,
  targetType,
  fields,
}: {
  title: string;
  targetType: "TEACHER" | "STUDENT";
  fields: Array<TeacherProfileField | StudentProfileField>;
}) {
  return (
    <div className="space-y-4 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          新增后的类目会立即进入档案表单、导入模板和导出文件。
        </p>
      </div>

      <form
        action={createProfileFieldDefinition}
        className="grid gap-3 md:grid-cols-[1fr_auto]"
      >
        <input type="hidden" name="targetType" value={targetType} />
        <TextInput name="name" placeholder={`新增${title}，例如宿舍信息`} required />
        <SubmitButton idleLabel="新增类目" pendingLabel="保存中..." className="h-11" />
      </form>

      {fields.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
          还没有已配置的类目。
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {field.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {field.fieldKey ? "系统类目 · " : ""}
                    {field.isActive ? "当前启用" : "当前停用"}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    field.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {field.isActive ? "启用中" : "已停用"}
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <form
                  action={updateProfileFieldDefinition}
                  className="grid gap-3 md:grid-cols-[1fr_auto]"
                >
                  <input type="hidden" name="id" value={field.id} />
                  <input type="hidden" name="targetType" value={targetType} />
                  <TextInput name="name" defaultValue={field.name} placeholder="类目名称" required />
                  <SubmitButton
                    idleLabel="保存名称"
                    pendingLabel="保存中..."
                    tone="secondary"
                    className="h-11"
                  />
                </form>

                <div className="flex flex-wrap gap-2">
                  <form action={setProfileFieldDefinitionStatus}>
                    <input type="hidden" name="id" value={field.id} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={field.isActive ? "false" : "true"}
                    />
                    <SubmitButton
                      idleLabel={field.isActive ? "停用类目" : "启用类目"}
                      pendingLabel="处理中..."
                      tone={field.isActive ? "danger" : "secondary"}
                      className="h-11"
                    />
                  </form>

                  <form action={deleteProfileFieldDefinition}>
                    <input type="hidden" name="id" value={field.id} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <SubmitButton
                      idleLabel="删除类目"
                      pendingLabel="删除中..."
                      tone="danger"
                      className="h-11"
                    />
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherForm({
  departments,
  subjects,
  profileFields,
  teacher,
}: {
  departments: PeopleManagementData["departments"];
  subjects: PeopleManagementData["subjects"];
  profileFields: TeacherProfileField[];
  teacher?: PeopleManagementData["teachers"][number];
}) {
  const action = teacher ? updateTeacher : createTeacher;
  const selectedDepartmentIds = teacher ? getTeacherDepartmentIds(teacher) : [];

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-4">
      {teacher ? <input type="hidden" name="id" value={teacher.id} /> : null}
      <TextInput
        name="idCardNumber"
        defaultValue={teacher?.idCardNumber ?? ""}
        placeholder="身份证号"
        required
      />
      <TextInput name="name" defaultValue={teacher?.name} placeholder="姓名" required />
      <SelectBox name="subjectId" defaultValue={teacher?.subjectId}>
        <option value="">未选择学科</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox
        name="employmentStatus"
        defaultValue={teacher?.employmentStatus ?? "ACTIVE"}
      >
        <option value="ACTIVE">正常</option>
        <option value="INACTIVE">停用</option>
      </SelectBox>
      <div className="lg:col-span-2">
        <SubmitButton
          idleLabel={teacher ? "保存教师" : "新增教师"}
          pendingLabel="保存中..."
          className="h-11 w-full"
          tone={teacher ? "secondary" : "primary"}
        />
      </div>
      <DepartmentCheckboxGroup
        departments={departments}
        selectedIds={selectedDepartmentIds}
      />
      <DynamicProfileInputs
        fields={profileFields}
        profileData={getTeacherProfileData(teacher, profileFields)}
      />
    </form>
  );
}

function StudentForm({
  grades,
  classes,
  profileFields,
  student,
}: {
  grades: GradeOption[];
  classes: ClassOption[];
  profileFields: StudentProfileField[];
  student?: PeopleManagementData["students"][number];
}) {
  const action = student ? updateStudent : createStudent;

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-4">
      <input type="hidden" name="studentViewMode" value="active" />
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <TextInput
        name="idCardNumber"
        defaultValue={student?.idCardNumber ?? ""}
        placeholder="身份证号"
        required
      />
      <TextInput name="name" defaultValue={student?.name} placeholder="姓名" required />
      <SelectBox name="gradeId" defaultValue={student?.gradeId} required>
        <option value="">请选择年级</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="classId" defaultValue={student?.classId}>
        <option value="">未选择班级</option>
        {classes.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.gradeName} / {classItem.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox
        name="enrollmentStatus"
        defaultValue={student?.enrollmentStatus ?? "ACTIVE"}
      >
        <option value="ACTIVE">正常</option>
        <option value="INACTIVE">停用</option>
      </SelectBox>
      <div className="lg:col-span-1">
        <SubmitButton
          idleLabel={student ? "保存学生" : "新增学生"}
          pendingLabel="保存中..."
          className="h-11 w-full"
          tone={student ? "secondary" : "primary"}
        />
      </div>
      <DynamicProfileInputs
        fields={profileFields}
        profileData={getStudentProfileData(student, profileFields)}
      />
    </form>
  );
}

function TeacherFilterForm({
  filters,
  departments,
  subjects,
}: {
  filters: PeopleFilters;
  departments: PeopleManagementData["departments"];
  subjects: PeopleManagementData["subjects"];
}) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-[24px] bg-[var(--panel-soft)] p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <input type="hidden" name="view" value="teachers" />
      <TextInput
        name="teacherKeyword"
        defaultValue={filters.teacherKeyword}
        placeholder="搜索身份证号、工号、姓名、电话、职务"
      />
      <SelectBox name="teacherDepartmentId" defaultValue={filters.teacherDepartmentId}>
        <option value="">全部部门</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="teacherSubjectId" defaultValue={filters.teacherSubjectId}>
        <option value="">全部学科</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="teacherStatus" defaultValue={filters.teacherStatus}>
        <option value="ALL">全部状态</option>
        <option value="ACTIVE">正常</option>
        <option value="INACTIVE">停用</option>
      </SelectBox>
      <button className="h-11 rounded-2xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white">
        查询教师
      </button>
    </form>
  );
}

function StudentFilterForm({
  filters,
  grades,
  classes,
}: {
  filters: PeopleFilters;
  grades: GradeOption[];
  classes: ClassOption[];
}) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-[24px] bg-[var(--panel-soft)] p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <input type="hidden" name="view" value="students" />
      <TextInput
        name="studentKeyword"
        defaultValue={filters.studentKeyword}
        placeholder="搜索身份证号、学籍号、姓名、电话、监护人"
      />
      <SelectBox name="studentGradeId" defaultValue={filters.studentGradeId}>
        <option value="">全部年级</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="studentClassId" defaultValue={filters.studentClassId}>
        <option value="">全部班级</option>
        {classes.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.gradeName} / {classItem.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="studentStatus" defaultValue={filters.studentStatus}>
        <option value="ALL">全部状态</option>
        <option value="ACTIVE">正常</option>
        <option value="INACTIVE">停用</option>
      </SelectBox>
      <button className="h-11 rounded-2xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white">
        查询学生
      </button>
    </form>
  );
}

function ImportExportPanel({
  templateHref,
  exportHref,
  importAction,
  typeLabel,
  hiddenInputs,
}: {
  templateHref?: string;
  exportHref?: string;
  importAction?: (formData: FormData) => void | Promise<void>;
  typeLabel: string;
  hiddenInputs?: Array<{ name: string; value: string }>;
}) {
  const hasAnyAction = Boolean(templateHref || exportHref || importAction);

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 xl:grid-cols-[auto_auto_1fr]">
      <div className="flex flex-wrap gap-3">
        {templateHref ? (
          <UtilityLink href={templateHref}>下载{typeLabel}导入模板</UtilityLink>
        ) : null}
        {exportHref ? <UtilityLink href={exportHref}>导出当前筛选结果</UtilityLink> : null}
      </div>
      {importAction ? (
        <form
          action={importAction}
          encType="multipart/form-data"
          className="grid gap-3 xl:col-span-2 md:grid-cols-[1fr_auto]"
        >
          {hiddenInputs?.map((input) => (
            <input key={input.name} type="hidden" name={input.name} value={input.value} />
          ))}
          <FileInput name="file" />
          <SubmitButton idleLabel={`导入${typeLabel}`} pendingLabel="导入中..." />
        </form>
      ) : null}
    </div>
  );
}

export function PeoplePage({
  data,
  filters,
  activeView,
  notice,
  access,
}: PeoplePageProps) {
  const grades = data.gradeOptions;
  const classes = data.classOptions;
  const activeTeacherProfileFields = data.teacherProfileFields.filter((field) => field.isActive);
  const activeStudentProfileFields = data.studentProfileFields.filter((field) => field.isActive);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <PeopleViewTabs
          activeView={activeView}
          filters={filters}
          canViewTeacherData={access.canViewTeacherData}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#705f2f_0%,#1f6f78_100%)] p-7 text-white">
          <span className="soft-kicker !bg-white/16 !text-white">
            {activeView === "teachers" ? "教师档案入口" : "学生档案入口"}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            {activeView === "teachers"
              ? "教师档案支持多部门、动态统计类目、导入与导出"
              : "学生档案聚焦在校学生、动态统计类目、导入与导出"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            {activeView === "teachers"
              ? "这里维护当前在用教师数据。教师可以同时归属于多个部门，教师档案里的统计类目也能直接在系统内维护，并同步进入模板、导入和导出文件。"
              : "这里维护当前前台在用学生数据。学生档案里的统计类目能直接在系统内维护；往届学生会自动转入存档中心，不再继续出现在日常前台页面中。"}
          </p>
        </div>

        <div className="rounded-[30px] border border-[var(--panel-border)] bg-white/78 p-7">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            使用前检查
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            <li>1. 先在学校结构里维护好当前在用的年级、班级、部门和学科。</li>
            <li>2. 教师归属多个部门时，可在教师档案里直接勾选多个部门。</li>
            <li>3. 新增统计类目后，新的导入模板会自动带上对应列头。</li>
            <li>4. 往届学生请到往届学生信息存档中心导入和维护，不要导回当前页面。</li>
          </ul>
          {access.isGradeScoped ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              当前账号已经绑定年级范围，页面只会显示本年级学生和相关班级。
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/structure"
              className="inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
            >
              去维护学校结构
            </Link>
            {access.canViewAlumniArchive ? (
              <Link
                href="/dashboard/archive/students"
                className="inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
              >
                打开往届学生存档中心
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {access.canEditPeople ? (
        <SectionCard
          title={activeView === "teachers" ? "教师统计类目配置" : "学生统计类目配置"}
          description="这里维护当前档案入口里的统计类目。工号、学籍号等原固定字段也在这里启用、停用或删除；身份证号保留为导入更新和唯一识别字段。"
        >
          <ProfileFieldManager
            title={activeView === "teachers" ? "教师统计类目" : "学生统计类目"}
            targetType={activeView === "teachers" ? "TEACHER" : "STUDENT"}
            fields={
              activeView === "teachers"
                ? data.teacherProfileFields
                : data.studentProfileFields
            }
          />
        </SectionCard>
      ) : null}

      {activeView === "teachers" && access.canViewTeacherData ? (
        <SectionCard
          title="教师档案"
          description="维护或查看教师身份证号、姓名、多个归属部门、学科、任职状态和当前启用的统计类目。当前列表最多显示 80 条，导出覆盖当前筛选结果。"
        >
          <ImportExportPanel
            typeLabel="教师"
            templateHref={
              access.canImportTeacherData
                ? "/dashboard/people/templates/teachers"
                : undefined
            }
            exportHref={
              access.canImportTeacherData
                ? buildTeacherExportHref(filters)
                : undefined
            }
            importAction={access.canImportTeacherData ? importTeachers : undefined}
          />
          <div className="mt-5">
            <TeacherFilterForm
              filters={filters}
              departments={data.departments}
              subjects={data.subjects}
            />
          </div>

          {access.canEditPeople ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
              <h3 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
                新增教师
              </h3>
              <TeacherForm
                departments={data.departments}
                subjects={data.subjects}
                profileFields={activeTeacherProfileFields}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              当前角色可查看、导入和导出教师数据，不开放手工新增和修改。
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="text-sm text-[var(--text-secondary)]">
              匹配教师：{data.teacherCount} 条，当前显示：{data.teachers.length} 条
            </div>
            {data.teachers.length === 0 ? (
              <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
                暂无匹配教师档案。
              </div>
            ) : (
              data.teachers.map((teacher) => {
                const departmentNames = getTeacherDepartmentNames(teacher);

                return (
                  <details
                    key={teacher.id}
                    className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            {teacher.name} / {teacher.idCardNumber ?? "未填写身份证号"}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {departmentNames.length > 0
                              ? departmentNames.join("、")
                              : "未分配部门"}{" "}
                            / {teacher.subject?.name ?? "未分配学科"} /{" "}
                            {teacher.phone ?? "未填写电话"}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            职务归属：
                            {teacher.duties.length > 0 ? teacher.duties.join("、") : "未填写"}
                          </p>
                          <DynamicProfileSummary
                            fields={data.teacherProfileFields}
                            profileData={getTeacherProfileData(
                              teacher,
                              data.teacherProfileFields,
                            )}
                          />
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                            teacher.employmentStatus,
                          )}`}
                        >
                          {statusLabel(teacher.employmentStatus)}
                        </span>
                      </div>
                    </summary>

                    {access.canEditPeople ? (
                      <div className="mt-4 border-t border-[var(--panel-border)] pt-4">
                        <TeacherForm
                          departments={data.departments}
                          subjects={data.subjects}
                          profileFields={activeTeacherProfileFields}
                          teacher={teacher}
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <form action={setTeacherStatus}>
                          <input type="hidden" name="id" value={teacher.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              teacher.employmentStatus === "ACTIVE"
                                ? "INACTIVE"
                                : "ACTIVE"
                            }
                          />
                          <SubmitButton
                            idleLabel={
                              teacher.employmentStatus === "ACTIVE"
                                ? "停用教师"
                                : "恢复教师"
                            }
                            pendingLabel="处理中..."
                            tone={
                              teacher.employmentStatus === "ACTIVE"
                                ? "danger"
                                : "secondary"
                            }
                          />
                        </form>
                        <form action={deleteTeacher}>
                          <input type="hidden" name="id" value={teacher.id} />
                          <SubmitButton
                            idleLabel="删除误录教师"
                            pendingLabel="删除中..."
                            tone="danger"
                            confirmMessage="确认删除这条教师档案？已有检查记录关联的教师不会被删除。"
                          />
                        </form>
                        </div>
                      </div>
                    ) : null}
                  </details>
                );
              })
            )}
          </div>
        </SectionCard>
      ) : activeView === "teachers" ? (
        <SectionCard
          title="教师档案"
          description="教师档案继续由校级账号统一维护。年级管理员试点阶段不开放全校教师信息浏览和导出。"
        >
          <div className="rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            当前账号已经绑定年级范围，本页只开放本年级学生数据和相关检查数据能力。
          </div>
        </SectionCard>
      ) : null}

      {activeView === "students" ? (
      <SectionCard
        title={access.isGradeScoped ? "本年级学生档案" : "学生档案"}
        description="维护或查看当前前台在用学生的身份证号、姓名、年级、班级、在校状态和当前启用的统计类目。往届学生不会在这里继续显示。"
      >
        <ImportExportPanel
          typeLabel="学生"
          templateHref={
            access.canImportStudentData
              ? "/dashboard/people/templates/students"
              : undefined
          }
          exportHref={
            access.canImportStudentData
              ? buildStudentExportHref(filters)
              : undefined
          }
          importAction={access.canImportStudentData ? importStudents : undefined}
          hiddenInputs={[{ name: "studentViewMode", value: "active" }]}
        />
        <div className="mt-5">
          <StudentFilterForm filters={filters} grades={grades} classes={classes} />
        </div>

        {access.canEditPeople ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
            <h3 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
              新增学生
            </h3>
            <StudentForm
              grades={grades}
              classes={classes}
              profileFields={activeStudentProfileFields}
            />
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            当前角色以查看、导入和导出为主，不开放手工新增和修改学生档案。
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">
            匹配学生：{data.studentCount} 条，当前显示：{data.students.length} 条
          </div>
          {data.students.length === 0 ? (
            <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
              暂无匹配学生档案。
            </div>
          ) : (
            data.students.map((student) => (
              <details
                key={student.id}
                className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {student.name} / {student.idCardNumber ?? "未填写身份证号"}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {student.grade.name} / {student.class?.name ?? "未分班"} /{" "}
                        {student.phone ?? "未填写电话"}
                      </p>
                      <DynamicProfileSummary
                        fields={data.studentProfileFields}
                        profileData={getStudentProfileData(
                          student,
                          data.studentProfileFields,
                        )}
                      />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                        student.enrollmentStatus,
                      )}`}
                    >
                      {statusLabel(student.enrollmentStatus)}
                    </span>
                  </div>
                </summary>

                {access.canEditPeople ? (
                  <div className="mt-4 border-t border-[var(--panel-border)] pt-4">
                    <StudentForm
                      grades={grades}
                      classes={classes}
                      profileFields={activeStudentProfileFields}
                      student={student}
                    />
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <form action={setStudentStatus}>
                      <input type="hidden" name="studentViewMode" value="active" />
                      <input type="hidden" name="id" value={student.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          student.enrollmentStatus === "ACTIVE"
                            ? "INACTIVE"
                            : "ACTIVE"
                        }
                      />
                      <SubmitButton
                        idleLabel={
                          student.enrollmentStatus === "ACTIVE"
                            ? "停用学生"
                            : "恢复学生"
                        }
                        pendingLabel="处理中..."
                        tone={
                          student.enrollmentStatus === "ACTIVE"
                            ? "danger"
                            : "secondary"
                        }
                      />
                    </form>
                    <form action={deleteStudent}>
                      <input type="hidden" name="studentViewMode" value="active" />
                      <input type="hidden" name="id" value={student.id} />
                      <SubmitButton
                        idleLabel="删除误录学生"
                        pendingLabel="删除中..."
                        tone="danger"
                        confirmMessage="确认删除这条学生档案？删除后需重新录入才能恢复。"
                      />
                    </form>
                    </div>
                  </div>
                ) : null}
              </details>
            ))
          )}
        </div>
      </SectionCard>
      ) : null}
    </div>
  );
}
