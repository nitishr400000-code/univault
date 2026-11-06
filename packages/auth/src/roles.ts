import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const userRoles = ["student", "staff", "system_admin"] as const;

export type UserRole = (typeof userRoles)[number];

export const authAccessControl = createAccessControl(defaultStatements);

export const studentRole = authAccessControl.newRole({});
export const staffRole = authAccessControl.newRole({});
export const systemAdminRole = authAccessControl.newRole({
  ...adminAc.statements,
});

export const authRoles = {
  staff: staffRole,
  student: studentRole,
  system_admin: systemAdminRole,
};
