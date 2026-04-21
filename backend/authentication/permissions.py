from rest_framework.permissions import BasePermission

from core.constants import RoleName


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        authenticator = getattr(request, 'successful_authenticator', None)
        return bool(
            authenticator
            and user
            and getattr(user, 'is_authenticated', False)
        )


class HasRole(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False

        return getattr(user, 'role_name', None) in self.allowed_roles


class IsAdmin(HasRole):
    allowed_roles = [RoleName.ADMIN]

class IsAdminOrQAManager(HasRole):
    allowed_roles = [RoleName.ADMIN, RoleName.QA_MANAGER]

class IsQA_Manager(HasRole):
    allowed_roles = [RoleName.QA_MANAGER]

class IsQA_COORDINATOR(HasRole):
    allowed_roles = [RoleName.QA_COORDINATOR]
    
class IsStaff(HasRole):
    allowed_roles = [RoleName.STAFF]
    