import Link from "next/link";
import {
  canViewAlumniArchive,
  getManagedGradeId,
  isGradeManagerRole,
  requirePeopleManager,
} from "@/lib/authorization";
import {
  getProfileFieldEntries,
  mergeSystemProfileData,
} from "@/modules/people/helpers";
import {
  getStudentQuickSearchData,
  normalizePeopleFilters,
} from "@/modules/people/queries";
import { getStudentStatusLabel } from "@/modules/people/status-options";
import { QuickStudentScopeFields } from "./quick-student-scope-fields";

type QuickStudentSearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SearchParamValue = string | string[] | undefined;

function readParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function hasSearchIntent(params: Record<string, SearchParamValue>) {
  return Boolean(
    readParam(params.studentKeyword).trim() ||
      readParam(params.studentGradeId).trim() ||
      readParam(params.studentClassId).trim(),
  );
}

function buildPeopleHref(filters: ReturnType<typeof normalizePeopleFilters>) {
  const params = new URLSearchParams({
    view: "students",
  });

  if (filters.studentKeyword) {
    params.set("studentKeyword", filters.studentKeyword);
  }

  if (filters.studentGradeId) {
    params.set("studentGradeId", filters.studentGradeId);
  }

  if (filters.studentClassId) {
    params.set("studentClassId", filters.studentClassId);
  }

  return `/dashboard/people?${params.toString()}`;
}

function statusLabel(status: string) {
  return status === "ACTIVE" ? "正常在校" : getStudentStatusLabel(status);
}

export default async function QuickStudentSearchPage({
  searchParams,
}: QuickStudentSearchPageProps) {
  const session = await requirePeopleManager();
  const params = await searchParams;
  const filters = normalizePeopleFilters(params);
  const shouldSearch = hasSearchIntent(params);
  const data = await getStudentQuickSearchData(filters, {
    gradeScopeId: getManagedGradeId(session),
    shouldSearch,
  });
  const canOpenArchive = canViewAlumniArchive(session.user.role);
  const isScoped = isGradeManagerRole(session.user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-[24px] border border-[var(--panel-border)] bg-[#fffdf8] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="soft-kicker">学生快查</span>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              搜姓名、身份证号、学籍号、电话或宿舍号
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              这里只做快速查询，不显示导入导出、统计类目配置和新增表单。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildPeopleHref(filters)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
            >
              完整档案维护
            </Link>
            {canOpenArchive ? (
              <Link
                href="/dashboard/archive/students"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
              >
                往届存档
              </Link>
            ) : null}
          </div>
        </div>

        {isScoped ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            当前账号已经绑定年级范围，快查结果只包含负责年级内的在校学生。
          </div>
        ) : null}

        <form method="get" className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
          <input
            type="search"
            name="studentKeyword"
            defaultValue={filters.studentKeyword}
            placeholder="输入学生姓名、身份证号、学籍号、电话或宿舍号"
            className="h-12 rounded-md border border-[var(--panel-border)] bg-white px-4 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
          />
          <QuickStudentScopeFields
            grades={data.gradeOptions}
            classes={data.classOptions}
            defaultGradeId={filters.studentGradeId}
            defaultClassId={filters.studentClassId}
          />
          <button className="h-12 rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white">
            查询
          </button>
          <Link
            href="/dashboard/quick/students"
            className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--panel-border)] bg-white px-5 text-sm font-semibold text-[var(--accent-strong)]"
          >
            清空
          </Link>
        </form>
      </section>

      {!shouldSearch ? (
        <section className="rounded-[20px] border border-dashed border-[var(--panel-border)] bg-white/76 px-5 py-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            输入条件后开始查询
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            手机上建议直接搜姓名、身份证号后几位、学籍号、联系电话或宿舍号。
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>
              匹配学生：{data.studentCount} 人，当前显示 {data.students.length} 人
            </span>
            {data.studentCount > data.students.length ? (
              <span>请继续缩小关键词或班级范围</span>
            ) : null}
          </div>

          {data.students.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--accent-soft)] px-5 py-6 text-sm text-[var(--text-secondary)]">
              没有找到匹配的在校学生。需要查往届学生时，请从往届存档入口进入。
            </div>
          ) : (
            data.students.map((student) => {
              const profileData = mergeSystemProfileData(
                data.studentProfileFields,
                student.profileData,
                {
                  studentNumber: student.studentNumber,
                  gender: student.gender,
                  phone: student.phone,
                  guardianContact: student.guardianContact,
                  remarks: student.remarks,
                },
              );
              const profileEntries = getProfileFieldEntries(
                data.studentProfileFields,
                profileData,
                { activeOnly: true },
              );

              return (
                <article
                  key={student.id}
                  className="rounded-[20px] border border-[var(--panel-border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                        {student.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {student.grade.name} / {student.class?.name ?? "未分班"} /{" "}
                        {statusLabel(student.enrollmentStatus)}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      在校档案
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[var(--text-muted)]">身份证号</dt>
                      <dd className="mt-1 font-medium text-[var(--text-primary)]">
                        {student.idCardNumber ?? "未填写"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">学籍号</dt>
                      <dd className="mt-1 font-medium text-[var(--text-primary)]">
                        {student.studentNumber ?? "未填写"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">联系电话</dt>
                      <dd className="mt-1 font-medium text-[var(--text-primary)]">
                        {student.phone ?? "未填写"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">家长联系方式</dt>
                      <dd className="mt-1 font-medium text-[var(--text-primary)]">
                        {student.guardianContact ?? "未填写"}
                      </dd>
                    </div>
                  </dl>

                  {student.remarks ? (
                    <div className="mt-4 rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
                      备注：{student.remarks}
                    </div>
                  ) : null}

                  {profileEntries.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profileEntries.map((entry) => (
                        <span
                          key={entry.id}
                          className="rounded-md bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]"
                        >
                          {entry.name}：{entry.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
