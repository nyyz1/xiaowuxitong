import {
  ApprovalRequestKind,
  ApprovalResponsibilityKind,
  ApprovalStatus,
  PaperSize,
  PrintMaterialType,
  PrintMode,
} from "@/generated/prisma/enums";
import { SubmitButton } from "@/components/form/submit-button";
import type { AuthorizedSession } from "@/lib/authorization";
import {
  canConfigureApprovals,
  canCreateApprovalRequest,
} from "@/lib/authorization";
import { userRoleLabels } from "@/lib/role-labels";
import {
  createOrUpdateApprovalType,
  createOrUpdateResponsibility,
  decideApprovalRequest,
  submitApprovalRequest,
} from "@/modules/approvals/actions";
import {
  approvalStatusLabels,
  paperSizeLabels,
  printMaterialTypeLabels,
  printModeLabels,
  requestKindLabels,
  responsibilityKindLabels,
} from "@/modules/approvals/constants";
import type { getApprovalPageData } from "@/modules/approvals/queries";

type ApprovalPageData = Awaited<ReturnType<typeof getApprovalPageData>>;

type ApprovalPageProps = {
  data: ApprovalPageData;
  session: AuthorizedSession;
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

function statusClass(status: ApprovalStatus) {
  if (status === ApprovalStatus.APPROVED) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === ApprovalStatus.REJECTED) {
    return "bg-red-100 text-red-700";
  }

  if (status === ApprovalStatus.CANCELLED) {
    return "bg-slate-200 text-slate-600";
  }

  return "bg-amber-100 text-amber-700";
}

