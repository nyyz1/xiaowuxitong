"use client";

import Link from "next/link";
import { Alert, Button, Divider, Input, Space, Tag, Typography } from "antd";
import {
  deleteManagedRows,
  runDataCleanup,
} from "@/modules/data-management/actions";
import {
  DATA_MANAGEMENT_PAGE_SIZE,
  dataManagementGroups,
  getManagedTableDefinition,
  type ManagedTableKey,
} from "@/modules/data-management/definitions";
import type {
  DataManagementRow,
  DataManagementTableData,
  TableImpactPreview,
} from "@/modules/data-management/queries";

type Notice = {
  tone: "success" | "error";
  message: string;
} | null;

type DataManagementPageProps = {
  data: {
    tableCounts: Record<ManagedTableKey, number>;
    tableData: DataManagementTableData;
    currentDefinition: ReturnType<typeof getManagedTableDefinition>;
    impactPreview: TableImpactPreview[];
  };
  notice: Notice;
};

function buildTableHref(table: ManagedTableKey, q = "", page = 1) {
  const params = new URLSearchParams({
    table,
    page: String(page),
  });

  if (q) {
    params.set("q", q);
  }

  return `/dashboard/data-management?${params.toString()}`;
}

function CleanupForm({
  action,
  title,
  description,
  confirmationText,
  table,
}: {
  action: string;
  title: string;
  description: string;
  confirmationText: string;
  table: ManagedTableKey;
}) {
  return (
    <form action={runDataCleanup} className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="table" value={table} />
      <div className="space-y-2">
        <Typography.Text strong className="!text-red-700">
          {title}
        </Typography.Text>
        <Typography.Paragraph className="!mb-0 !text-sm !leading-6 !text-red-700/80">
          {description}
        </Typography.Paragraph>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-red-800">
        <input name="confirmed" type="checkbox" />
        我确认已经理解该操作会先备份再硬删除。
      </label>
      <Input
        name="confirmationText"
        placeholder={`输入：${confirmationText}`}
        className="!mt-3"
      />
      <Button danger htmlType="submit" className="!mt-3">
        执行
      </Button>
    </form>
  );
}

