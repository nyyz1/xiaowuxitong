import { requireAlumniArchiveAccess } from "@/lib/authorization";
import {
  getProfileFieldDefinitions,
  getStudentsForExport,
  normalizePeopleFilters,
} from "@/modules/people/queries";
import {
  getProfileFieldValue,
  mergeSystemProfileData,
} from "@/modules/people/helpers";
import {
  buildTemplateHeaders,
  buildWorkbookBuffer,
  spreadsheetResponse,
  studentBaseTemplateHeaders,
} from "@/modules/people/spreadsheet";

function paramsToRecord(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

export async function handleArchiveStudentExportRequest(request: Request) {
  await requireAlumniArchiveAccess();

  const url = new URL(request.url);
  const filters = normalizePeopleFilters(paramsToRecord(url.searchParams));
  const [students, studentProfileFields] = await Promise.all([
    getStudentsForExport(filters, null, "archived"),
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
    student.enrollmentStatus === "ACTIVE" ? "正常" : "停用",
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
  const buffer = buildWorkbookBuffer("往届学生档案", headers, rows);

  return spreadsheetResponse(buffer, "往届学生档案导出.xlsx");
}

export async function handleArchiveStudentTemplateRequest() {
  await requireAlumniArchiveAccess();

  const studentProfileFields = await getProfileFieldDefinitions("STUDENT", {
    activeOnly: true,
  });
  const headers = buildTemplateHeaders(studentBaseTemplateHeaders, studentProfileFields);
  const buffer = buildWorkbookBuffer("往届学生导入模板", headers, [
    [
      "110101200601010031",
      "李同学",
      "2022级入学 / 2025届毕业",
      "1班",
      "正常",
      ...studentProfileFields.map((field) =>
        field.name === "学籍号"
          ? "A001"
          : field.name === "性别"
            ? "男"
            : field.name === "联系电话"
              ? "13900000000"
              : field.name === "监护人联系方式"
                ? "家长 13900000001"
                : field.name === "备注"
                  ? "示例行，可删除"
                  : field.name === "宿舍信息"
          ? "已毕业离宿"
          : field.name === "生源地"
            ? "本区"
            : "",
      ),
    ],
  ]);

  return spreadsheetResponse(buffer, "往届学生导入模板.xlsx");
}
