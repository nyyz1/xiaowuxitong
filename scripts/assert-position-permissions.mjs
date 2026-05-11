import assert from "node:assert/strict";

const UserRole = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  SCHOOL_LEADER: "SCHOOL_LEADER",
  DEPARTMENT_LEADER: "DEPARTMENT_LEADER",
  GRADE_MANAGER: "GRADE_MANAGER",
  STUDENT_AFFAIRS_STAFF: "STUDENT_AFFAIRS_STAFF",
  ACADEMIC_AFFAIRS_STAFF: "ACADEMIC_AFFAIRS_STAFF",
  ADMIN_OFFICE_STAFF: "ADMIN_OFFICE_STAFF",
  LOGISTICS_STAFF: "LOGISTICS_STAFF",
  TEACHER: "TEACHER",
};

const Identity = {
  FRONTLINE_TEACHER: "FRONTLINE_TEACHER",
  DEPARTMENT_LEADER: "DEPARTMENT_LEADER",
  GRADE_MANAGER: "GRADE_MANAGER",
  STUDENT_AFFAIRS_STAFF: "STUDENT_AFFAIRS_STAFF",
  ACADEMIC_AFFAIRS_STAFF: "ACADEMIC_AFFAIRS_STAFF",
  LOGISTICS_STAFF: "LOGISTICS_STAFF",
  GRADE_SUBJECT_LEADER: "GRADE_SUBJECT_LEADER",
};

const ResponsibilityKind = {
  LOGISTICS: "LOGISTICS",
  PRINT_TEACHING: "PRINT_TEACHING",
  PRINT_GRADE_ADMIN: "PRINT_GRADE_ADMIN",
  PRINT_SCHOOL_ADMIN: "PRINT_SCHOOL_ADMIN",
  OTHER: "OTHER",
};

const RequestKind = {
  MAINTENANCE: "MAINTENANCE",
  PRINT: "PRINT",
  OTHER: "OTHER",
};

const PrintMaterialType = {
  TEACHING: "TEACHING",
  GRADE_ADMIN: "GRADE_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
};

function context(identities = [], assignedDepartmentIds = []) {
  return {
    identityTypes: new Set(identities),
    departmentLeaderDepartmentIds: assignedDepartmentIds.filter((_, index) =>
      identities[index] === Identity.DEPARTMENT_LEADER
    ),
    assignedDepartmentIds,
  };
}

function hasIdentity(positionContext, identityType) {
  return positionContext.identityTypes.has(identityType);
}

function canCreateApprovalRequest(session) {
  return session.role === UserRole.SYSTEM_ADMIN || Boolean(session.teacherId);
}

function canRecordInspectionTarget(role, targetType, positions) {
  if (role === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  if (targetType === "STUDENT") {
    return (
      role === UserRole.STUDENT_AFFAIRS_STAFF ||
      role === UserRole.GRADE_MANAGER ||
      hasIdentity(positions, Identity.STUDENT_AFFAIRS_STAFF)
    );
  }

  return (
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    hasIdentity(positions, Identity.ACADEMIC_AFFAIRS_STAFF)
  );
}

function canEditPeople(role, positions) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.ADMIN_OFFICE_STAFF ||
    hasIdentity(positions, Identity.STUDENT_AFFAIRS_STAFF) ||
    hasIdentity(positions, Identity.ACADEMIC_AFFAIRS_STAFF)
  );
}

function getPrintResponsibilityKind(materialType) {
  if (materialType === PrintMaterialType.TEACHING) {
    return ResponsibilityKind.PRINT_TEACHING;
  }

  if (materialType === PrintMaterialType.GRADE_ADMIN) {
    return ResponsibilityKind.PRINT_GRADE_ADMIN;
  }

  return ResponsibilityKind.PRINT_SCHOOL_ADMIN;
}

function getRequiredResponsibilityKind(scope) {
  if (scope.kind === RequestKind.MAINTENANCE) {
    return ResponsibilityKind.LOGISTICS;
  }

  if (scope.kind === RequestKind.PRINT && scope.printMaterialType) {
    return getPrintResponsibilityKind(scope.printMaterialType);
  }

  return scope.responsibilityKind ?? ResponsibilityKind.OTHER;
}

function findMatchingResponsibility(responsibilities, scope) {
  const requiredKind = getRequiredResponsibilityKind(scope);
  const matches = responsibilities.filter((responsibility) => {
    return (
      responsibility.isActive &&
      responsibility.kind === requiredKind &&
      (!responsibility.requestTypeId ||
        responsibility.requestTypeId === scope.requestTypeId) &&
      (!responsibility.gradeId || responsibility.gradeId === scope.gradeId) &&
      (!responsibility.subjectId || responsibility.subjectId === scope.subjectId) &&
      (!responsibility.departmentId ||
        responsibility.departmentId === scope.departmentId)
    );
  });

  return (
    matches
      .map((responsibility) => ({
        responsibility,
        score:
          (responsibility.requestTypeId ? 8 : 0) +
          (responsibility.gradeId ? 4 : 0) +
          (responsibility.subjectId ? 2 : 0) +
          (responsibility.departmentId ? 1 : 0),
      }))
      .sort((left, right) => right.score - left.score)[0]?.responsibility ?? null
  );
}

function canSubmitDepartmentScope(session, positions, departmentId) {
  return !session.teacherId || !departmentId || positions.assignedDepartmentIds.includes(departmentId);
}

