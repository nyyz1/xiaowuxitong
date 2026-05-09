import Link from "next/link";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createStudent,
  deleteStudent,
  importStudents,
  setStudentStatus,
  updateStudent,
} from "@/modules/people/actions";
import {
  getProfileFieldEntries,
  getProfileFieldInputName,
  mergeSystemProfileData,
} from "@/modules/people/helpers";
import type {
  PeopleFilters,
  getPeopleManagementData,
} from "@/modules/people/queries";

type AlumniArchiveData = Awaited<ReturnType<typeof getPeopleManagementData>>;

type AlumniArchivePageProps = {
  data: AlumniArchiveData;
  filters: PeopleFilters;
  notice: {
    tone: "success" | "error";
    message: string;
  } | null;
  access: {
    canImportStudentData: boolean;
    canEditPeople: boolean;
  };
};

type GradeOption = AlumniArchiveData["gradeOptions"][number];
type ClassOption = AlumniArchiveData["classOptions"][number];
type StudentProfileField = AlumniArchiveData["studentProfileFields"][number];

function getStudentProfileData(
  student: AlumniArchiveData["students"][number] | undefined,
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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "系统滚动前存量数据";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildArchiveExportHref(filters: PeopleFilters) {
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

  return `/dashboard/archive/students/export?${params.toString()}`;
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
  fields: StudentProfileField[];
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
  fields: StudentProfileField[];
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

function StudentForm({
  grades,
  classes,
  profileFields,
  student,
}: {
  grades: GradeOption[];
  classes: ClassOption[];
  profileFields: StudentProfileField[];
  student?: AlumniArchiveData["students"][number];
}) {
  const action = student ? updateStudent : createStudent;

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-4">
      <input type="hidden" name="studentViewMode" value="archived" />
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <TextInput
        name="idCardNumber"
        defaultValue={student?.idCardNumber ?? ""}
        placeholder="身份证号"
        required
      />
      <TextInput name="name" defaultValue={student?.name} placeholder="姓名" required />
      <SelectBox name="gradeId" defaultValue={student?.gradeId} required>
        <option value="">请选择届别</option>
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
          idleLabel={student ? "保存存档学生" : "新增存档学生"}
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
      <TextInput
        name="studentKeyword"
        defaultValue={filters.studentKeyword}
        placeholder="搜索身份证号、学籍号、姓名、电话、监护人"
      />
      <SelectBox name="studentGradeId" defaultValue={filters.studentGradeId}>
        <option value="">全部届别</option>
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
        查询存档学生
      </button>
    </form>
  );
}

function ImportExportPanel({
  templateHref,
  exportHref,
  importAction,
}: {
  templateHref?: string;
  exportHref?: string;
  importAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="grid gap-3 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 xl:grid-cols-[auto_auto_1fr]">
      <div className="flex flex-wrap gap-3">
        {templateHref ? <UtilityLink href={templateHref}>下载存档导入模板</UtilityLink> : null}
        {exportHref ? <UtilityLink href={exportHref}>导出当前筛选结果</UtilityLink> : null}
      </div>
      {importAction ? (
        <form
          action={importAction}
          encType="multipart/form-data"
          className="grid gap-3 xl:col-span-2 md:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="studentViewMode" value="archived" />
          <FileInput name="file" />
          <SubmitButton idleLabel="导入存档学生" pendingLabel="导入中..." />
        </form>
      ) : null}
    </div>
  );
}

export function AlumniArchivePage({
  data,
  filters,
  notice,
  access,
}: AlumniArchivePageProps) {
  const grades = data.gradeOptions;
  const classes = data.classOptions;
  const activeStudentProfileFields = data.studentProfileFields.filter((field) => field.isActive);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#516d2f_0%,#355771_100%)] p-7 text-white">
          <span className="soft-kicker !bg-white/16 !text-white">往届学生信息存档中心</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            所有自动归档的往届学生都在这里继续保存和维护
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            当系统新增新一届并把超出最近三届范围的学生转为“2022级入学 / 2025届毕业”这类往届记录后，学生不会丢失，而是自动进入这里。这里会沿用当前启用的学生统计类目，继续支持查询、导入、导出和修改。
          </p>
        </div>

        <div className="rounded-[30px] border border-[var(--panel-border)] bg-white/78 p-7">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            使用提醒
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            <li>1. 存档中心只展示已经归档的往届学生，不展示当前在校学生。</li>
            <li>2. 这里的导入和手工编辑会继续写回同一套学生主数据，不会新建第二份档案库。</li>
            <li>3. 学生统计类目与在校档案共用同一套配置，模板列头会自动保持一致。</li>
            <li>4. 当前在校学生请回到前台师生档案页面维护。</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/people"
              className="inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
            >
              返回在校师生档案
            </Link>
            <Link
              href="/dashboard/structure"
              className="inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
            >
              去学校结构页新增新一届
            </Link>
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

      <SectionCard
        title="往届学生档案"
        description="维护或查看归档往届学生的身份证号、姓名、入学年份 / 毕业届别、班级、在校状态和当前启用的统计类目。"
      >
        <ImportExportPanel
          templateHref={
            access.canImportStudentData
              ? "/dashboard/archive/students/templates"
              : undefined
          }
          exportHref={
            access.canImportStudentData
              ? buildArchiveExportHref(filters)
              : undefined
          }
          importAction={access.canImportStudentData ? importStudents : undefined}
        />
        <div className="mt-5">
          <StudentFilterForm filters={filters} grades={grades} classes={classes} />
        </div>

        {access.canEditPeople ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
            <h3 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
              新增存档学生
            </h3>
            <StudentForm
              grades={grades}
              classes={classes}
              profileFields={activeStudentProfileFields}
            />
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            当前角色以查看、导入和导出为主，不开放手工新增和修改存档学生。
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">
            匹配存档学生：{data.studentCount} 条，当前显示：{data.students.length} 条
          </div>
          {data.students.length === 0 ? (
            <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
              暂无匹配的往届学生档案。
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
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        归档时间：{formatDateTime(student.archivedAt)}
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
                      <input type="hidden" name="studentViewMode" value="archived" />
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
                            ? "停用存档学生"
                            : "恢复存档学生"
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
                      <input type="hidden" name="studentViewMode" value="archived" />
                      <input type="hidden" name="id" value={student.id} />
                      <SubmitButton
                        idleLabel="删除误录存档学生"
                        pendingLabel="删除中..."
                        tone="danger"
                        confirmMessage="确认删除这条存档学生档案？删除后需重新录入才能恢复。"
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
    </div>
  );
}
