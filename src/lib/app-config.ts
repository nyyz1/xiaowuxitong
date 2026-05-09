export const appConfig = {
  name: "校务系统",
  description:
    "面向高中学校的内部校务管理平台，用于维护师生档案、常规检查记录、届别滚动、统计导出和数据运维。",
  subtitle: "高中学校内部信息与常规检查管理平台",
} as const;

export const moduleHighlights = [
  {
    title: "学校结构",
    description:
      "维护年级、班级、部门和学科，作为全系统的基础主数据入口；内部学年兼容层由系统维护。",
  },
  {
    title: "用户权限",
    description:
      "集中管理系统账号、角色、启停状态、密码重置和年级范围绑定，保证权限边界清晰可控。",
  },
  {
    title: "数据管理",
    description:
      "系统管理员可集中查看各类已录入数据，并在自动备份保护下执行单条、批量和一键清理。",
  },
  {
    title: "师生档案",
    description:
      "统一维护在校教师和学生档案，支持筛选、导入、导出和日常编辑。",
  },
  {
    title: "往届存档",
    description:
      "集中维护自动归档后的往届学生数据，继续支持查询、导入、导出和修正。",
  },
  {
    title: "常规检查",
    description:
      "维护检查分类、项目和记录，让日常检查数据可录入、可查询、可追溯。",
  },
  {
    title: "统计导出",
    description:
      "按时间、年级、班级、教师和检查项目汇总统计，并输出 Excel 或 CSV 报表。",
  },
] as const;
