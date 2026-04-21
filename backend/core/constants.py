from enum import StrEnum


class RoleName(StrEnum):
    """Role name constants matching the `name` column in the roles table."""
    ADMIN = 'admin'
    QA_MANAGER = 'qa_manager'
    QA_COORDINATOR = 'qa_coordinator'
    STAFF = 'staff'


class StatusName(StrEnum):
    """Status name constants matching the `name` column in the statuses table."""
    ACTIVE = 'active'
    HIDDEN = 'hidden'
    DISABLED = 'disabled'


class ErrorCode(StrEnum):
    """
    Centralised error/success code registry.

    Naming convention: {http_status}.{module}.{sequence}
      - http_status : the HTTP status code most associated with this outcome
      - module      : lowercase module name (generic, reports, …)
      - sequence    : zero-padded 3-digit index within that module/status group

    All codes are stored in the error_codes table (columns: code, message).
    At runtime, core.responses._get_message() looks up the human-readable
    message by code so that messages can be changed in the DB without a
    code deployment.
    """

    # ====================   Generic Error codes ===========================
    GENERIC_SUCCESS = "200.generic.001"
    GENERIC_INTERNAL_SERVER_ERROR = "500.generic.001"

    # ========================== Module Error codes =============================
    # reports
    REPORTS_FORBIDDEN = "403.reports.001"
    REPORTS_INVALID_TYPE = "400.reports.001"
    REPORTS_SUCCESS = "200.reports.001"
    REPORTS_MISSING_ACADEMIC_YEAR = "400.reports.002"
    REPORTS_ZIP_NOT_READY = "404.reports.001"

    # ---- authentication ------------------------------------------------------
    AUTH_EMAIL_REQUIRED = "400.auth.001"
    AUTH_EMAIL_NOT_FOUND = "404.auth.001"
    AUTH_ACCOUNT_DISABLED = "401.auth.001"
    AUTH_WRONG_PASSWORD = "401.auth.002"
    AUTH_REFRESH_TOKEN_REQUIRED = "400.auth.002"
    AUTH_REFRESH_TOKEN_EXPIRED = "401.auth.003"
    AUTH_REFRESH_TOKEN_INVALID = "401.auth.004"
    AUTH_TOKEN_TYPE_INVALID = "401.auth.005"
    AUTH_USER_NOT_FOUND = "401.auth.006"
    AUTH_PASSWORD_FIELDS_REQUIRED = "400.auth.003"
    AUTH_PASSWORDS_DO_NOT_MATCH = "400.auth.004"
    AUTH_CURRENT_PASSWORD_INCORRECT = "400.auth.005"
    AUTH_PASSWORD_TOO_WEAK = "400.auth.007"
    AUTH_NEW_PASSWORD_SAME_AS_CURRENT = "400.auth.008"
    AUTH_FORGOT_PASSWORD_NON_ADMIN = "403.auth.001"
    AUTH_RESET_USER_ID_REQUIRED = "400.auth.006"
    AUTH_RESET_USER_NOT_FOUND = "404.auth.002"
    AUTH_LOGIN_SUCCESS = "200.auth.001"
    AUTH_TOKEN_REFRESHED = "200.auth.002"
    AUTH_PROFILE_FETCHED = "200.auth.003"
    AUTH_PASSWORD_CHANGED = "200.auth.004"
    AUTH_FORGOT_PASSWORD_SENT = "200.auth.005"
    AUTH_PASSWORD_RESET = "200.auth.006"
    AUTH_INTERNAL_ERROR = "500.auth.001"

    # ---- departments ---------------------------------------------------------
    DEPARTMENT_NOT_FOUND = "404.department.001"
    DEPARTMENT_DELETE_IN_USE = "400.department.001"
    DEPARTMENT_INVALID_DATA = "400.department.002"
    DEPARTMENT_CREATED = "201.department.001"
    DEPARTMENT_FETCHED = "200.department.001"
    DEPARTMENT_FETCHED_LIST = "200.department.002"
    DEPARTMENT_UPDATED = "200.department.003"
    DEPARTMENT_DELETED = "200.department.004"
    DEPARTMENT_INTERNAL_ERROR = "500.department.001"

    # ---- academic years ------------------------------------------------------
    ACADEMIC_YEAR_NOT_FOUND = "404.academic_year.001"
    ACADEMIC_YEAR_INVALID_DATA = "400.academic_year.001"
    ACADEMIC_YEAR_CREATED = "201.academic_year.001"
    ACADEMIC_YEAR_FETCHED = "200.academic_year.001"
    ACADEMIC_YEAR_FETCHED_LIST = "200.academic_year.002"
    ACADEMIC_YEAR_UPDATED = "200.academic_year.003"
    ACADEMIC_YEAR_DELETED = "200.academic_year.004"
    ACADEMIC_YEAR_INTERNAL_ERROR = "500.academic_year.001"

    # ---- categories ----------------------------------------------------------
    CATEGORY_FORBIDDEN_VIEW = "403.category.001"
    CATEGORY_FORBIDDEN_CREATE = "403.category.002"
    CATEGORY_FORBIDDEN_UPDATE = "403.category.003"
    CATEGORY_FORBIDDEN_DELETE = "403.category.004"
    CATEGORY_NOT_FOUND = "404.category.001"
    CATEGORY_DELETE_ASSIGNED = "400.category.001"
    CATEGORY_INVALID_DATA = "400.category.002"
    CATEGORY_CREATED = "201.category.001"
    CATEGORY_FETCHED = "200.category.001"
    CATEGORY_FETCHED_LIST = "200.category.002"
    CATEGORY_UPDATED = "200.category.003"
    CATEGORY_DELETED = "200.category.004"
    CATEGORY_INTERNAL_ERROR = "500.category.001"

    # ---- ideas ---------------------------------------------------------------
    IDEA_FORBIDDEN_VIEW = "403.idea.001"
    IDEA_FORBIDDEN_CREATE = "403.idea.002"
    IDEA_FORBIDDEN_UPDATE = "403.idea.003"
    IDEA_FORBIDDEN_DELETE = "403.idea.004"
    IDEA_FORBIDDEN_REACT = "403.idea.005"
    IDEA_FORBIDDEN_STATUS = "403.idea.006"
    IDEA_FINAL_CLOSURE_PASSED = "403.idea.007"
    IDEA_NOT_FOUND = "404.idea.001"
    IDEA_INVALID_DATA = "400.idea.001"
    IDEA_INVALID_VOTE_TYPE = "400.idea.002"
    IDEA_CANNOT_REPORT_OWN = "400.idea.003"
    IDEA_REPORT_REASON_REQUIRED = "400.idea.004"
    IDEA_WRONG_ACADEMIC_YEAR = "400.idea.005"
    IDEA_CREATED = "201.idea.001"
    IDEA_FETCHED = "200.idea.001"
    IDEA_FETCHED_LIST = "200.idea.002"
    IDEA_FETCHED_MY_LIST = "200.idea.009"
    IDEA_UPDATED = "200.idea.003"
    IDEA_DELETED = "200.idea.004"
    IDEA_STATUS_UPDATED = "200.idea.005"
    IDEA_REACTED = "200.idea.006"
    IDEA_REACTION_REMOVED = "200.idea.007"
    IDEA_REPORTED = "201.idea.002"
    IDEA_REPORTS_FETCHED = "200.idea.008"
    IDEA_INTERNAL_ERROR = "500.idea.001"

    # ---- comments ------------------------------------------------------------
    COMMENT_FORBIDDEN_CREATE = "403.comment.001"
    COMMENT_FORBIDDEN_STATUS = "403.comment.002"
    COMMENT_FORBIDDEN_DELETE = "403.comment.003"
    COMMENT_FORBIDDEN_UPDATE = "403.comment.004"
    COMMENT_NOT_FOUND = "404.comment.001"
    COMMENT_INVALID_DATA = "400.comment.001"
    COMMENT_CREATED = "201.comment.001"
    COMMENT_FETCHED_LIST = "200.comment.001"
    COMMENT_STATUS_UPDATED = "200.comment.002"
    COMMENT_DELETED = "200.comment.003"
    COMMENT_UPDATED = "200.comment.004"
    COMMENT_INTERNAL_ERROR = "500.comment.001"

    # ---- documents -----------------------------------------------------------
    DOCUMENT_FORBIDDEN_VIEW = "403.document.001"
    DOCUMENT_FORBIDDEN_MANAGE = "403.document.002"
    DOCUMENT_NOT_FOUND = "404.document.001"
    DOCUMENT_INVALID_DATA = "400.document.001"
    DOCUMENT_UPLOADED = "200.document.001"
    DOCUMENT_DELETED = "200.document.002"
    DOCUMENT_INTERNAL_ERROR = "500.document.001"

    # ---- department notify ---------------------------------------------------
    NOTIFY_FORBIDDEN_DEPARTMENT = "403.notify.001"
    NOTIFY_FORBIDDEN_IDEA_DEPARTMENT = "403.notify.002"
    NOTIFY_NO_RECIPIENTS = "404.notify.001"
    NOTIFY_INVALID_DATA = "400.notify.001"
    NOTIFY_SENT = "200.notify.001"

    # ---- users ---------------------------------------------------------------
    USER_NOT_FOUND = "404.user.001"
    USER_INVALID_DATA = "400.user.001"
    USER_CREATED = "201.user.001"
    USER_FETCHED = "200.user.001"
    USER_FETCHED_LIST = "200.user.002"
    USER_UPDATED = "200.user.003"
    USER_DELETED = "200.user.004"
    USER_INTERNAL_ERROR = "500.user.001"

