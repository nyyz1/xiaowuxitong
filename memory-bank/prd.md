# PRD

## Status

Draft v1 updated through the approved school trial setup, the rollover or archive expansion on 2026-04-24, and the approved enrollment-year cohort redesign on 2026-04-26.

Current assumptions:

- the system serves one high school as an internal tool
- the primary usage environment is desktop browsers on a school intranet or private deployment
- the first release focuses on teacher and student information, routine inspection records, statistics, and exports
- the first live trial will use a school-controlled PostgreSQL deployment on the current school pilot workstation inside the school network
- the approved trial starts with Grade 11 only while still keeping the system data model school-wide
- the approved trial role model includes one system administrator, three school leader accounts, three Grade 11-scoped manager accounts, one data manager, and one inspection staff account
- the school now requires explicit year-transition rollover rules, an alumni archive center, batch class-count maintenance, support for multiple teacher duties, support for teachers belonging to multiple departments, configurable teacher or student information statistics categories, an enrollment-year cohort model that keeps only the latest three cohorts active, identity-card-number-based import updates or unique identification for teacher and student records, and a lightweight teacher-facing application and approval workflow for repair, printing, and other daily requests
- the account model now separates login account type from permission capability: login accounts are either teacher or student accounts, while highest-administrator capability is an account flag; newly imported active teacher or student records can create bound login accounts from identity card numbers, and department-level teacher duties are configured as department positions

## One-Sentence Product Summary

An internal school affairs system for a high school to manage teacher and student profiles, collect routine inspection results, and export filtered data on demand.

## Problem

School administrative data is often scattered across Excel files, paper forms, chat messages, and manually maintained summaries. This creates several operational problems:

- teacher and student information becomes inconsistent across departments
- routine inspection results are collected repeatedly but summarized manually
- monthly or ad hoc reporting depends on spreadsheet merging by hand
- exporting data for school leaders or external requests takes too long
- there is no single authoritative source for school personnel and inspection records

The system should give school staff one place to maintain master data, enter routine inspection results, query summaries, and export exactly the data they need without manual spreadsheet stitching.

## Users

| User | Primary need | Current workaround | Why it fails |
| --- | --- | --- | --- |
| School admin office | Maintain teacher and student master data | Multiple Excel files maintained by different staff members | Duplicate data, version drift, hard to audit |
| Grade manager or grade office operator | Query students and inspection results inside the grade cohort they are responsible for | Ask admin office or search local spreadsheets | Slow, incomplete, easy to use stale data |
| Inspection staff | Record daily or weekly routine checks | Paper forms or temporary spreadsheets | Hard to aggregate, easy to miss entries |
| School leader | View summaries and export reports | Ask someone to manually compile reports | Slow response, high manual effort, poor traceability |

## Roles In Version 1

- `System Admin`: full access, user and permission management; in the approved trial this is the single highest-privilege account
- `School Leader`: school-wide read access for teacher, student, inspection record, and reporting data plus school-wide teacher or student and reporting import/export actions approved for the trial
- `Grade Manager`: must be bound to exactly one grade cohort; can only access student and inspection data inside that cohort
- `Data Manager`: school-wide teacher and student data maintenance, import, and export
- `Inspection Staff`: school-wide inspection item maintenance, inspection entry, statistics, and report export

## Roles In V1.5 Approval Scope

- `System Admin`: full access, user and permission management, application type configuration, and approval responsibility configuration; now represented as highest-administrator capability on a teacher-type account rather than a third login account type
- `School Leader`: school-wide read access for operational data and application records
- `Department Leader`: department-level management and approval work when bound through approval responsibilities
- `Grade Manager`: grade-scoped management and grade administrative printing approval when bound to a grade
- `Student Affairs Staff`: student affairs and routine inspection work
- `Academic Affairs Staff`: teaching affairs and teacher/student data maintenance
- `Admin Office Staff`: school administrative office work and school administrative printing approval when bound through approval responsibilities
- `Logistics Staff`: logistics office work and daily repair approval when bound through approval responsibilities
- `Teacher`: teacher self-service account for submitting daily repair, material printing, and other configured requests
- `Student`: student login account used only for login and self-service password maintenance in this phase; student business pages remain closed

## Account Model