function RowCells({ row }: { row: DataManagementRow }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {row.cells.map((cell) => (
        <div key={cell.label} className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{cell.label}</div>
          <div className="truncate text-sm text-slate-800" title={cell.value}>
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function RowDeleteForm({
  table,
  row,
}: {
  table: ManagedTableKey;
  row: DataManagementRow;
}) {
  return (
    <form action={deleteManagedRows} className="mt-3 grid gap-2 md:grid-cols-[auto_1fr_auto]">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="rowIds" value={row.id} />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input name="confirmed" type="checkbox" />
        确认
      </label>
      <Input name="confirmationText" placeholder="输入：确认删除" size="small" />
      <Button danger size="small" htmlType="submit">
        删除本条
      </Button>
    </form>
  );
}

export function DataManagementPage({ data, notice }: DataManagementPageProps) {
  const { tableCounts, tableData, currentDefinition, impactPreview } = data;
  const totalPages = Math.max(1, Math.ceil(tableData.total / DATA_MANAGEMENT_PAGE_SIZE));
  const bulkFormId = "data-management-bulk-delete-form";

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-[linear-gradient(135deg,#135c64_0%,#1f7a8c_100%)] p-8 text-white">
        <span className="soft-kicker !bg-white/16 !text-white">系统管理员</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">数据管理中心</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">
          集中查看和清理已经录入的业务数据。所有删除都会先创建 PostgreSQL
          备份，备份失败不会继续删除；用户账号仍由“用户权限”模块单独管理。
        </p>
      </section>

      {notice ? (
        <Alert
          type={notice.tone}
          message={notice.message}
          showIcon
          className="!rounded-2xl"
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-5">
        {dataManagementGroups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <Typography.Text strong>{group.title}</Typography.Text>
            <Typography.Paragraph className="!mb-3 !mt-2 !text-xs !leading-5 !text-slate-500">
              {group.description}
            </Typography.Paragraph>
            <div className="flex flex-wrap gap-2">
              {group.tables.map((table) => {
                const definition = getManagedTableDefinition(table);
                const selected = table === tableData.table;

                return (
                  <Link
                    key={table}
                    href={buildTableHref(table)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selected
                        ? "bg-cyan-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-cyan-50"
                    }`}
                  >
                    {definition.label} {tableCounts[table]}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <CleanupForm
          action="clearInspectionRecords"
          title="清空检查数据"
          description="删除全部检查记录，保留检查分类和检查项目。"
          confirmationText="确认删除"
          table={tableData.table}
        />
        <CleanupForm
          action="clearPeopleRecords"
          title="清空师生档案"
          description="删除教师、学生和教师部门关联，保留学校结构和信息类目配置。"
          confirmationText="确认删除"
          table={tableData.table}
        />
        <CleanupForm
          action="clearStructureAndBusinessData"
          title="清空结构与业务数据"
          description="删除业务数据、结构配置和内部兼容记录；保留用户账号和审计日志。"
          confirmationText="清空结构和业务数据"
          table={tableData.table}
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white/82 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Space wrap>
              <Typography.Title level={3} className="!mb-0">
                {currentDefinition.label}
              </Typography.Title>
              <Tag color={currentDefinition.deletable ? "red" : "blue"}>
                {currentDefinition.deletable ? "可删除" : "只读"}
              </Tag>
            </Space>
            <Typography.Paragraph className="!mt-2 !text-slate-500">
              {currentDefinition.description}
            </Typography.Paragraph>
          </div>

          <form method="get" action="/dashboard/data-management" className="flex w-full gap-2 xl:w-[420px]">
            <input type="hidden" name="table" value={tableData.table} />
            <Input
              name="q"
              defaultValue={tableData.q}
              placeholder={currentDefinition.searchPlaceholder}
            />
            <Button htmlType="submit">筛选</Button>
          </form>
        </div>

        {impactPreview.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {impactPreview.map((item) => (
              <div key={item.label} className="rounded-2xl bg-amber-50 px-4 py-3">
                <div className="text-xs text-amber-700">{item.label}</div>
                <div className="mt-1 text-xl font-semibold text-amber-900">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Divider />

        <form id={bulkFormId} action={deleteManagedRows} className="mb-5 rounded-2xl bg-slate-50 p-4">
          <input type="hidden" name="table" value={tableData.table} />
          <div className="grid gap-3 xl:grid-cols-[auto_1fr_auto] xl:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="confirmed" type="checkbox" disabled={!currentDefinition.deletable} />
              删除勾选数据
            </label>
            <Input
              name="confirmationText"
              placeholder="输入：确认删除"
              disabled={!currentDefinition.deletable}
            />
            <Button danger htmlType="submit" disabled={!currentDefinition.deletable}>
              批量删除
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {tableData.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              当前筛选条件下没有数据。
            </div>
          ) : (
            tableData.rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {currentDefinition.deletable ? (
                        <input form={bulkFormId} name="rowIds" type="checkbox" value={row.id} />
                      ) : null}
                      <div className="min-w-0">
                        <Typography.Text strong className="block truncate">
                          {row.title}
                        </Typography.Text>
                        <Typography.Text className="!text-xs !text-slate-500">
                          {row.subtitle}
                        </Typography.Text>
                      </div>
                    </div>
                  </div>
                  <Tag>{row.id}</Tag>
                </div>
                <div className="mt-4">
                  <RowCells row={row} />
                </div>
                {currentDefinition.deletable ? (
                  <RowDeleteForm table={tableData.table} row={row} />
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Typography.Text className="!text-slate-500">
            共 {tableData.total} 条，第 {tableData.page} / {totalPages} 页
          </Typography.Text>
          <Space>
            <Link
              href={buildTableHref(
                tableData.table,
                tableData.q,
                Math.max(1, tableData.page - 1),
              )}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              上一页
            </Link>
            <Link
              href={buildTableHref(
                tableData.table,
                tableData.q,
                Math.min(totalPages, tableData.page + 1),
              )}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              下一页
            </Link>
          </Space>
        </div>
      </section>
    </div>
  );
}
