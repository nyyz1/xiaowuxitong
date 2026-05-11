import {
  getDepartmentLeaderDepartmentIds,
  getManagedGradeId,
  requireStudentImportAccess,
  requireTeacherImportAccess,
} from "@/lib/authorization";
import {
  getStudentsForExport,
  getTeachersForExport,
  getProfileFieldDefinitions,
  normalizePeopleFilters,
} from "@/modules/people/queries";
import {
  getProfileFieldValue,
  getTeacherDepartmentDisplayItems,
  getTeacherDepartmentNames,
  mergeSystemProfileData,
} from "@/modules/people/helpers";
import {
  getStudentStatusLabel,
  getTeacherStatusLabel,
} from "@/modules/people/status-options";
import {
  buildTemplateHeaders,
  buildWorkbookBuffer,
  spreadsheetResponse,
  studentBaseTemplateHeaders,
  teacherBaseTemplateHeaders,
} from "@/modules/people/spreadsheet";

function paramsToRecord(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

export async function handleTeacherExportRequest(request: Request) {
  const context = await requireTeacherImportAccess();

  const url = new URL(request.url);
  const filters = normalizePeopleFilters(paramsToRecord(url.searchParams));
  const [teachers, teacherProfileFields] = await Promise.all([
    getTeachersForExport(filters, getDepartmentLeaderDepartmentIds(context.positions)),
    getProfileFieldDefinitions("TEACHER", {
      activeOnly: true,
    }),
  ]);
  const headers = buildTemplateHeaders(teacherBaseTemplateHeaders, teacherProfileFields);
  const rows = teachers.map((teacher) => [
    teacher.idCardNumber ?? "",
    teacher.name,
    getTeacherDepartmentNames(teacher).join("、"),
    getTeacherDepartmentDisplayItems(teacher).join("、"),
    teacher.subject?.name ?? "",
    getTeacherStatusLabel(teacher.employmentStatus),
    ...teacherProfileFields.map((field) =>
      getProfileFieldValue(
        mergeSystemProfileData(teacherProfileFields, teacher.profileData, {
          employeeNumber: teacher.employeeNumber,
          gender: teacher.gender,
          phone: teacher.phone,
          duties: teacher.duties.join("、"),
          remarks: teacher.remarks,
        }),
        field.id,
      ),
    ),
  ]);
  const buffer = buildWorkbookBuffer("教师档案", headers, rows);

  return spreadsheetResponse(buffer, "教师档案导出.xlsx");
}

export async function handleStudentExportRequest(request: Request) {
  const context = await requireStudentImportAccess();

  const url = new URL(request.url);
  const filters = normalizePeopleFilters(paramsToRecord(url.searchParams));
  const [students, studentProfileFields] = await Promise.all([
    getStudentsForExport(filters, getManagedGradeId(context.session), "active"),
    getProfileFieldDefinitions("STUDENT", {
      activeOnly: true,
    }),
  ]);
  const headers = buildTemplateHeaders(studentBaseTemplateHeaders, studentProfileFields);
  const rows = students.map((student) => [
    student.idCardNumber ?? "",
    student.name,
    student.grade.name,
    student.class?.name ?? "",
    getStudentStatusLabel(student.enrollmentStatus),
    ...studentProfileFields.map((field) =>
      getProfileFieldValue(
        mergeSystemProfileData(studentProfileFields, student.profileData, {
          studentNumber: student.studentNumber,
          gender: student.gender,
          phone: student.phone,
          guardianContact: student.guardianContact,
          remarks: student.remarks,
        }),
        field.id,
      ),
    ),
  ]);
  const buffer = buildWorkbookBuffer("学生档案", headers, rows);

  return spreadsheetResponse(buffer, "学生档案导出.xlsx");
}

export async function handleTeacherTemplateRequest() {
  await requireTeacherImportAccess();

  const teacherProfileFields = await getProfileFieldDefinitions("TEACHER", {
    activeOnly: true,
  });
  const headers = buildTemplateHeaders(teacherBaseTemplateHeaders, teacherProfileFields);
  const buffer = buildWorkbookBuffer("教师导入模板", headers, [
    [
      "110101198001010011",
      "张老师",
      "教务处、2025级年级",
      "教务处/部门领导、2025级年级/一线教师",
      "语文",
      "正常",
      ...teacherProfileFields.map((field) =>
        field.name === "工号"
          ? "T001"
          : field.name === "性别"
            ? "女"
            : field.name === "联系电话"
              ? "13800000000"
              : field.name === "职务归属"
                ? "班主任、教研组长"
                : field.name === "备注"
                  ? "示例行，可删除"
                  : field.name === "办公室"
          ? "行政楼 302"
          : field.name === "职称"
            ? "一级教师"
            : "",
      ),
    ],
  ]);

  return spreadsheetResponse(buffer, "教师导入模板.xlsx");
}

export async function handleStudentTemplateRequest() {
  await requireStudentImportAccess();

  const studentProfileFields = await getProfileFieldDefinitions("STUDENT", {
    activeOnly: true,
  });
  const headers = buildTemplateHeaders(studentBaseTemplateHeaders, studentProfileFields);
  const buffer = buildWorkbookBuffer("学生导入模板", headers, [
    [
      "110101200901010021",
      "李同学",
      "2025级",
      "1班",
      "正常",
      ...studentProfileFields.map((field) =>
        field.name === "学籍号"
          ? "S001"
          : field.name === "性别"
            ? "男"
            : field.name === "联系电话"
              ? "13900000000"
              : field.name === "监护人联系方式"
                ? "家长 13900000001"
                : field.name === "备注"
                  ? "示例行，可删除"
                  : field.name === "宿舍信息"
          ? "6号楼 302"
          : field.name === "生源地"
            ? "本区"
            : "",
      ),
    ],
  ]);

  return spreadsheetResponse(buffer, "学生导入模板.xlsx");
}
