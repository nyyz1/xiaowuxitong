import type { ReactNode } from "react";
import Link from "next/link";
import { parseEnrollmentYearFromName } from "@/lib/grade-lifecycle";
import { getSchoolStructureSnapshot } from "@/modules/school-structure/queries";
import {
  adjustGradeClassCount,
  createClass,
  createDepartment,
  createGrade,
  createSubject,
  deleteClass,
  deleteDepartment,
  deleteGrade,
  deleteSubject,
  rolloverAcademicYear,
  updateClass,
  updateDepartment,
  updateGrade,
  updateSubject,
} from "@/modules/school-structure/actions";
import { SubmitButton } from "@/modules/school-structure/submit-button";

type SchoolStructureData = Awaited<ReturnType<typeof getSchoolStructureSnapshot>>;
type RawGrade = SchoolStructureData["grades"][number];
type ClassItem = RawGrade["classes"][number];

type SchoolStructurePageProps = {
  data: SchoolStructureData;
  notice: {
    tone: "success" | "error";
    message: string;
  } | null;
};

type VisibleGrade = RawGrade;

type DictionaryItem = {
  id: string;
  name: string;
  _count: {
    teachers: number;
  };
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
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
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

function NumberInput({
  name,
  defaultValue,
  min = 0,
  max = 60,
  placeholder,
}: {
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      name={name}
      defaultValue={defaultValue}
      min={min}
      max={max}
      placeholder={placeholder}
      required
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

function getEnrollmentYear(grade: VisibleGrade) {
  return grade.enrollmentYear ?? parseEnrollmentYearFromName(grade.name);
}

function getVisibleGrades(data: SchoolStructureData) {
  return data.grades
    .sort((left, right) => {
      const leftYear = getEnrollmentYear(left) ?? Number.NEGATIVE_INFINITY;
      const rightYear = getEnrollmentYear(right) ?? Number.NEGATIVE_INFINITY;
      return leftYear - rightYear;
    });
}

function getSuggestedNextEnrollmentYear(grades: VisibleGrade[]) {
  if (grades.length === 0) {
    return new Date().getUTCFullYear();
  }

  return Math.max(...grades.map((grade) => getEnrollmentYear(grade) ?? 0)) + 1;
}

function DictionaryPanel({
  title,
  description,
  items,
  createAction,
  updateAction,
  deleteAction,
}: {
  title: string;
  description: string;
  items: DictionaryItem[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <SectionCard title={title} description={description}>
      <form action={createAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
        <TextInput name="name" placeholder={`新增${title}名称`} />
        <SubmitButton idleLabel={`新增${title}`} pendingLabel="保存中..." />
      </form>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
            暂无{title}，可以先新增一项。
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    当前关联教师数：{item._count.teachers}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <SubmitButton idleLabel="删除" pendingLabel="删除中..." tone="danger" />
                </form>
              </div>

              <form action={updateAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input type="hidden" name="id" value={item.id} />
                <TextInput name="name" defaultValue={item.name} placeholder={`${title}名称`} />
                <SubmitButton
                  idleLabel="保存名称"
                  pendingLabel="保存中..."
                  tone="secondary"
                />
              </form>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ClassRow({ classItem }: { classItem: ClassItem }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-[var(--text-primary)]">{classItem.name}</div>
        <form action={deleteClass}>
          <input type="hidden" name="id" value={classItem.id} />
          <SubmitButton idleLabel="删除班级" pendingLabel="删除中..." tone="danger" />
        </form>
      </div>
      <form action={updateClass} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="id" value={classItem.id} />
        <TextInput name="name" defaultValue={classItem.name} placeholder="班级名称" />
        <SubmitButton idleLabel="保存班级" pendingLabel="保存中..." tone="secondary" />
      </form>
    </div>
  );
}

function GradeCard({ grade }: { grade: VisibleGrade }) {
  const enrollmentYear = getEnrollmentYear(grade);

  return (
    <article className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{grade.name}</h3>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
              入学年份：{enrollmentYear ?? "待补齐"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            班级数：{grade._count.classes}，学生数：{grade._count.students}，绑定年级管理员：
            {grade._count.managedUsers}
          </p>
        </div>

        <form action={deleteGrade}>
          <input type="hidden" name="id" value={grade.id} />
          <SubmitButton idleLabel="删除年级" pendingLabel="删除中..." tone="danger" />
        </form>
      </div>

      <form action={updateGrade} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="id" value={grade.id} />
        <NumberInput
          name="enrollmentYear"
          defaultValue={enrollmentYear ?? undefined}
          min={2000}
          max={2100}
          placeholder="入学年份"
        />
        <SubmitButton idleLabel="保存年级" pendingLabel="保存中..." tone="secondary" />
      </form>

      <div className="mt-4 rounded-3xl border border-dashed border-[var(--panel-border)] bg-white/80 p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">批量调整班级数</h4>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          增加时自动补齐数字班级；减少时只删除没有学生和检查记录的空班级。
        </p>
        <form
          action={adjustGradeClassCount}
          className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="gradeId" value={grade.id} />
          <NumberInput
            name="targetCount"
            defaultValue={grade.classes.length}
            min={0}
            max={60}
          />
          <SubmitButton
            idleLabel="按目标数量调整"
            pendingLabel="处理中..."
            tone="secondary"
          />
        </form>
      </div>

      <div className="mt-4 rounded-3xl border border-dashed border-[var(--panel-border)] bg-white/80 p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">手动维护班级</h4>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          仍然支持逐个新增、重命名或删除单个班级。
        </p>
        <form action={createClass} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="gradeId" value={grade.id} />
          <TextInput name="name" placeholder="例如：1班、2班、实验班" />
          <SubmitButton idleLabel="新增班级" pendingLabel="保存中..." />
        </form>

        <div className="mt-4 space-y-3">
          {grade.classes.length === 0 ? (
            <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              当前还没有班级，可以先新增一个班级。
            </div>
          ) : (
            grade.classes.map((classItem) => <ClassRow key={classItem.id} classItem={classItem} />)
          )}
        </div>
      </div>
    </article>
  );
}

export function SchoolStructurePage({ data, notice }: SchoolStructurePageProps) {
  const grades = getVisibleGrades(data);
  const suggestedNextEnrollmentYear = getSuggestedNextEnrollmentYear(grades);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#1b7a88_0%,#114f61_100%)] p-7 text-white">
          <span className="soft-kicker !bg-white/16 !text-white">学校结构</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            前台结构现在只按年级和班级管理
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            这里负责维护在校年级、班级、部门和学科。系统会按“2025级”这样的入学年份管理在校学生，
            每次滚动时自动保留最近三届在校，并把更早一届转入往届存档。前台不再要求老师手工维护兼容记录。
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/80">
            <span className="rounded-full border border-white/18 px-3 py-1">
              只按年级维护在校结构
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1">
              自动滚动最新一届
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1">
              自动归档更早届别
            </span>
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--panel-border)] bg-white/78 p-7">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">使用提醒</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            <li>1. 在校年级统一按入学年份命名，例如 2025 级、2024 级、2023 级。</li>
            <li>2. 批量减少班级数时，只会删除没有学生和检查记录的空班级。</li>
            <li>3. 滚动后系统会自动新增最新一届，并把超出最近三届范围的年级转为往届存档。</li>
            <li>4. 往届学生后续的导入、导出和修改，请到存档中心继续处理。</li>
          </ul>
          <Link
            href="/dashboard/archive/students"
            className="mt-5 inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
          >
            打开往届学生信息存档中心
          </Link>
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
        title="新增最新一届"
        description="系统会在服务端自动维护兼容记录，复制最近两届的班级结构和学生归属，并把更早一届自动转入往届存档。"
      >
        {grades.length === 0 ? (
          <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
            还没有在校年级，请先新增至少一个年级和班级，再执行最新一届滚动。
          </div>
        ) : (
          <form
            action={rolloverAcademicYear}
            className="grid gap-3 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-soft)] p-5 lg:grid-cols-[1fr_1fr_auto]"
          >
            <NumberInput
              name="targetEnrollmentYear"
              defaultValue={suggestedNextEnrollmentYear}
              min={2000}
              max={2100}
              placeholder="最新一届入学年份，例如 2026"
            />
            <NumberInput
              name="newCohortClassCount"
              defaultValue={4}
              min={1}
              max={60}
              placeholder="最新一届班级数"
            />
            <SubmitButton idleLabel="执行届别滚动" pendingLabel="处理中..." />
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="在校年级与班级"
        description="前台只维护当前在校的年级和班级。底层兼容记录由系统在服务端自动维护，不再作为人工管理维度。"
      >
        <form
          action={createGrade}
          className="grid gap-3 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-soft)] p-5 md:grid-cols-[1fr_auto]"
        >
          <NumberInput
            name="enrollmentYear"
            defaultValue={suggestedNextEnrollmentYear}
            min={2000}
            max={2100}
            placeholder="入学年份，例如 2025"
          />
          <SubmitButton idleLabel="新增年级" pendingLabel="保存中..." />
        </form>

        <div className="mt-6 space-y-4">
          {grades.length === 0 ? (
            <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
              还没有在校年级。先新增一个年级，再往下配置班级。
            </div>
          ) : (
            grades.map((grade) => <GradeCard key={grade.id} grade={grade} />)
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DictionaryPanel
          title="部门"
          description="部门将用于教师档案的归属、筛选和导入匹配。"
          items={data.departments}
          createAction={createDepartment}
          updateAction={updateDepartment}
          deleteAction={deleteDepartment}
        />
        <DictionaryPanel
          title="学科"
          description="学科将用于教师档案、筛选和后续统计展示。"
          items={data.subjects}
          createAction={createSubject}
          updateAction={updateSubject}
          deleteAction={deleteSubject}
        />
      </div>
    </div>
  );
}
