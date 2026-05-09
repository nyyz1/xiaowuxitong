import type { ReactNode } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/form/submit-button";
import { getTeacherDepartmentNames } from "@/modules/people/helpers";
import { InspectionRecordScopeFields } from "@/modules/inspection/record-scope-fields";
import {
  inspectionValueTypes,
  inspectionTargetTypeLabels,
  type InspectionTargetTypeValue,
} from "@/lib/validation/inspection";
import {
  createInspectionCategory,
  createInspectionItem,
  createInspectionRecord,
  deleteInspectionCategory,
  deleteInspectionRecord,
  setInspectionItemStatus,
  updateInspectionCategory,
  updateInspectionItem,
  updateInspectionRecord,
} from "@/modules/inspection/actions";
import type {
  InspectionFilters,
  getInspectionManagementData,
} from "@/modules/inspection/queries";

type InspectionManagementData = Awaited<
  ReturnType<typeof getInspectionManagementData>
>;
type ValueType = (typeof inspectionValueTypes)[number];
type Category = InspectionManagementData["categories"][number];
type Item = Category["items"][number] & {
  category: Pick<Category, "id" | "name">;
};
type ActiveItem = InspectionManagementData["activeItems"][number];
type RecordItem = InspectionManagementData["records"][number];
type GradeOption = InspectionManagementData["gradeOptions"][number];
type ClassOption = InspectionManagementData["classOptions"][number];
type TeacherOption = InspectionManagementData["teacherOptions"][number];

type InspectionPageProps = {
  data: InspectionManagementData;
  filters: InspectionFilters;
  notice: {
    tone: "success" | "error";
    message: string;
  } | null;
  access: {
    canConfigureInspection: boolean;
    canRecordInspection: boolean;
    isGradeScoped: boolean;
    canAccessTeacherQuantification: boolean;
  };
};

const valueTypeLabels: Record<ValueType, string> = {
  SCORE: "分数",
  COUNT: "次数/数量",
  DEDUCTION: "扣分",
};

function formatInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDisplayDate(value: Date) {
  return formatInputDate(value);
}

function formatRecordValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildInspectionHref(
  targetType: InspectionTargetTypeValue,
  filters: InspectionFilters,
) {
  const params = new URLSearchParams({
    targetType,
  });

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.itemId) {
    params.set("itemId", filters.itemId);
  }

  if (targetType === "TEACHER") {
    if (filters.teacherId) {
      params.set("teacherId", filters.teacherId);
    }
  } else {
    if (filters.gradeId) {
      params.set("gradeId", filters.gradeId);
    }

    if (filters.classId) {
      params.set("classId", filters.classId);
    }
  }

  return `/dashboard/inspection?${params.toString()}`;
}

function getTeacherOptionLabel(teacher: {
  name: string;
  idCardNumber?: string | null;
  department?: {
    name: string;
  } | null;
  departmentAssignments?: Array<{
    departmentId: string;
    department?: {
      id: string;
      name: string;
    } | null;
  }>;
}) {
  const parts = [`${teacher.name} / ${teacher.idCardNumber ?? "未填写身份证号"}`];

  const departmentNames = getTeacherDepartmentNames(teacher);

  if (departmentNames.length > 0) {
    parts.push(departmentNames.join("、"));
  }

  return parts.join(" / ");
}

function getHeroDescription(
  access: InspectionPageProps["access"],
  targetType: InspectionTargetTypeValue,
) {
  if (targetType === "TEACHER") {
    return access.canRecordInspection
      ? "围绕教师个人记录常规检查结果，结果直接归到教师名下，不再挂在班级上。分类、项目、筛选和统计都会按教师量化口径展开。"
      : "查看教师量化记录与统计结果。教师量化按教师个人归档，不与班级绑定，便于单独追踪教师常规表现。";
  }

  if (access.canConfigureInspection) {
    return "先维护学生量化的分类和项目，再按日期、年级、班级录入检查结果。后续统计与导出会直接复用这里的结构化数据。";
  }

  if (access.canRecordInspection) {
    return access.isGradeScoped
      ? "当前账号仅能录入和查看本年级的学生量化记录，筛选范围也会自动限制在负责年级内。"
      : "按日期、年级、班级录入学生量化结果，并直接在同页完成查询和修正。";
  }

  return "查看学生量化记录与统计口径，分类维护和记录录入由具备权限的账号统一负责。";
}

