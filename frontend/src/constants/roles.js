
export const ROLES = {
  ADMIN: 'admin',
  QA_MANAGER: 'qa_manager',
  QA_COORDINATOR: 'qa_coordinator',
  STAFF: 'staff',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.QA_MANAGER]: 'QA Manager',
  [ROLES.QA_COORDINATOR]: 'QA Coordinator',
  [ROLES.STAFF]: 'Staff',
};

export const ROLE_OPTIONS = [
  // { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  // { value: ROLES.QA_MANAGER, label: ROLE_LABELS[ROLES.QA_MANAGER] },
  { value: ROLES.QA_COORDINATOR, label: ROLE_LABELS[ROLES.QA_COORDINATOR] },
  { value: ROLES.STAFF, label: ROLE_LABELS[ROLES.STAFF] },
];

export const ADMINISTRATIVE_ROLES = [ROLES.ADMIN];

export const ALL_ROLES = Object.values(ROLES);

export const getRoleLabel = (roleValue) => ROLE_LABELS[roleValue] ?? roleValue;

export const isAdministrativeRole = (roleValue) => ADMINISTRATIVE_ROLES.includes(roleValue);


export const getDefaultDashboardPath = (roleValue) => {
  switch (roleValue) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.QA_COORDINATOR:
      return "/department-ideas";
    case ROLES.QA_MANAGER:
      return "/all-ideas";
    case ROLES.STAFF:
      return "/staff";
    default:
      return "/admin";
  }
};