- login account type is limited to `Teacher` and `Student`
- highest-administrator access is controlled by an administrator capability flag, while the legacy role field remains as an internal compatibility layer
- teacher imports create a bound teacher login account only when a new teacher profile is created from a previously unseen identity card number; updating an existing profile does not reset its password
- active student imports create a bound student login account only when a new active student profile is created from a previously unseen identity card number; archived student imports do not create login accounts
- automatically created usernames use the identity card number, and the initial password uses the last 8 characters of that identity card number
- if an identity-card-number account already exists but is bound to another teacher or student profile, the import row must fail instead of silently rebinding the account
- teacher department affiliations now bind to department-configured positions; old teacher identity categories remain as a compatibility signal behind each position

## Approved Trial Assumptions

- the initial live trial is not a public SaaS release; it is a school-internal pilot on school-controlled infrastructure
- the school-approved database shape is a local PostgreSQL deployment on the current pilot workstation, with the PostgreSQL data directory on that machine's `D` drive
- office computers on the same school network should access the web application over the pilot workstation's LAN address rather than connecting directly to PostgreSQL
- the school-approved account model starts with:
  - one `System Admin`
  - three `School Leader` accounts
  - three `Grade Manager` accounts, all bound to one approved active cohort during the first pilot
  - one `Data Manager` account
  - one `Inspection Staff` account
- grade-scoped permissions must be enforced server-side, not only hidden in the UI

## Core Data Domains

### School Structure

- grade
- class
- department
- subject
- internal academic-year compatibility metadata used by rollover and historical relations

Version 1 must treat these as configurable master data inside the system:

- grades can be added or renamed directly in the UI by enrollment year label
- classes can be added, renamed, or removed under each grade so the effective class count of a grade is managed from the UI
- departments can be added, renamed, or removed in the UI
- teacher-facing grade departments should use enrollment-year wording such as `2025级年级` instead of lifecycle wording such as `高一年级部`
- subjects can be added, renamed, or removed in the UI
- an authorized admin can batch increase or decrease class count under a grade by setting a target class total instead of creating only one class at a time
- grades should be identified by enrollment-year labels such as `2023级`, `2024级`, and `2025级` instead of by Grade 1, Grade 2, or Grade 3 lifecycle names
- front-end school-structure management should no longer require operators to create, edit, or select academic-year records manually
- the system may keep `AcademicYear` as an internal compatibility layer during this rollout, but it should be managed server-side rather than exposed as a business workflow
- the rollover flow must create the newest enrollment-year cohort, keep only the latest three enrollment cohorts visible in the active front-end, and archive any older cohort automatically
- archived cohorts should preserve both enrollment-year and graduation-year meaning in display form such as `2022级入学 / 2025届毕业`

### Teacher Profile

Planned minimum fields:

- identity card number, used as the required unique identifier for manual saves and spreadsheet import updates
- name
- gender
- departments, with support for multiple values per teacher
- subject
- duties or position assignments, with support for multiple values per teacher
- phone
- employment status
- remarks
- configurable teacher information statistics categories maintained inside the system, including former fixed statistics fields such as employee number

### Student Profile

Planned minimum fields:

- identity card number, used as the required unique identifier for manual saves and spreadsheet import updates
- name
- gender
- grade
- class
- enrollment-year-based cohort identity through the linked grade record
- enrollment status
- phone
- guardian contact
- remarks
- archive state, so historical cohorts can move out of the main operational front-end without losing editability
- configurable student information statistics categories maintained inside the system, including former fixed statistics fields such as student number

### Configurable Information Statistics Categories

Version 1 now also needs configurable teacher and student information statistics categories:

- authorized users should be able to add new teacher or student information categories directly inside the system without code changes
- authorized users should be able to disable, re-enable, or delete any configured teacher or student information category directly inside the system
- former fixed statistics fields, such as teacher employee number and student number, should be managed through the same add, disable, re-enable, and delete category workflow
- identity card number is not a configurable statistics category; it remains the stable unique identifier used for matching imported rows to existing teacher or student records
- each active category should become a visible field in the corresponding teacher or student maintenance workflow
- deleted categories should be removed from the corresponding maintenance forms, import templates, and export files
- import templates should be generated from the currently active categories at download time
- teacher or student import flows should accept and persist values for all currently active categories
- teacher or student import flows should update existing records by identity card number instead of employee number or student number
- teacher or student export files should include the currently active categories so downloaded files stay aligned with the live system definition

### Alumni Archive

Version 1 now also needs an alumni archive center:

- the active front-end should only display the latest three enrollment cohorts at any time
- any cohort older than those latest three active cohorts should automatically become archived during academic-year rollover
- archived cohorts should display both enrollment and graduation meaning, for example `2022级入学 / 2025届毕业`
- archived cohorts should not appear in the default active student front-end
- archived student records must still support search, filter, import, export, and manual correction inside a dedicated archive center

