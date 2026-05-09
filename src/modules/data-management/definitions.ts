export const DATA_MANAGEMENT_PAGE_SIZE = 20;

export const MANAGED_TABLE_KEYS = [
  "teacher",
  "activeStudent",
  "archivedStudent",
  "teacherDepartmentAssignment",
  "inspectionRecord",
  "inspectionCategory",
  "inspectionItem",
  "grade",
  "class",
  "department",
  "subject",
  "academicYear",
  "profileFieldDefinition",
  "auditLog",
] as const;

export type ManagedTableKey = (typeof MANAGED_TABLE_KEYS)[number];

export type CleanupActionKey =
  | "clearInspectionRecords"
  | "clearPeopleRecords"
  | "clearStructureAndBusinessData";

export type DataManagementGroup = {
  title: string;
  description: string;
  tables: ManagedTableKey[];
};

export type ManagedTableDefinition = {
  key: ManagedTableKey;
  label: string;
  group: string;
  description: string;
  deletable: boolean;
  searchPlaceholder: string;
};

export const dataManagementGroups: DataManagementGroup[] = [
  {
    title: "师生档案",
    description: "教师、在校学生、往届学生和教师部门关联数据。",
    tables: ["teacher", "activeStudent", "archivedStudent", "teacherDepartmentAssignment"],
  },
  {
    title: "常规检查",
    description: "检查记录、检查分类和检查项目。",
    tables: ["inspectionRecord", "inspectionCategory", "inspectionItem"],
  },
  {
    title: "学校结构",
    description: "年级、班级、部门、学科和内部学年兼容记录。",
    tables: ["grade", "class", "department", "subject", "academicYear"],
  },
  {
    title: "信息类目",
    description: "教师和学生动态统计类目配置。",
    tables: ["profileFieldDefinition"],
  },
  {
    title: "审计日志",
    description: "系统敏感操作记录，只读保留。",
    tables: ["auditLog"],
  },
];

export const managedTableDefinitions: Record<ManagedTableKey, ManagedTableDefinition> = {
  teacher: {
    key: "teacher",
    label: "教师档案",
    group: "师生档案",
    description: "系统中的教师基础档案。",
    deletable: true,
    searchPlaceholder: "搜索姓名、身份证号、工号、电话",
  },
  activeStudent: {
    key: "activeStudent",
    label: "在校学生",
    group: "师生档案",
    description: "主档案页中的在校学生。",
    deletable: true,
    searchPlaceholder: "搜索姓名、身份证号、学籍号、电话",
  },
  archivedStudent: {
    key: "archivedStudent",
    label: "往届学生",
    group: "师生档案",
    description: "往届存档中心中的学生。",
    deletable: true,
    searchPlaceholder: "搜索姓名、身份证号、学籍号、电话",
  },
  teacherDepartmentAssignment: {
    key: "teacherDepartmentAssignment",
    label: "教师部门关联",
    group: "师生档案",
    description: "教师和多部门之间的关联行。",
    deletable: true,
    searchPlaceholder: "搜索教师或部门",
  },
  inspectionRecord: {
    key: "inspectionRecord",
    label: "检查记录",
    group: "常规检查",
    description: "学生量化和教师量化的原始检查记录。",
    deletable: true,
    searchPlaceholder: "搜索备注、检查项、教师、年级、班级",
  },
  inspectionCategory: {
    key: "inspectionCategory",
    label: "检查分类",
    group: "常规检查",
    description: "检查项目的上级分类。",
    deletable: true,
    searchPlaceholder: "搜索分类名称",
  },
  inspectionItem: {
    key: "inspectionItem",
    label: "检查项目",
    group: "常规检查",
    description: "具体检查规则或指标。",
    deletable: true,
    searchPlaceholder: "搜索项目名称或说明",
  },
  grade: {
    key: "grade",
    label: "年级",
    group: "学校结构",
    description: "在校或归档的届别年级。",
    deletable: true,
    searchPlaceholder: "搜索年级名称",
  },
  class: {
    key: "class",
    label: "班级",
    group: "学校结构",
    description: "年级下的班级配置。",
    deletable: true,
    searchPlaceholder: "搜索班级或年级",
  },
  department: {
    key: "department",
    label: "部门",
    group: "学校结构",
    description: "教师部门和年级部门配置。",
    deletable: true,
    searchPlaceholder: "搜索部门名称",
  },
  subject: {
    key: "subject",
    label: "学科",
    group: "学校结构",
    description: "教师任教学科配置。",
    deletable: true,
    searchPlaceholder: "搜索学科名称",
  },
  academicYear: {
    key: "academicYear",
    label: "内部学年兼容记录",
    group: "学校结构",
    description: "系统内部保留的兼容层记录。",
    deletable: true,
    searchPlaceholder: "搜索学年名称",
  },
  profileFieldDefinition: {
    key: "profileFieldDefinition",
    label: "信息统计类目",
    group: "信息类目",
    description: "教师或学生的动态信息字段定义。",
    deletable: true,
    searchPlaceholder: "搜索类目名称或字段标识",
  },
  auditLog: {
    key: "auditLog",
    label: "审计日志",
    group: "审计日志",
    description: "导入、导出、删除和权限调整等敏感操作记录。",
    deletable: false,
    searchPlaceholder: "搜索动作、对象、摘要",
  },
};

export function normalizeManagedTableKey(value: string | undefined): ManagedTableKey {
  return MANAGED_TABLE_KEYS.includes(value as ManagedTableKey)
    ? (value as ManagedTableKey)
    : "teacher";
}

export function getManagedTableDefinition(table: ManagedTableKey) {
  return managedTableDefinitions[table];
}
