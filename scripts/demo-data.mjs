export const departments = [
  { id: "dept-admin", name: "校务办公室" },
  { id: "dept-teaching", name: "教务处" },
  { id: "dept-moral", name: "德育处" },
  { id: "dept-grade-2025", name: "2025级年级" },
  { id: "dept-grade-2024", name: "2024级年级" },
  { id: "dept-grade-2023", name: "2023级年级" },
];

export const subjects = [
  { id: "subject-chinese", name: "语文" },
  { id: "subject-math", name: "数学" },
  { id: "subject-english", name: "英语" },
  { id: "subject-physics", name: "物理" },
  { id: "subject-chemistry", name: "化学" },
  { id: "subject-biology", name: "生物" },
];

export const profileFieldDefinitions = [
  {
    id: "profile-field-teacher-employee-number",
    targetType: "TEACHER",
    fieldKey: "employeeNumber",
    name: "工号",
    sortOrder: -100,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-gender",
    targetType: "TEACHER",
    fieldKey: "gender",
    name: "性别",
    sortOrder: -90,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-phone",
    targetType: "TEACHER",
    fieldKey: "phone",
    name: "联系电话",
    sortOrder: -80,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-duties",
    targetType: "TEACHER",
    fieldKey: "duties",
    name: "职务归属",
    sortOrder: -70,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-remarks",
    targetType: "TEACHER",
    fieldKey: "remarks",
    name: "备注",
    sortOrder: -60,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-office",
    targetType: "TEACHER",
    fieldKey: null,
    name: "办公室",
    sortOrder: 0,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-teacher-title",
    targetType: "TEACHER",
    fieldKey: null,
    name: "职称",
    sortOrder: 1,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-number",
    targetType: "STUDENT",
    fieldKey: "studentNumber",
    name: "学籍号",
    sortOrder: -100,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-gender",
    targetType: "STUDENT",
    fieldKey: "gender",
    name: "性别",
    sortOrder: -90,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-phone",
    targetType: "STUDENT",
    fieldKey: "phone",
    name: "联系电话",
    sortOrder: -80,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-guardian-contact",
    targetType: "STUDENT",
    fieldKey: "guardianContact",
    name: "监护人联系方式",
    sortOrder: -70,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-remarks",
    targetType: "STUDENT",
    fieldKey: "remarks",
    name: "备注",
    sortOrder: -60,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-dorm",
    targetType: "STUDENT",
    fieldKey: null,
    name: "宿舍信息",
    sortOrder: 0,
    isActive: true,
    isDeleted: false,
  },
  {
    id: "profile-field-student-origin",
    targetType: "STUDENT",
    fieldKey: null,
    name: "生源地",
    sortOrder: 1,
    isActive: true,
    isDeleted: false,
  },
];

export const inspectionCategories = [
  { id: "category-sanitation", name: "卫生检查", targetType: "STUDENT" },
  { id: "category-discipline", name: "纪律检查", targetType: "STUDENT" },
  { id: "category-attendance", name: "出勤检查", targetType: "STUDENT" },
  { id: "category-activity", name: "跑操检查", targetType: "STUDENT" },
  { id: "category-teacher-attendance", name: "教师考勤", targetType: "TEACHER" },
  { id: "category-teacher-duty", name: "教师履职", targetType: "TEACHER" },
];

export const inspectionItems = [
  {
    id: "item-classroom-sanitation",
    categoryId: "category-sanitation",
    name: "教室卫生",
    valueType: "SCORE",
    description: "检查地面、桌椅、黑板和垃圾桶。",
  },
  {
    id: "item-dorm-sanitation",
    categoryId: "category-sanitation",
    name: "宿舍卫生",
    valueType: "SCORE",
    description: "检查内务、床铺和公共区域。",
  },
  {
    id: "item-late-count",
    categoryId: "category-attendance",
    name: "迟到人数",
    valueType: "COUNT",
    description: "统计早读或第一节课迟到人数。",
  },
  {
    id: "item-discipline-deduction",
    categoryId: "category-discipline",
    name: "纪律扣分",
    valueType: "DEDUCTION",
    description: "记录课堂或课间纪律扣分。",
  },
  {
    id: "item-exercise-quality",
    categoryId: "category-activity",
    name: "跑操质量",
    valueType: "SCORE",
    description: "记录队列、口号和整体精神面貌。",
  },
  {
    id: "item-teacher-late-count",
    categoryId: "category-teacher-attendance",
    name: "到岗异常次数",
    valueType: "COUNT",
    description: "统计教师迟到、早退等异常情况。",
  },
  {
    id: "item-teacher-duty-score",
    categoryId: "category-teacher-duty",
    name: "履职评分",
    valueType: "SCORE",
    description: "记录教师值班、常规执行等综合表现。",
  },
  {
    id: "item-teacher-duty-deduction",
    categoryId: "category-teacher-duty",
    name: "履职扣分",
    valueType: "DEDUCTION",
    description: "记录教师常规执行中的整改或扣分事项。",
  },
];