function getRecordSectionDescription(
  access: InspectionPageProps["access"],
  targetType: InspectionTargetTypeValue,
) {
  if (targetType === "TEACHER") {
    return access.canRecordInspection
      ? "按教师个人录入、筛选和维护量化结果。教师量化不再依赖年级或班级，只保留教师、项目、日期和值等核心信息。"
      : "按教师、日期、项目查看教师量化记录，当前账号无录入或修改权限。";
  }

  if (access.canRecordInspection) {
    return access.isGradeScoped
      ? "当前账号只能查看和录入本年级学生量化结果，年级和班级选项也会自动限制在负责范围内。"
      : "按日期、项目、年级或班级录入学生量化结果，并在同一页面完成筛选和复核。";
  }

  return "当前账号可按日期、项目、年级或班级查看学生量化记录，但不能新增、修改或配置检查口径。";
}

function getCategorySectionDescription(targetType: InspectionTargetTypeValue) {
  return targetType === "TEACHER"
    ? "教师量化的分类和项目只服务于教师个人检查结果，后续录入和统计会自动继承当前口径。"
    : "学生量化的分类和项目用于班级、年级常规检查，后续录入和统计会自动继承当前口径。";
}

function buildAllItems(categories: Category[]) {
  return categories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      category: {
        id: category.id,
        name: category.name,
      },
    })),
  );
}

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