### Routine Inspection

Each inspection record should be able to capture:

- date
- quantification target type: student quantification or teacher quantification
- inspected scope for student quantification, usually class or grade in version 1
- inspected teacher for teacher quantification, recorded under the teacher's personal name instead of under a class
- inspection category
- inspection item
- score, count, or deduction value
- recorder
- remarks

Examples of inspection categories:

- student discipline
- student sanitation
- student attendance
- student morning exercise or routine activity checks
- teacher attendance or duty performance checks

### Application And Approval

V1.5 adds a lightweight application and approval workflow:

- teachers can submit daily repair applications, daily material printing applications, and other configured application types
- repair applications route to users with logistics approval responsibility
- daily material printing applications are categorized as teaching use, grade administrative use, or school administrative use
- printing applications must record print mode such as black-and-white printing or color printing, paper size such as A4, B5, or B3, and print quantity
- teaching-use printing applications route to a matching grade and subject leader responsibility
- grade-administrative printing applications route to the matching grade manager responsibility
- school-administrative printing applications route to an administrative office or department leadership responsibility
- system administrators can configure other application types and approval responsibilities
- applications support pending, approved, rejected, and reserved cancelled states
- the first approval release records approval comments and audit logs but does not include attachments, notifications, multi-step workflow, or export

## Core Use Cases

1. An authorized staff member can create and maintain school structure data such as grades, classes, departments, and subjects.
2. An authorized staff member can increase or decrease the number of classes under a grade by adding or removing class records directly in the system.
3. An authorized admin can batch adjust the class count under a grade by choosing a target number of classes, while the system protects classes that still contain operational data.
4. An authorized admin can start the next cohort rollover and let the system create the newest enrollment-year cohort, keep the latest three enrollment cohorts active, and archive older cohorts automatically.
5. An authorized staff member can batch import teacher and student information from a spreadsheet template and manually edit or delete mistakenly entered records afterward.
6. A user can search, filter, and export teacher or student data by common dimensions such as grade, class, department, subject, status, and archive scope, subject to role and grade scope.
7. An authorized staff member can add a new teacher or student information statistics category in the system and immediately see it appear in the corresponding maintenance form plus downloaded import template.
8. An authorized user can define routine inspection categories and items used by the school.
9. Inspection staff can record, correct, and delete mistakenly entered student quantification results by date, class or grade, and inspection item, and can also record, correct, and delete mistakenly entered teacher quantification results by date, teacher, and inspection item.
10. A leader, grade manager, or operator can view aggregated inspection statistics by time range, grade, class, teacher, and inspection item as appropriate to the selected quantification type and their allowed scope.
11. An authorized user can export filtered personnel data or inspection statistics to Excel or CSV at any time.
12. A system administrator can open a dedicated data management center to view all entered operational data, inspect dependency counts, delete selected rows, and run fixed cleanup actions after an automatic PostgreSQL backup succeeds.
13. A teacher can submit a daily repair application and see its approval state after a logistics approver processes it.
14. A teacher can submit a daily material printing application with material type, print mode, paper size, and print quantity, and the system routes it to the matching approval responsibility.
15. A system administrator can configure other application types and bind approval responsibilities to users, grades, subjects, departments, or request types.

## Version 1 Scope

### In Scope

- single-school internal deployment
- school-trial deployment on a school-controlled PostgreSQL instance
- role-based login and permission checks
- approved role model with school leaders and grade-scoped managers
- configurable school structure management for grades, classes, departments, and subjects
- internal compatibility support for `AcademicYear` while the front-end and daily workflows stay grade-first
- batch class-count adjustment by grade
- controlled cohort rollover with enrollment-year cohort creation and automatic older-cohort archiving
- teacher and student master data management, including manual correction and deletion of mistakenly entered profile rows
- alumni archive center for automatically archived historical student cohorts
- multiple department affiliations per teacher
- multiple duty values per teacher
- configurable teacher and student information statistics categories with template-driven import columns
- batch import for teacher and student data
- routine inspection item management for both student and teacher quantification
- routine inspection entry, basic editing, and deletion of mistakenly entered records for both student and teacher quantification
- statistics and summary views for inspection data
- ad hoc export of filtered data
- system-admin-only data management center for visual table counts, search, pagination, single-row deletion, selected-row deletion, fixed one-click cleanup, backup-before-delete protection, and read-only audit-log viewing

