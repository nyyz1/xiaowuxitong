import { UserRole } from "@/generated/prisma/enums";

export const userRoleOptions = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.LOGISTICS_STAFF,
  UserRole.TEACHER,
] as const;

export const userRoleLabels: Record<UserRole, string> = {
  [UserRole.SYSTEM_ADMIN]: "系统管理员",
  [UserRole.SCHOOL_LEADER]: "校领导",
  [UserRole.DEPARTMENT_LEADER]: "部门领导",
  [UserRole.GRADE_MANAGER]: "年级管理员",
  [UserRole.STUDENT_AFFAIRS_STAFF]: "政教工作人员",
  [UserRole.ACADEMIC_AFFAIRS_STAFF]: "教务工作人员",
  [UserRole.ADMIN_OFFICE_STAFF]: "行政办公人员",
  [UserRole.LOGISTICS_STAFF]: "后勤办公人员",
  [UserRole.TEACHER]: "一线教师",
};

export const userRoleDescriptions: Record<UserRole, string> = {
  [UserRole.SYSTEM_ADMIN]: "最高权限账号，维护系统账号、学校结构和全部业务模块。",
  [UserRole.SCHOOL_LEADER]: "查看全校数据，跟进统计、档案、检查和申请审批结果。",
  [UserRole.DEPARTMENT_LEADER]: "负责部门范围内的管理审批和相关数据查看。",
  [UserRole.GRADE_MANAGER]: "负责绑定年级内的学生、检查和年级行政类审批。",
  [UserRole.STUDENT_AFFAIRS_STAFF]: "负责政教相关数据、常规检查录入和学生事务处理。",
  [UserRole.ACADEMIC_AFFAIRS_STAFF]: "负责教务相关档案、打印材料审批协同和数据维护。",
  [UserRole.ADMIN_OFFICE_STAFF]: "负责学校行政办公类申请处理和相关数据维护。",
  [UserRole.LOGISTICS_STAFF]: "负责后勤报修类申请审批和处理跟进。",
  [UserRole.TEACHER]: "发起个人报修、材料打印和其他日常申请，查看自己的申请状态。",
};