const academicPosition = context([Identity.ACADEMIC_AFFAIRS_STAFF], ["dept-academic"]);
const studentAffairsPosition = context([Identity.STUDENT_AFFAIRS_STAFF], ["dept-student"]);
const departmentLeaderPosition = context([Identity.DEPARTMENT_LEADER], ["dept-office"]);
const frontlinePosition = context([Identity.FRONTLINE_TEACHER], ["dept-grade"]);

assert.equal(
  canCreateApprovalRequest({
    role: UserRole.ACADEMIC_AFFAIRS_STAFF,
    teacherId: "teacher-1",
  }),
  true,
  "非 TEACHER 角色绑定教师档案后应可提交申请",
);
assert.equal(
  canCreateApprovalRequest({ role: UserRole.ACADEMIC_AFFAIRS_STAFF, teacherId: null }),
  false,
  "未绑定教师档案的非系统管理员账号不应提交教师自助申请",
);

assert.equal(
  canRecordInspectionTarget(UserRole.TEACHER, "STUDENT", studentAffairsPosition),
  true,
  "政教岗位身份可录入学生量化",
);
assert.equal(
  canRecordInspectionTarget(UserRole.TEACHER, "TEACHER", studentAffairsPosition),
  false,
  "政教岗位身份不可录入教师量化",
);
assert.equal(
  canRecordInspectionTarget(UserRole.TEACHER, "TEACHER", academicPosition),
  true,
  "教务岗位身份可录入教师量化",
);
assert.equal(
  canRecordInspectionTarget(UserRole.TEACHER, "STUDENT", academicPosition),
  false,
  "教务岗位身份不可录入学生量化",
);

assert.equal(
  canEditPeople(UserRole.TEACHER, studentAffairsPosition),
  true,
  "政教岗位身份可维护师生档案",
);
assert.equal(
  canEditPeople(UserRole.TEACHER, academicPosition),
  true,
  "教务岗位身份可维护师生档案",
);
assert.equal(
  canEditPeople(UserRole.ADMIN_OFFICE_STAFF, frontlinePosition),
  true,
  "行政办公人员可维护师生档案",
);

const responsibilities = [
  {
    id: "fallback-print",
    kind: ResponsibilityKind.PRINT_TEACHING,
    requestTypeId: "type-print",
    isActive: true,
  },
  {
    id: "specific-teaching",
    kind: ResponsibilityKind.PRINT_TEACHING,
    requestTypeId: "type-print",
    gradeId: "grade-2024",
    subjectId: "subject-chinese",
    isActive: true,
  },
  {
    id: "grade-admin",
    kind: ResponsibilityKind.PRINT_GRADE_ADMIN,
    requestTypeId: "type-print",
    gradeId: "grade-2024",
    isActive: true,
  },
  {
    id: "school-admin",
    kind: ResponsibilityKind.PRINT_SCHOOL_ADMIN,
    requestTypeId: "type-print",
    departmentId: "dept-office",
    isActive: true,
  },
  {
    id: "logistics",
    kind: ResponsibilityKind.LOGISTICS,
    requestTypeId: "type-maintenance",
    isActive: true,
  },
];

assert.equal(
  findMatchingResponsibility(responsibilities, {
    requestTypeId: "type-maintenance",
    kind: RequestKind.MAINTENANCE,
  })?.id,
  "logistics",
  "报修应路由到 LOGISTICS 职责",
);
assert.equal(
  findMatchingResponsibility(responsibilities, {
    requestTypeId: "type-print",
    kind: RequestKind.PRINT,
    printMaterialType: PrintMaterialType.GRADE_ADMIN,
    gradeId: "grade-2024",
  })?.id,
  "grade-admin",
  "年级打印应按 PRINT_GRADE_ADMIN + gradeId 路由",
);
assert.equal(
  findMatchingResponsibility(responsibilities, {
    requestTypeId: "type-print",
    kind: RequestKind.PRINT,
    printMaterialType: PrintMaterialType.TEACHING,
    gradeId: "grade-2024",
    subjectId: "subject-chinese",
  })?.id,
  "specific-teaching",
  "学科打印应按 PRINT_TEACHING + gradeId + subjectId 路由",
);
assert.equal(
  findMatchingResponsibility(responsibilities, {
    requestTypeId: "type-print",
    kind: RequestKind.PRINT,
    printMaterialType: PrintMaterialType.SCHOOL_ADMIN,
    departmentId: "dept-office",
  })?.id,
  "school-admin",
  "学校打印应按 PRINT_SCHOOL_ADMIN + departmentId 路由",
);
assert.equal(
  canSubmitDepartmentScope(
    { role: UserRole.TEACHER, teacherId: "teacher-office" },
    departmentLeaderPosition,
    "dept-office",
  ),
  true,
  "学校打印只能选择本人教师档案归属部门",
);
assert.equal(
  canSubmitDepartmentScope(
    { role: UserRole.TEACHER, teacherId: "teacher-office" },
    departmentLeaderPosition,
    "dept-other",
  ),
  false,
  "学校打印不能选择本人教师档案未归属部门",
);

assert.deepEqual(
  departmentLeaderPosition.departmentLeaderDepartmentIds,
  ["dept-office"],
  "部门领导数据范围应来自教师档案中的部门领导身份",
);

console.log("Position-derived permission assertions passed.");
