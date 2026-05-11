import { AccountType, UserRole } from "@/generated/prisma/enums";
import { SubmitButton } from "@/components/form/submit-button";
import {
  userRoleDescriptions,
  userRoleLabels,
  userRoleOptions,
} from "@/lib/role-labels";
import { teacherDepartmentIdentityLabels } from "@/modules/people/department-identities";
import {
  createUser,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "@/modules/users/actions";
import type { getUserManagementData } from "@/modules/users/queries";

type UserManagementData = Awaited<ReturnType<typeof getUserManagementData>>;

type UsersPageProps = {
  data: UserManagementData;
  notice: {
    tone: "success" | "error";
    message: string;
  } | null;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
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

function PasswordInput({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <input
      type="password"
      name={name}
      placeholder={placeholder}
      required
      minLength={8}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

function SelectBox({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    >
      {children}
    </select>
  );
}

function RoleOptions() {
  return (
    <>
      {userRoleOptions.map((role) => (
        <option key={role} value={role}>
          {userRoleLabels[role]}
        </option>
      ))}
    </>
  );
}

function GradeScopeOptions({
  gradeOptions,
}: {
  gradeOptions: UserManagementData["gradeOptions"];
}) {
  return (
    <>
      <option value="">全校范围 / 非年级账号</option>
      {gradeOptions.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {grade.name}
        </option>
      ))}
    </>
  );
}

function TeacherOptions({
  teacherOptions,
}: {
  teacherOptions: UserManagementData["teacherOptions"];
}) {
  return (
    <>
      <option value="">不绑定教师档案</option>
      {teacherOptions.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {teacher.name}
          {teacher.subject ? `（${teacher.subject.name}）` : ""}
        </option>
      ))}
    </>
  );
}