const inspectionCategoryTargetTypeById = Object.fromEntries(
  inspectionCategories.map((category) => [category.id, category.targetType]),
);

export const demoUserPassword = "ChangeMe123!";

export function dayAtUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date) {
  return date.toISOString();
}

const academicYears = [
  {
    id: "ay-2024",
    name: "2024-2025学年",
    startDate: dayAtUtc(2024, 9, 1),
    endDate: dayAtUtc(2025, 7, 15),
    isCurrent: false,
  },
  {
    id: "ay-2025",
    name: "2025-2026学年",
    startDate: dayAtUtc(2025, 9, 1),
    endDate: dayAtUtc(2026, 7, 15),
    isCurrent: true,
  },
];

export const grades = [
  {
    id: "grade-2023",
    name: "2023级",
    academicYearId: "ay-2025",
    stage: null,
    enrollmentYear: 2023,
    isVisibleInMain: true,
    graduationYear: null,
  },
  {
    id: "grade-2024",
    name: "2024级",
    academicYearId: "ay-2025",
    stage: null,
    enrollmentYear: 2024,
    isVisibleInMain: true,
    graduationYear: null,
  },
  {
    id: "grade-2025",
    name: "2025级",
    academicYearId: "ay-2025",
    stage: null,
    enrollmentYear: 2025,
    isVisibleInMain: true,
    graduationYear: null,
  },
  {
    id: "grade-alumni-2022",
    name: "2022级入学 / 2025届毕业",
    academicYearId: "ay-2024",
    stage: "ALUMNI",
    enrollmentYear: 2022,
    isVisibleInMain: false,
    graduationYear: 2025,
  },
];

function buildGradeClasses(gradeId, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `class-${gradeId}-${index + 1}`,
    gradeId,
    name: `${index + 1}班`,
  }));
}

export function buildClasses() {
  return [
    ...buildGradeClasses("grade-2023", 4),
    ...buildGradeClasses("grade-2024", 4),
    ...buildGradeClasses("grade-2025", 4),
    ...buildGradeClasses("grade-alumni-2022", 3),
  ];
}

export function buildTeachers() {
  const names = [
    "王明",
    "李娜",
    "张伟",
    "刘芳",
    "陈强",
    "赵敏",
    "周磊",
    "吴静",
    "郑浩",
    "孙悦",
    "马超",
    "胡琳",
  ];
  const dutyPatterns = [
    ["班主任"],
    ["教研组长"],
    ["备课组长"],
    ["班主任", "年级德育干事"],
  ];

  return names.map((name, index) => {
    const primaryDepartmentId = departments[(index % (departments.length - 1)) + 1].id;
    const secondaryDepartmentId =
      index % 3 === 0 ? departments[3 + (index % 3)].id : null;
    const departmentIds = Array.from(
      new Set([primaryDepartmentId, secondaryDepartmentId].filter(Boolean)),
    );
    const departmentIdentities = Object.fromEntries(
      departmentIds.map((departmentId, departmentIndex) => [
        departmentId,
        departmentId === "dept-teaching"
          ? "ACADEMIC_AFFAIRS_STAFF"
          : departmentId === "dept-moral"
            ? "STUDENT_AFFAIRS_STAFF"
            : departmentId.startsWith("dept-grade")
              ? departmentIndex === 0
                ? "FRONTLINE_TEACHER"
                : "GRADE_SUBJECT_LEADER"
              : departmentIndex === 0
                ? "FRONTLINE_TEACHER"
                : "DEPARTMENT_LEADER",
      ]),
    );

    return {
      id: `teacher-${index + 1}`,
      employeeNumber: `T${String(index + 1).padStart(4, "0")}`,
      idCardNumber: `1101011980${String(index + 1).padStart(2, "0")}010${index % 10}`,
      name,
      gender: index % 2 === 0 ? "男" : "女",
      departmentId: primaryDepartmentId,
      departmentIds,
      departmentIdentities,
      subjectId: subjects[index % subjects.length].id,
      duties: dutyPatterns[index % dutyPatterns.length],
      profileData: {
        "profile-field-teacher-employee-number": `T${String(index + 1).padStart(4, "0")}`,
        "profile-field-teacher-gender": index % 2 === 0 ? "男" : "女",
        "profile-field-teacher-phone": `1380000${String(1000 + index)}`,
        "profile-field-teacher-duties": dutyPatterns[index % dutyPatterns.length].join("、"),
        "profile-field-teacher-remarks": index % 5 === 0 ? "承担跨年级公开课" : "",
        "profile-field-teacher-office": `教学楼 ${Math.floor(index / 4) + 1}0${(index % 8) + 1}`,
        "profile-field-teacher-title": index % 2 === 0 ? "一级教师" : "二级教师",
      },
      phone: `1380000${String(1000 + index)}`,
      employmentStatus: "ACTIVE",
      remarks: index % 5 === 0 ? "承担跨年级公开课" : null,
    };
  });
}