function TextInput({
  name,
  placeholder,
  defaultValue,
  required = false,
  type = "text",
}: {
  name: string;
  placeholder: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

function TextArea({
  name,
  placeholder,
  defaultValue,
  required = false,
}: {
  name: string;
  placeholder: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue ?? ""}
      required={required}
      rows={4}
      className="rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
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
  defaultValue?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    >
      {children}
    </select>
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

function OptionalScopeFields({
  data,
  teacherId,
}: {
  data: ApprovalPageData;
  teacherId?: string | null;
}) {
  const currentTeacher = teacherId
    ? data.teachers.find((teacher) => teacher.id === teacherId)
    : null;
  const departments =
    currentTeacher && currentTeacher.departmentAssignments.length > 0
      ? data.departments.filter((department) =>
          currentTeacher.departmentAssignments.some(
            (assignment) => assignment.departmentId === department.id,
          ),
        )
      : data.departments;

  return (
    <>
      <SelectBox name="gradeId" defaultValue="">
        <option value="">不限年级</option>
        {data.grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="subjectId" defaultValue="">
        <option value="">不限学科</option>
        {data.subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectBox>
      <SelectBox name="departmentId" defaultValue="">
        <option value="">不限部门</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectBox>
    </>
  );
}

function NewRequestForm({
  data,
  session,
}: {
  data: ApprovalPageData;
  session: AuthorizedSession;
}) {
  if (!canCreateApprovalRequest(session)) {
    return null;
  }

  const activeTypes = data.requestTypes.filter((type) => type.isActive);

  return (
    <SectionCard
      title="发起申请"
      description="教师可提交报修、材料打印和已配置的其他申请。打印申请需填写材料类型、打印形式、纸张大小和打印数量。"
    >
      <form action={submitApprovalRequest} className="grid gap-3">
        <div className="grid gap-3 lg:grid-cols-4">
          <SelectBox name="typeId" required>
            <option value="">选择申请类型</option>
            {activeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}（{requestKindLabels[type.kind]}）
              </option>
            ))}
          </SelectBox>
          <TextInput name="title" placeholder="申请标题" required />
          <OptionalScopeFields data={data} teacherId={session.user.teacherId} />
        </div>
        <TextArea name="content" placeholder="请填写申请内容、用途或问题描述" required />
        <div className="grid gap-3 lg:grid-cols-4">
          <SelectBox name="printMaterialType" defaultValue="">
            <option value="">非打印申请 / 不选择材料类型</option>
            {Object.values(PrintMaterialType).map((type) => (
              <option key={type} value={type}>
                {printMaterialTypeLabels[type]}
              </option>
            ))}
          </SelectBox>
          <SelectBox name="printMode" defaultValue="">
            <option value="">打印形式</option>
            {Object.values(PrintMode).map((mode) => (
              <option key={mode} value={mode}>
                {printModeLabels[mode]}
              </option>
            ))}
          </SelectBox>
          <SelectBox name="paperSize" defaultValue="">
            <option value="">纸张大小</option>
            {Object.values(PaperSize).map((size) => (
              <option key={size} value={size}>
                {paperSizeLabels[size]}
              </option>
            ))}
          </SelectBox>
          <TextInput
            name="printQuantity"
            type="number"
            placeholder="打印数量"
          />
        </div>
        <div>
          <SubmitButton
            idleLabel="提交申请"
            pendingLabel="提交中..."
            className="h-11"
          />
        </div>
      </form>
    </SectionCard>
  );
}

function RequestCard({
  request,
  canApprove,
}: {
  request: ApprovalPageData["requests"][number];
  canApprove: boolean;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--panel-border)] bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {request.title}
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                request.status,
              )}`}
            >
              {approvalStatusLabels[request.status]}
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
              {request.type.name}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {request.content}
          </p>
        </div>
        <div className="text-sm leading-6 text-[var(--text-secondary)]">
          <div>提交人：{request.applicantTeacher?.name ?? request.applicantUser.displayName}</div>
          <div>提交时间：{formatDate(request.createdAt)}</div>
          {request.decidedAt ? <div>审批时间：{formatDate(request.decidedAt)}</div> : null}
        </div>
      </div>

      <div className="grid gap-3 py-4 text-sm text-[var(--text-secondary)] md:grid-cols-2 xl:grid-cols-4">
        <div>年级：{request.grade?.name ?? "不限"}</div>
        <div>学科：{request.subject?.name ?? "不限"}</div>
        <div>部门：{request.department?.name ?? "不限"}</div>
        <div>审批人：{request.decidedBy?.displayName ?? "待处理"}</div>
        {request.kind === ApprovalRequestKind.PRINT ? (
          <>
            <div>
              材料类型：
              {request.printMaterialType
                ? printMaterialTypeLabels[request.printMaterialType]
                : "-"}
            </div>
            <div>
              打印形式：
              {request.printMode ? printModeLabels[request.printMode] : "-"}
            </div>
            <div>
              纸张大小：
              {request.paperSize ? paperSizeLabels[request.paperSize] : "-"}
            </div>
            <div>打印数量：{request.printQuantity ?? "-"}</div>
          </>
        ) : null}
      </div>

      {request.decisionComment ? (
        <div className="rounded-2xl bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          审批意见：{request.decisionComment}
        </div>
      ) : null}

      {canApprove ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <form action={decideApprovalRequest} className="grid gap-3">
            <input type="hidden" name="id" value={request.id} />
            <input type="hidden" name="decision" value={ApprovalStatus.APPROVED} />
            <TextInput name="comment" placeholder="通过意见，可选" />
            <SubmitButton idleLabel="通过" pendingLabel="处理中..." className="h-11" />
          </form>
          <form action={decideApprovalRequest} className="grid gap-3">
            <input type="hidden" name="id" value={request.id} />
            <input type="hidden" name="decision" value={ApprovalStatus.REJECTED} />
            <TextInput name="comment" placeholder="驳回原因，可选" />
            <SubmitButton
              idleLabel="驳回"
              pendingLabel="处理中..."
              tone="danger"
              className="h-11"
            />
          </form>
        </div>
      ) : null}
    </article>
  );
}

function ConfigurationForms({ data }: { data: ApprovalPageData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="申请类型配置"
        description="报修和打印申请使用固定业务规则；其他申请类型可配置审批职责。"
      >
        <form action={createOrUpdateApprovalType} className="grid gap-3">
          <TextInput name="name" placeholder="类型名称，例如 公务用车申请" required />
          <SelectBox name="kind" defaultValue={ApprovalRequestKind.OTHER}>
            {Object.values(ApprovalRequestKind).map((kind) => (
              <option key={kind} value={kind}>
                {requestKindLabels[kind]}
              </option>
            ))}
          </SelectBox>
          <SelectBox name="responsibilityKind" defaultValue={ApprovalResponsibilityKind.OTHER}>
            {Object.values(ApprovalResponsibilityKind).map((kind) => (
              <option key={kind} value={kind}>
                {responsibilityKindLabels[kind]}
              </option>
            ))}
          </SelectBox>
          <TextInput name="description" placeholder="说明，可选" />
          <SelectBox name="isActive" defaultValue="true">
            <option value="true">启用</option>
            <option value="false">停用</option>
          </SelectBox>
          <SubmitButton idleLabel="保存类型" pendingLabel="保存中..." className="h-11" />
        </form>

        <div className="mt-5 space-y-3">
          {data.requestTypes.map((type) => (
            <div
              key={type.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 text-sm"
            >
              <div className="font-semibold text-[var(--text-primary)]">{type.name}</div>
              <div className="mt-1 text-[var(--text-secondary)]">
                {requestKindLabels[type.kind]} · {type.isActive ? "启用" : "停用"}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="审批职责配置"
        description="职责可按申请类型、年级、学科、部门限定范围。匹配时范围越具体，越能贴近学校分工。"
      >
        <form action={createOrUpdateResponsibility} className="grid gap-3">
          <TextInput name="name" placeholder="职责名称，例如 高二语文教学打印审批" required />
          <SelectBox name="kind" defaultValue={ApprovalResponsibilityKind.LOGISTICS}>
            {Object.values(ApprovalResponsibilityKind).map((kind) => (
              <option key={kind} value={kind}>
                {responsibilityKindLabels[kind]}
              </option>
            ))}
          </SelectBox>
          <SelectBox name="approverId" required>
            <option value="">选择审批账号</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}（{userRoleLabels[user.role]}）
              </option>
            ))}
          </SelectBox>
          <SelectBox name="requestTypeId" defaultValue="">
            <option value="">不限申请类型</option>
            {data.requestTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </SelectBox>
          <OptionalScopeFields data={data} />
          <SelectBox name="isActive" defaultValue="true">
            <option value="true">启用</option>
            <option value="false">停用</option>
          </SelectBox>
          <SubmitButton idleLabel="保存职责" pendingLabel="保存中..." className="h-11" />
        </form>

        <div className="mt-5 space-y-3">
          {data.responsibilities.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 text-sm"
            >
              <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
              <div className="mt-1 leading-6 text-[var(--text-secondary)]">
                {responsibilityKindLabels[item.kind]} · {item.approver.displayName} ·{" "}
                {item.isActive ? "启用" : "停用"}
              </div>
              <div className="mt-1 leading-6 text-[var(--text-secondary)]">
                {item.requestType?.name ?? "不限类型"} / {item.grade?.name ?? "不限年级"} /{" "}
                {item.subject?.name ?? "不限学科"} / {item.department?.name ?? "不限部门"}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export function ApprovalsPage({ data, session, notice }: ApprovalPageProps) {
  const pendingCount = data.requests.filter(
    (request) => request.status === ApprovalStatus.PENDING,
  ).length;
  const approvableCount = data.requests.filter((request) =>
    data.approvableIds.has(request.id),
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] bg-[linear-gradient(135deg,#1f7a8c_0%,#255b6a_100%)] p-8 text-white">
        <span className="soft-kicker !bg-white/16 !text-white">申请审批</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          申请与审批工作台
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">
          支持教师发起日常报修、材料打印和其他可配置申请，审批人员按职责范围处理待审事项。
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
          <div className="text-sm text-[var(--text-secondary)]">可见申请</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {data.requests.length}
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
          <div className="text-sm text-[var(--text-secondary)]">待审批</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {pendingCount}
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
          <div className="text-sm text-[var(--text-secondary)]">待我处理</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {approvableCount}
          </div>
        </div>
      </section>

      <NewRequestForm data={data} session={session} />

      <SectionCard
        title="申请记录"
        description="教师只能看到自己的申请；审批人员看到与自己职责相关的记录；校领导和系统管理员可查看全校记录。"
      >
        {data.requests.length === 0 ? (
          <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            当前没有可见申请。
          </div>
        ) : (
          <div className="space-y-4">
            {data.requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                canApprove={data.approvableIds.has(request.id)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {canConfigureApprovals(session.user.role) ? (
        <ConfigurationForms data={data} />
      ) : null}
    </div>
  );
}