function StudentOptions({
  studentOptions,
}: {
  studentOptions: UserManagementData["studentOptions"];
}) {
  return (
    <>
      <option value="">不绑定学生档案</option>
      {studentOptions.map((student) => (
        <option key={student.id} value={student.id}>
          {student.name}（{student.grade.name}
          {student.class ? ` / ${student.class.name}` : ""}）
        </option>
      ))}
    </>
  );
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

function getScopeLabel(user: UserManagementData["users"][number]) {
  if (user.teacher) {
    const identityLabels = user.teacher.departmentAssignments
      .map((assignment) =>
        assignment.department
          ? `${assignment.department.name} / ${
              assignment.position?.name ??
              teacherDepartmentIdentityLabels[
                assignment.position?.identityType ?? assignment.identityType
              ]
            }`
          : "",
      )
      .filter(Boolean);

    return identityLabels.length > 0
      ? `${user.teacher.name}：${identityLabels.join("、")}`
      : `教师档案：${user.teacher.name}`;
  }

  if (user.student) {
    return `学生档案：${user.student.name}（${user.student.grade.name}${
      user.student.class ? ` / ${user.student.class.name}` : ""
    }）`;
  }

  if (user.managedGrade) {
    return user.managedGrade.name;
  }

  return "全校范围";
}

function UserCard({
  user,
  data,
}: {
  user: UserManagementData["users"][number];
  data: UserManagementData;
}) {
  return (
    <article className="rounded-[26px] border border-[var(--panel-border)] bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {user.displayName}
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {user.isActive ? "启用" : "停用"}
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
              {user.accountType === AccountType.STUDENT ? "学生账号" : "教师账号"}
            </span>
            {user.isSuperAdmin ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                最高管理员
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              兼容角色：{userRoleLabels[user.role]}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            登录用户名：{user.username}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            数据范围：{getScopeLabel(user)}
          </p>
        </div>
        <div className="text-sm leading-6 text-[var(--text-secondary)]">
          <div>创建时间：{formatDate(user.createdAt)}</div>
          <div>更新时间：{formatDate(user.updatedAt)}</div>
        </div>
      </div>

      <div className="grid gap-4 pt-5 xl:grid-cols-[1.7fr_0.9fr_0.55fr]">
        <form action={updateUser} className="grid gap-3 md:grid-cols-7">
          <input type="hidden" name="id" value={user.id} />
          <TextInput
            name="displayName"
            defaultValue={user.displayName}
            placeholder="显示名称"
            required
          />
          <SelectBox name="accountType" defaultValue={user.accountType}>
            <option value={AccountType.TEACHER}>教师账号</option>
            <option value={AccountType.STUDENT}>学生账号</option>
          </SelectBox>
          <SelectBox name="isSuperAdmin" defaultValue={user.isSuperAdmin ? "true" : "false"}>
            <option value="false">普通能力</option>
            <option value="true">最高管理员</option>
          </SelectBox>
          <SelectBox name="role" defaultValue={user.role}>
            <RoleOptions />
          </SelectBox>
          <SelectBox name="managedGradeId" defaultValue={user.managedGradeId ?? ""}>
            <GradeScopeOptions gradeOptions={data.gradeOptions} />
          </SelectBox>
          <SelectBox name="teacherId" defaultValue={user.teacherId ?? ""}>
            <TeacherOptions teacherOptions={data.teacherOptions} />
          </SelectBox>
          <SelectBox name="studentId" defaultValue={user.studentId ?? ""}>
            <StudentOptions studentOptions={data.studentOptions} />
          </SelectBox>
          <SubmitButton
            idleLabel="保存资料"
            pendingLabel="保存中..."
            tone="secondary"
            className="h-11"
          />
        </form>

        <form action={resetUserPassword} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="id" value={user.id} />
          <PasswordInput name="password" placeholder="新密码，至少 8 位" />
          <SubmitButton
            idleLabel="重置密码"
            pendingLabel="重置中..."
            tone="secondary"
            className="h-11"
          />
        </form>

        <form action={setUserStatus}>
          <input type="hidden" name="id" value={user.id} />
          <input
            type="hidden"
            name="isActive"
            value={user.isActive ? "false" : "true"}
          />
          <SubmitButton
            idleLabel={user.isActive ? "停用账号" : "启用账号"}
            pendingLabel="处理中..."
            tone={user.isActive ? "danger" : "primary"}
            className="h-11 w-full"
          />
        </form>
      </div>
    </article>
  );
}

export function UsersPage({ data, notice }: UsersPageProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-[30px] bg-[linear-gradient(135deg,#1f7a8c_0%,#255b6a_100%)] p-8 text-white">
        <span className="soft-kicker !bg-white/16 !text-white">用户权限</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          用户与权限管理
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">
          账号按学校岗位分工授权；需要教师自助申请能力的账号应绑定教师档案，年级管理员需要绑定负责年级，审批职责在申请审批模块中单独维护。
        </p>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
          <div className="text-sm text-[var(--text-secondary)]">用户总数</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {data.totalUsers}
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
          <div className="text-sm text-[var(--text-secondary)]">启用账号</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {data.activeUsers}
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
          <div className="text-sm text-[var(--text-secondary)]">
            启用中的系统管理员
          </div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {data.activeAdmins}
          </div>
        </div>
      </section>

      <SectionCard
        title="新增用户"
        description="账号类型只区分教师和学生；最高管理员是一项能力开关，不作为第三类账号。"
      >
        <form action={createUser} className="grid gap-3 lg:grid-cols-9">
          <TextInput name="username" placeholder="用户名，例如 teacher.zhang" required />
          <TextInput name="displayName" placeholder="显示名称，例如 张老师" required />
          <SelectBox name="accountType" defaultValue={AccountType.TEACHER}>
            <option value={AccountType.TEACHER}>教师账号</option>
            <option value={AccountType.STUDENT}>学生账号</option>
          </SelectBox>
          <SelectBox name="isSuperAdmin" defaultValue="false">
            <option value="false">普通能力</option>
            <option value="true">最高管理员</option>
          </SelectBox>
          <SelectBox name="role" defaultValue={UserRole.TEACHER}>
            <RoleOptions />
          </SelectBox>
          <SelectBox name="managedGradeId" defaultValue="">
            <GradeScopeOptions gradeOptions={data.gradeOptions} />
          </SelectBox>
          <SelectBox name="teacherId" defaultValue="">
            <TeacherOptions teacherOptions={data.teacherOptions} />
          </SelectBox>
          <SelectBox name="studentId" defaultValue="">
            <StudentOptions studentOptions={data.studentOptions} />
          </SelectBox>
          <PasswordInput name="password" placeholder="初始密码，至少 8 位" />
          <div className="grid gap-3">
            <SelectBox name="isActive" defaultValue="true">
              <option value="true">立即启用</option>
              <option value="false">暂不启用</option>
            </SelectBox>
            <SubmitButton
              idleLabel="新增用户"
              pendingLabel="新增中..."
              className="h-11"
            />
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="角色说明"
        description="角色决定基础模块访问权；审批范围由申请审批模块中的职责配置决定。"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {userRoleOptions.map((role) => (
            <div
              key={role}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4"
            >
              <div className="font-semibold text-[var(--text-primary)]">
                {userRoleLabels[role]}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {userRoleDescriptions[role]}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="用户列表"
        description="账号不做硬删除；离岗或暂停使用时请停用账号，审计记录和历史业务关系会继续保留。"
      >
        {data.users.length === 0 ? (
          <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            当前还没有数据库用户。
          </div>
        ) : (
          <div className="space-y-4">
            {data.users.map((user) => (
              <UserCard key={user.id} user={user} data={data} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