function buildStudentsForClasses(classes, options) {
  const familyNames = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴"];
  const givenNames = ["一诺", "子涵", "浩然", "梓轩", "雨桐", "思源", "欣怡", "明哲"];
  const students = [];

  for (const [classIndex, classItem] of classes.entries()) {
    for (let index = 0; index < options.perClass; index += 1) {
      const serial = classIndex * options.perClass + index + 1;
      const studentNumber = `${options.studentPrefix}${String(serial).padStart(4, "0")}`;
      const idCardBirthYear = options.idCardBirthYear ?? "2009";
      const phone = `1390000${String(options.phoneBase + serial)}`;
      const guardianContact = `家长${familyNames[serial % familyNames.length]} / 1370000${String(
        options.guardianBase + serial,
      )}`;
      students.push({
        id: `${options.prefix}-${serial}`,
        idCardNumber: `110101${idCardBirthYear}${String(serial).padStart(2, "0")}010${serial % 10}`,
        studentNumber,
        name: `${familyNames[(serial + index) % familyNames.length]}${
          givenNames[(serial + classIndex) % givenNames.length]
        }`,
        gender: serial % 2 === 0 ? "女" : "男",
        gradeId: classItem.gradeId,
        classId: classItem.id,
        enrollmentStatus: serial % options.inactiveDivisor === 0 ? "INACTIVE" : "ACTIVE",
        isArchived: options.isArchived,
        archivedAt: options.archivedAt,
        profileData: {
          "profile-field-student-number": studentNumber,
          "profile-field-student-gender": serial % 2 === 0 ? "女" : "男",
          "profile-field-student-phone": phone,
          "profile-field-student-guardian-contact": guardianContact,
          "profile-field-student-remarks": options.remarks ?? "",
          "profile-field-student-dorm": options.isArchived
            ? "已毕业离宿"
            : `${(serial % 6) + 1}号楼 ${200 + (serial % 20)}`,
          "profile-field-student-origin": serial % 3 === 0 ? "外区" : "本区",
        },
        phone,
        guardianContact,
        remarks: options.remarks ?? null,
      });
    }
  }

  return students;
}

export function buildStudents(classes) {
  const activeClasses = classes.filter((classItem) => classItem.gradeId !== "grade-alumni-2022");
  const alumniClasses = classes.filter((classItem) => classItem.gradeId === "grade-alumni-2022");

  return [
    ...buildStudentsForClasses(activeClasses, {
      prefix: "student-active",
      studentPrefix: "S2025",
      perClass: 8,
      inactiveDivisor: 37,
      isArchived: false,
      idCardBirthYear: "2009",
      archivedAt: null,
      phoneBase: 2000,
      guardianBase: 3000,
      remarks: null,
    }),
    ...buildStudentsForClasses(alumniClasses, {
      prefix: "student-alumni",
      studentPrefix: "A2022",
      perClass: 6,
      inactiveDivisor: 11,
      isArchived: true,
      idCardBirthYear: "2006",
      archivedAt: isoDate(dayAtUtc(2025, 7, 18)),
      phoneBase: 6000,
      guardianBase: 7000,
      remarks: "已自动归档到往届学生信息存档中心",
    }),
  ];
}