### Out Of Scope For Version 1

- course scheduling
- exam score and academic performance analysis
- parent portal or student self-service portal
- payroll, finance, dormitory, or asset management
- multi-school SaaS tenancy
- advanced workflow approvals for every export or data change
- attachments, notifications, multi-step workflow, and approval export for the first application-approval release
- bulk hard deletion of user accounts from the data management center; account lifecycle stays in the user-permissions module

## Success Criteria

- school staff can import at least `200` teacher records and `3000` student records without direct database access, with existing rows matched by identity card number
- an operator can find and export a filtered teacher or student list in under `1 minute`
- an operator can add a new teacher or student information statistics category and download an updated import template without code changes
- inspection staff can complete a normal school-day inspection entry workflow without relying on paper-to-Excel re-entry
- school leaders can export monthly or weekly student or teacher quantification summaries without manual spreadsheet merging
- a grade manager cannot read or export data outside the cohort assigned to that account
- archived historical cohorts remain editable and exportable in the archive center while staying hidden from the main active-student front-end
- users without export permission cannot export sensitive personal data
- teachers can submit and track their own repair, printing, and configured daily applications
- printing applications cannot be submitted without material type, print mode, paper size, and print quantity
- users without matching approval responsibility cannot approve an application

## Constraints

- Time limit: not fixed yet, but version 1 should be scoped for rapid delivery
- Budget limit: prefer a low-ops, single-codebase solution
- Deployment environment: school intranet, private cloud, or private server; the current trial assumes a school-controlled PostgreSQL deployment inside the school network
- Required integrations: spreadsheet import and export in `xlsx` and `csv`
- Security constraints: teacher and student data is sensitive and requires role-based access and auditability
- Preferred ecosystem: simple full-stack web application with low maintenance cost

## Acceptance Examples

### Example 1: Import Student Roster

- Given: a data manager has a valid student import template
- When: the file is uploaded and validated
- Then: valid rows are stored, invalid rows are reported clearly, and the imported students are immediately searchable

### Example 2: Export Teacher List

- Given: a user with export permission filters teachers by department and subject
- When: the user requests an export
- Then: the system generates an `xlsx` or `csv` file containing the filtered result set only

### Example 3: Export Inspection Summary

- Given: inspection staff has recorded daily student or teacher quantification results for a month
- When: a leader filters by time range plus the relevant grade, class, or teacher scope
- Then: the system displays aggregated results and allows exporting that summary without manual spreadsheet work

### Example 4: Grade-Scoped Student Export

- Given: a grade manager account is bound to the `2025级` cohort
- When: the user filters students or inspection data
- Then: only `2025级` cohort data is returned, and attempts to read or export other cohorts are rejected by the server

### Example 5: Adjust Grade Class Count

- Given: a new class needs to be opened in `2025级`
- When: an authorized admin adds a new class under the `2025级` structure entry
- Then: the class becomes selectable immediately in later student and inspection workflows

### Example 6: Rename A Department

- Given: the school changes a department name
- When: an authorized admin renames the department in the structure management page
- Then: later teacher maintenance and filtering use the updated department name without requiring code changes

### Example 7: Start The Next Cohort Rollover

- Given: the active front-end currently shows `2022级`, `2023级`, and `2024级` as the active cohorts
- When: an authorized admin starts the next cohort rollover
- Then: a new `2025级` cohort is created, `2023级`, `2024级`, and `2025级` remain active, and `2022级` becomes an archived cohort displayed as `2022级入学 / 2025届毕业`

### Example 8: Manage Alumni Archive

- Given: an older cohort has been archived and is displayed as `2022级入学 / 2025届毕业`
- When: an authorized user opens the alumni archive center
- Then: the archived students can still be filtered, edited, imported, and exported there, but they do not appear in the default active student page

## Open Questions

- Which personal information fields are mandatory, and which should remain optional?
- Does version 1 need masked display for phone numbers or identity-related fields?
- Does the school need reusable saved export templates, or is ad hoc filtering enough for version 1?

## Notes For AI

- Treat this as an internal back-office system, not a public consumer product.
- Optimize for data accuracy, filtering, exportability, and permission boundaries over flashy UI.
- Avoid adding extra subsystems until the teacher or student data module and the inspection module are both usable.
- If a schema change affects school structure, personal information scope, or inspection granularity, update this PRD before coding.
- Routine inspection is now explicitly split into student quantification and teacher quantification. Teacher quantification belongs to individual teachers rather than classes.
