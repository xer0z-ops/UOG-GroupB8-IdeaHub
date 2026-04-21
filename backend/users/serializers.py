from rest_framework import serializers

from core.constants import RoleName, StatusName
from core.models import Status
from organization.models import Department
from .models import Role, User


class UserRegisterSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        source='department',
        queryset=Department.objects.all(),
        write_only=True,
    )
    role = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Role.objects.all(),
        write_only=True,
    )
    status_id = serializers.PrimaryKeyRelatedField(
        source='status',
        queryset=Status.objects.filter(entity_type=Status.ENTITY_USER),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            'full_name',
            'email',
            'department_id',
            'role',
            'status_id',
        )

    def validate(self, attrs):
        role = attrs.get('role')
        department = attrs.get('department')

        if role and department and role.name == RoleName.QA_COORDINATOR:
            already_exists = User.objects.filter(
                role__name=RoleName.QA_COORDINATOR,
                department=department,
                deleted_at__isnull=True,
            ).exists()
            if already_exists:
                raise serializers.ValidationError({
                    'department_id': 'A QA Coordinator is already assigned to this department.',
                })

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({
                'password': 'A password must be provided programmatically.'
            })

        if validated_data.get('status') is None:
            default_status = self._get_default_status()
            if not default_status:
                raise serializers.ValidationError({
                    'status_id': 'Active status for users is not configured.'
                })
            validated_data['status'] = default_status

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )
        return user

    @staticmethod
    def _get_default_status():
        return Status.objects.filter(
            entity_type=Status.ENTITY_USER,
            name__iexact=StatusName.ACTIVE
        ).first()


class UserSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'full_name',
            'email',
            'department',
            'role',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_department(self, obj):
        if not obj.department_id:
            return None
        return {'id': obj.department_id, 'name': obj.department_name}

    def get_role(self, obj):
        if not obj.role_id:
            return None
        return {'id': obj.role_id, 'name': obj.role_name, 'description': obj.role.description}

    def get_status(self, obj):
        if not obj.status_id:
            return None
        return {'id': obj.status_id, 'name': obj.status_name, 'description': obj.status.description}


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        source='department',
        queryset=Department.objects.all(),
        write_only=True,
        required=False,
    )
    role = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Role.objects.all(),
        write_only=True,
        required=False,
    )
    status = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Status.objects.filter(entity_type=Status.ENTITY_USER),
        write_only=True,
        required=False,
    )
    status_id = serializers.IntegerField(
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            'full_name',
            'email',
            'department_id',
            'role',
            'status',
            'status_id',
        )

    def validate(self, attrs):
        status = attrs.pop('status', None)
        status_id = attrs.pop('status_id', None)

        if status is not None and status_id is not None:
            raise serializers.ValidationError({
                'status': 'Provide either status or status_id, not both.',
                'status_id': 'Provide either status or status_id, not both.',
            })

        if status is not None:
            attrs['status'] = status
            return attrs

        if status_id is not None:
            status_obj = Status.objects.filter(
                id=status_id,
                entity_type=Status.ENTITY_USER,
            ).first()
            if not status_obj:
                raise serializers.ValidationError({
                    'status_id': 'Invalid status_id for user.',
                })
            attrs['status'] = status_obj

        return attrs
        