function buildStudentInspectionRecords(classes, studentItems) {
  const activeClasses = classes.filter((classItem) => classItem.gradeId !== "grade-alumni-2022");
  const records = [];
  let serial = 1;

  for (let day = 1; day <= 14; day += 1) {
    const inspectionDate = dayAtUtc(2026, 4, day);

    for (const [classIndex, classItem] of activeClasses.entries()) {
      for (const [itemIndex, item] of studentItems.entries()) {
        let value = 0;

        if (item.valueType === "SCORE") {
          value = 80 + ((day * 7 + classIndex * 3 + itemIndex * 5) % 21);
        } else if (item.valueType === "COUNT") {
          value = (day + classIndex + itemIndex) % 5;
        } else {
          value = -((day + classIndex + itemIndex) % 4);
        }

        records.push({
          id: `inspection-record-${serial}`,
          inspectionDate,
          inspectionItemId: item.id,
          gradeId: classItem.gradeId,
          classId: classItem.id,
          teacherId: null,
          recordedById: "user-inspector",
          value,
          remarks:
            value < 0 || value < 82
              ? "模拟数据：需要班主任跟进整改。"
              : "模拟数据：表现正常。",
        });
        serial += 1;
      }
    }
  }

  return {
    records,
    nextSerial: serial,
  };
}

function buildTeacherInspectionRecords(teachers, teacherItems, startingSerial) {
  const activeTeachers = teachers.filter((teacher) => teacher.employmentStatus === "ACTIVE");
  const records = [];
  let serial = startingSerial;

  for (let day = 1; day <= 14; day += 1) {
    const inspectionDate = dayAtUtc(2026, 4, day);

    for (const [teacherIndex, teacher] of activeTeachers.entries()) {
      for (const [itemIndex, item] of teacherItems.entries()) {
        let value = 0;

        if (item.valueType === "SCORE") {
          value = 84 + ((day * 5 + teacherIndex * 4 + itemIndex * 3) % 17);
        } else if (item.valueType === "COUNT") {
          value = (day + teacherIndex + itemIndex) % 3;
        } else {
          value = -((day + teacherIndex + itemIndex) % 2);
        }

        records.push({
          id: `inspection-record-${serial}`,
          inspectionDate,
          inspectionItemId: item.id,
          gradeId: null,
          classId: null,
          teacherId: teacher.id,
          recordedById: "user-inspector",
          value,
          remarks:
            value < 0 || value < 85
              ? "模拟数据：需要后续跟进教师常规表现。"
              : "模拟数据：教师常规表现正常。",
        });
        serial += 1;
      }
    }
  }

  return records;
}

export function buildInspectionRecords(classes, teachers) {
  const studentItems = inspectionItems.filter(
    (item) => inspectionCategoryTargetTypeById[item.categoryId] === "STUDENT",
  );
  const teacherItems = inspectionItems.filter(
    (item) => inspectionCategoryTargetTypeById[item.categoryId] === "TEACHER",
  );
  const studentPart = buildStudentInspectionRecords(classes, studentItems);
  const teacherPart = buildTeacherInspectionRecords(
    teachers,
    teacherItems,
    studentPart.nextSerial,
  );

  return [...studentPart.records, ...teacherPart];
}

export function buildDemoDataset() {
  const classes = buildClasses();
  const teachers = buildTeachers();

  return {
    users: [
      {
        id: "user-admin",
        username: "admin",
        displayName: "系统管理员",
        role: "SYSTEM_ADMIN",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-leader-1",
        username: "leader1",
        displayName: "校领导1",
        role: "SCHOOL_LEADER",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-leader-2",
        username: "leader2",
        displayName: "校领导2",
        role: "SCHOOL_LEADER",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-leader-3",
        username: "leader3",
        displayName: "校领导3",
        role: "SCHOOL_LEADER",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-grade-11-1",
        username: "grade11.manager1",
        displayName: "2024级管理员1",
        role: "GRADE_MANAGER",
        managedGradeId: "grade-2024",
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-grade-11-2",
        username: "grade11.manager2",
        displayName: "2024级管理员2",
        role: "GRADE_MANAGER",
        managedGradeId: "grade-2024",
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-grade-11-3",
        username: "grade11.manager3",
        displayName: "2024级管理员3",
        role: "GRADE_MANAGER",
        managedGradeId: "grade-2024",
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-data",
        username: "data.manager",
        displayName: "数据管理员",
        role: "ACADEMIC_AFFAIRS_STAFF",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
      {
        id: "user-inspector",
        username: "inspector",
        displayName: "常规检查员",
        role: "STUDENT_AFFAIRS_STAFF",
        managedGradeId: null,
        isActive: true,
        plainPassword: demoUserPassword,
      },
    ],
    academicYears,
    grades,
    classes,
    departments,
    subjects,
    profileFieldDefinitions,
    teachers,
    students: buildStudents(classes),
    inspectionCategories,
    inspectionItems,
    inspectionRecords: buildInspectionRecords(classes, teachers),
  };
}