function TargetTypeTabs({
  filters,
  canAccessTeacherQuantification,
}: {
  filters: InspectionFilters;
  canAccessTeacherQuantification: boolean;
}) {
  const options: Array<{
    targetType: InspectionTargetTypeValue;
    href: string;
  }> = [
    {
      targetType: "STUDENT",
      href: buildInspectionHref("STUDENT", filters),
    },
  ];

  if (canAccessTeacherQuantification) {
    options.push({
      targetType: "TEACHER",
      href: buildInspectionHref("TEACHER", filters),
    });
  }

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--panel-border)] bg-white/80 p-2">
      {options.map((option) => {
        const isActive = filters.targetType === option.targetType;

        return (
          <Link
            key={option.targetType}
            href={option.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--panel-soft)]"
            }`}
          >
            {inspectionTargetTypeLabels[option.targetType]}
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
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    />
  );
}

function DateInput({
  name,
  defaultValue,
  required = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <input
      type="date"
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    />
  );
}

function NumberInput({
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      type="number"
      step="0.01"
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    />
  );
}

function TextArea({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder: string;
}) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      rows={2}
      className="rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
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
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    >
      {children}
    </select>
  );
}

function CategorySelectOptions({
  categories,
  includeAllLabel,
}: {
  categories: Category[];
  includeAllLabel?: string;
}) {
  return (
    <>
      {includeAllLabel ? <option value="">{includeAllLabel}</option> : null}
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </>
  );
}

function ItemSelectOptions({
  items,
  includeAllLabel,
}: {
  items: Array<Item | ActiveItem>;
  includeAllLabel?: string;
}) {
  return (
    <>
      {includeAllLabel ? <option value="">{includeAllLabel}</option> : null}
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.category.name} / {item.name}
        </option>
      ))}
    </>
  );
}

function ValueTypeOptions() {
  return (
    <>
      <option value="SCORE">{valueTypeLabels.SCORE}</option>
      <option value="COUNT">{valueTypeLabels.COUNT}</option>
      <option value="DEDUCTION">{valueTypeLabels.DEDUCTION}</option>
    </>
  );
}

function GradeOptions({
  grades,
  includeAllLabel,
}: {
  grades: GradeOption[];
  includeAllLabel?: string;
}) {
  return (
    <>
      {includeAllLabel ? <option value="">{includeAllLabel}</option> : null}
      {grades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {grade.name}
        </option>
      ))}
    </>
  );
}

function ClassOptions({
  classes,
  includeAllLabel,
}: {
  classes: ClassOption[];
  includeAllLabel?: string;
}) {
  return (
    <>
      {includeAllLabel ? <option value="">{includeAllLabel}</option> : null}
      {classes.map((classItem) => (
        <option key={classItem.id} value={classItem.id}>
          {classItem.gradeName} / {classItem.name}
        </option>
      ))}
    </>
  );
}

function TeacherOptions({
  teachers,
  includeAllLabel,
}: {
  teachers: TeacherOption[];
  includeAllLabel?: string;
}) {
  return (
    <>
      {includeAllLabel ? <option value="">{includeAllLabel}</option> : null}
      {teachers.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {getTeacherOptionLabel(teacher)}
        </option>
      ))}
    </>
  );
}

function ItemForm({
  categories,
  category,
  item,
  targetType,
}: {
  categories: Category[];
  category?: Category;
  item?: Category["items"][number];
  targetType: InspectionTargetTypeValue;
}) {
  const action = item ? updateInspectionItem : createInspectionItem;

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <input type="hidden" name="targetType" value={targetType} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <TextInput
        name="name"
        defaultValue={item?.name}
        placeholder="检查项目名称，如卫生、纪律、到岗情况"
        required
      />
      <SelectBox name="categoryId" defaultValue={item?.categoryId ?? category?.id} required>
        <CategorySelectOptions categories={categories} />
      </SelectBox>
      <SelectBox name="valueType" defaultValue={item?.valueType ?? "SCORE"}>
        <ValueTypeOptions />
      </SelectBox>
      <SubmitButton
        idleLabel={item ? "保存项目" : "新增项目"}
        pendingLabel="保存中..."
        tone={item ? "secondary" : "primary"}
        className="h-11"
      />
      <div className="lg:col-span-4">
        <TextArea
          name="description"
          defaultValue={item?.description}
          placeholder="项目说明，可写明评分规则、扣分口径或检查标准"
        />
      </div>
    </form>
  );
}

function CategoryPanel({
  categories,
  targetType,
}: {
  categories: Category[];
  targetType: InspectionTargetTypeValue;
}) {
  const targetTypeLabel = inspectionTargetTypeLabels[targetType];

  return (
    <div className="space-y-5">
      <form
        action={createInspectionCategory}
        className="grid gap-3 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 md:grid-cols-[1fr_auto]"
      >
        <input type="hidden" name="targetType" value={targetType} />
        <TextInput
          name="name"
          placeholder={`新增${targetTypeLabel}分类，如卫生检查、考勤检查`}
          required
        />
        <SubmitButton idleLabel="新增分类" pendingLabel="新增中..." className="h-11" />
      </form>

      {categories.length === 0 ? (
        <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          还没有{targetTypeLabel}分类。先新增一个分类，再为它配置检查项目。
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <details
              key={category.id}
              open
              className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      已配置 {category.items.length} 个项目
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    {targetTypeLabel}
                  </span>
                </div>
              </summary>

              <div className="mt-4 space-y-4 border-t border-[var(--panel-border)] pt-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <form action={updateInspectionCategory} className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <TextInput name="name" defaultValue={category.name} placeholder="分类名称" required />
                    <SubmitButton
                      idleLabel="重命名"
                      pendingLabel="保存中..."
                      tone="secondary"
                      className="h-11"
                    />
                  </form>
                  <form action={deleteInspectionCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <SubmitButton
                      idleLabel="删除空分类"
                      pendingLabel="删除中..."
                      tone="danger"
                      className="h-11"
                      disabled={category.items.length > 0}
                    />
                  </form>
                </div>

                <div className="rounded-[22px] bg-[var(--panel-soft)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                    为该分类新增项目
                  </h4>
                  <ItemForm categories={categories} category={category} targetType={targetType} />
                </div>

                {category.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    该分类下还没有项目。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <details
                        key={item.id}
                        className="rounded-[22px] border border-[var(--panel-border)] bg-white p-4"
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-[var(--text-primary)]">
                                {item.name}
                              </h4>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {valueTypeLabels[item.valueType]} / 已有 {item._count.records} 条记录
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {item.isActive ? "启用中" : "已停用"}
                            </span>
                          </div>
                        </summary>
                        <div className="mt-4 space-y-3 border-t border-[var(--panel-border)] pt-4">
                          <ItemForm categories={categories} item={item} targetType={targetType} />
                          <form action={setInspectionItemStatus} className="flex justify-end">
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="targetType" value={targetType} />
                            <input
                              type="hidden"
                              name="isActive"
                              value={item.isActive ? "false" : "true"}
                            />
                            <SubmitButton
                              idleLabel={item.isActive ? "停用项目" : "启用项目"}
                              pendingLabel="处理中..."
                              tone={item.isActive ? "danger" : "secondary"}
                            />
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordFilterForm({
  filters,
  categories,
  allItems,
  grades,
  classes,
  teachers,
}: {
  filters: InspectionFilters;
  categories: Category[];
  allItems: Item[];
  grades: GradeOption[];
  classes: ClassOption[];
  teachers: TeacherOption[];
}) {
  return (
    <form
      method="get"
      className={`grid gap-3 rounded-[24px] bg-[var(--panel-soft)] p-4 ${
        filters.targetType === "TEACHER"
          ? "xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto]"
          : "xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto_auto]"
      }`}
    >
      <input type="hidden" name="targetType" value={filters.targetType} />
      <DateInput name="dateFrom" defaultValue={filters.dateFrom} />
      <DateInput name="dateTo" defaultValue={filters.dateTo} />
      <SelectBox name="categoryId" defaultValue={filters.categoryId}>
        <CategorySelectOptions categories={categories} includeAllLabel="全部分类" />
      </SelectBox>
      <SelectBox name="itemId" defaultValue={filters.itemId}>
        <ItemSelectOptions items={allItems} includeAllLabel="全部项目" />
      </SelectBox>
      {filters.targetType === "TEACHER" ? (
        <SelectBox name="teacherId" defaultValue={filters.teacherId}>
          <TeacherOptions teachers={teachers} includeAllLabel="全部教师" />
        </SelectBox>
      ) : (
        <>
          <SelectBox name="gradeId" defaultValue={filters.gradeId}>
            <GradeOptions grades={grades} includeAllLabel="全部年级" />
          </SelectBox>
          <SelectBox name="classId" defaultValue={filters.classId}>
            <ClassOptions classes={classes} includeAllLabel="全部班级" />
          </SelectBox>
        </>
      )}
      <button className="h-11 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white">
        查询记录
      </button>
      <Link
        href={`/dashboard/inspection?targetType=${filters.targetType}`}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-white px-5 text-sm font-semibold text-[var(--accent)]"
      >
        清空筛选
      </Link>
    </form>
  );
}

function RecordForm({
  targetType,
  activeItems,
  grades,
  classes,
  teachers,
  record,
}: {
  targetType: InspectionTargetTypeValue;
  activeItems: ActiveItem[];
  grades: GradeOption[];
  classes: ClassOption[];
  teachers: TeacherOption[];
  record?: RecordItem;
}) {
  const action = record ? updateInspectionRecord : createInspectionRecord;
  const defaultDate = record?.inspectionDate ?? new Date();
  const itemOptions =
    record && !activeItems.some((item) => item.id === record.inspectionItemId)
      ? [record.inspectionItem, ...activeItems]
      : activeItems;
  const teacherOptions =
    record &&
    record.teacher &&
    !teachers.some((teacher) => teacher.id === record.teacherId)
      ? [record.teacher, ...teachers]
      : teachers;
  const isStudent = targetType === "STUDENT";
  const isDisabled =
    activeItems.length === 0 ||
    (isStudent ? grades.length === 0 : teacherOptions.length === 0);
  const scopeFieldSpanClass = isStudent ? "" : "lg:col-span-3";

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-4">
      <input type="hidden" name="targetType" value={targetType} />
      {record ? <input type="hidden" name="id" value={record.id} /> : null}
      <DateInput name="inspectionDate" defaultValue={formatInputDate(defaultDate)} required />
      <SelectBox name="inspectionItemId" defaultValue={record?.inspectionItemId} required>
        <ItemSelectOptions items={itemOptions} includeAllLabel="请选择检查项目" />
      </SelectBox>
      <div className={scopeFieldSpanClass}>
        <div className={`grid gap-3 ${isStudent ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          <InspectionRecordScopeFields
            targetType={targetType}
            grades={grades}
            classes={classes}
            teachers={teacherOptions}
            defaultGradeId={record?.gradeId}
            defaultClassId={record?.classId}
            defaultTeacherId={record?.teacherId}
          />
        </div>
      </div>
      {/*
        <>
          <SelectBox name="gradeId" defaultValue={record?.gradeId}>
            <GradeOptions grades={grades} includeAllLabel="请选择年级" />
          </SelectBox>
          <SelectBox name="classId" defaultValue={record?.classId}>
            <ClassOptions classes={classes} includeAllLabel="可选：具体班级" />
          </SelectBox>
        </>
      ) : (
        <div className="lg:col-span-2">
          <SelectBox name="teacherId" defaultValue={record?.teacherId} required>
            <TeacherOptions teachers={teacherOptions} includeAllLabel="请选择教师" />
          </SelectBox>
        </div>
      */}
      <NumberInput
        name="value"
        defaultValue={record ? formatRecordValue(record.value) : ""}
        placeholder="结果数值"
        required
      />
      <div className={isStudent ? "lg:col-span-3" : "lg:col-span-3"}>
        <TextArea
          name="remarks"
          defaultValue={record?.remarks}
          placeholder="备注，如检查人、问题说明、整改要求"
        />
      </div>
      <div className="lg:col-span-4">
        <SubmitButton
          idleLabel={record ? "保存记录" : "新增检查记录"}
          pendingLabel="保存中..."
          tone={record ? "secondary" : "primary"}
          className="h-11"
          disabled={isDisabled}
        />
      </div>
    </form>
  );
}

function getScopeLabel(
  record: RecordItem,
  targetType: InspectionTargetTypeValue,
) {
  if (targetType === "TEACHER") {
    if (!record.teacher) {
      return "未关联教师";
    }

    return getTeacherOptionLabel(record.teacher);
  }

  if (record.class) {
    return `${record.grade?.name ?? "未关联年级"} / ${record.class.name}`;
  }

  if (record.grade) {
    return `${record.grade.name} / 全年级`;
  }

  return "未关联检查对象";
}

function RecordList({
  targetType,
  records,
  recordCount,
  activeItems,
  grades,
  classes,
  teachers,
  canEditRecords,
}: {
  targetType: InspectionTargetTypeValue;
  records: RecordItem[];
  recordCount: number;
  activeItems: ActiveItem[];
  grades: GradeOption[];
  classes: ClassOption[];
  teachers: TeacherOption[];
  canEditRecords: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--text-secondary)]">
        匹配记录：{recordCount} 条，当前显示：{records.length} 条
      </div>

      {!canEditRecords ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          当前账号为只读查看模式，可以查看记录，但不能新增或修改。
        </div>
      ) : null}

      {records.length === 0 ? (
        <div className="rounded-3xl bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          暂无匹配的检查记录。
        </div>
      ) : (
        records.map((record) => (
          <details
            key={record.id}
            className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {formatDisplayDate(record.inspectionDate)} /{" "}
                    {record.inspectionItem.category.name} / {record.inspectionItem.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {getScopeLabel(record, targetType)} / 结果：{formatRecordValue(record.value)}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {valueTypeLabels[record.inspectionItem.valueType]}
                </span>
              </div>
            </summary>

            <div className="mt-4 space-y-4 border-t border-[var(--panel-border)] pt-4">
              <div className="grid gap-2 rounded-2xl bg-[var(--panel-soft)] p-4 text-sm leading-7 text-[var(--text-secondary)] md:grid-cols-2">
                <div>录入人：{record.recordedBy?.displayName ?? "未关联账号"}</div>
                <div>备注：{record.remarks || "无"}</div>
              </div>
              {canEditRecords ? (
                <>
                  <RecordForm
                    targetType={targetType}
                    record={record}
                    activeItems={activeItems}
                    grades={grades}
                    classes={classes}
                    teachers={teachers}
                  />
                  <form action={deleteInspectionRecord} className="flex justify-end">
                    <input type="hidden" name="id" value={record.id} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <SubmitButton
                      idleLabel="删除误录检查"
                      pendingLabel="删除中..."
                      tone="danger"
                      confirmMessage="确认删除这条检查记录？删除后需重新录入才能恢复。"
                    />
                  </form>
                </>
              ) : (
                <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                  当前账号只能查看记录详情。如需录入或修改，请使用具备检查录入权限的账号。
                </div>
              )}
            </div>
          </details>
        ))
      )}
    </div>
  );
}

export function InspectionPage({
  data,
  filters,
  notice,
  access,
}: InspectionPageProps) {
  const allItems = buildAllItems(data.categories);
  const grades = data.gradeOptions;
  const classes = data.classOptions;
  const teachers = data.teacherOptions;
  const activeItemCount = data.categories.reduce(
    (sum, category) => sum + category.items.filter((item) => item.isActive).length,
    0,
  );
  const targetTypeLabel = inspectionTargetTypeLabels[filters.targetType];
  const heroDescription = getHeroDescription(access, filters.targetType);
  const recordSectionDescription = getRecordSectionDescription(
    access,
    filters.targetType,
  );
  const categorySectionDescription = getCategorySectionDescription(filters.targetType);
  const isTeacherTarget = filters.targetType === "TEACHER";
  const missingTargetDependency = isTeacherTarget
    ? teachers.length === 0
    : grades.length === 0;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <TargetTypeTabs
          filters={filters}
          canAccessTeacherQuantification={access.canAccessTeacherQuantification}
        />

        <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[30px] bg-[linear-gradient(135deg,#31572c_0%,#1f7a8c_100%)] p-7 text-white">
            <span className="soft-kicker !bg-white/16 !text-white">常规检查</span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              {targetTypeLabel}录入与查询
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
              {heroDescription}
            </p>
          </div>

          <div className="rounded-[30px] border border-[var(--panel-border)] bg-white/78 p-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              当前量化概览
            </h2>
            <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
                分类：{data.categories.length} 个
              </div>
              <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
                启用项目：{activeItemCount} 个
              </div>
              {isTeacherTarget ? (
                <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
                  可选教师：{teachers.length} 人
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
                    年级：{grades.length} 个
                  </div>
                  <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
                    班级：{classes.length} 个
                  </div>
                </>
              )}
            </div>
            {access.canConfigureInspection && !isTeacherTarget ? (
              <Link
                href="/dashboard/structure"
                className="mt-5 inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)]"
              >
                维护年级和班级
              </Link>
            ) : null}
            {access.isGradeScoped ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                当前账号已绑定年级范围，只能处理本年级的学生量化数据。
              </div>
            ) : null}
            {!access.canRecordInspection ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                当前账号为全校检查数据只读模式，可查看记录与筛选结果，但不能录入或修改。
              </div>
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

      {access.canConfigureInspection ? (
        <SectionCard
          title={`${targetTypeLabel}分类与项目`}
          description={categorySectionDescription}
        >
          <CategoryPanel categories={data.categories} targetType={filters.targetType} />
        </SectionCard>
      ) : null}

      <SectionCard
        title={`${targetTypeLabel}记录录入与查询`}
        description={recordSectionDescription}
      >
        <RecordFilterForm
          filters={filters}
          categories={data.categories}
          allItems={allItems}
          grades={grades}
          classes={classes}
          teachers={teachers}
        />

        {access.canRecordInspection ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--panel-border)] bg-[var(--panel-soft)] p-4">
            <h3 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
              新增{targetTypeLabel}记录
            </h3>
            {data.activeItems.length === 0 || missingTargetDependency ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {isTeacherTarget
                  ? "请先配置至少一个启用的教师量化项目，并确保当前系统中已有可选教师。"
                  : "请先配置至少一个启用的学生量化项目，并在学校结构中维护好年级和班级。"}
              </div>
            ) : null}
            <RecordForm
              targetType={filters.targetType}
              activeItems={data.activeItems}
              grades={grades}
              classes={classes}
              teachers={teachers}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <RecordList
            targetType={filters.targetType}
            records={data.records}
            recordCount={data.recordCount}
            activeItems={data.activeItems}
            grades={grades}
            classes={classes}
            teachers={teachers}
            canEditRecords={access.canRecordInspection}
          />
        </div>
      </SectionCard>
    </div>
  );
}
