from datetime import datetime, time

from django.utils import timezone
from rest_framework import serializers

from .models import AcademicYear, Department


class DepartmentSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()
    idea_count = serializers.SerializerMethodField()
    qa_coordinator = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = (
            'id',
            'name',
            'is_system_defined',
            'staff_count',
            'idea_count',
            'qa_coordinator',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
        )
        read_only_fields = (
            'id',
            'is_system_defined',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
        )

    def get_staff_count(self, obj):
        return getattr(obj, 'staff_count', 0)

    def get_idea_count(self, obj):
        return getattr(obj, 'idea_count', 0)

    def get_qa_coordinator(self, obj):
        coordinators = getattr(obj, 'qa_coordinators', None)
        if not coordinators:
            return None
        coordinator = coordinators[0]
        return {
            'id': coordinator.id,
            'full_name': coordinator.full_name,
            'email': coordinator.email,
        }


class DepartmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = (
            'name',
            'created_by',
            'updated_by',
        )


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = (
            'id',
            'name',
            'start_date',
            'end_date',
            'idea_closure_date',
            'final_closure_date',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
        )
        read_only_fields = fields


class AcademicYearWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = (
            'name',
            'start_date',
            'end_date',
            'idea_closure_date',
            'final_closure_date',
            'created_by',
            'updated_by',
        )

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        idea_closure_date = attrs.get('idea_closure_date', getattr(self.instance, 'idea_closure_date', None))
        final_closure_date = attrs.get('final_closure_date', getattr(self.instance, 'final_closure_date', None))

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'start_date': 'start_date should not be larger than end_date.'
            })

        if idea_closure_date and final_closure_date and idea_closure_date > final_closure_date:
            raise serializers.ValidationError({
                'idea_closure_date': 'idea_closure_date should not be larger than final_closure_date.'
            })

        if start_date and end_date and idea_closure_date:
            start_dt = datetime.combine(start_date, time.min)
            end_dt = datetime.combine(end_date, time.max)
            if timezone.is_aware(idea_closure_date):
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
            if not (start_dt <= idea_closure_date <= end_dt):
                raise serializers.ValidationError({
                    'idea_closure_date': 'idea_closure_date should be between start_date and end_date.'
                })

        if start_date and end_date and final_closure_date:
            start_dt = datetime.combine(start_date, time.min)
            end_dt = datetime.combine(end_date, time.max)
            if timezone.is_aware(final_closure_date):
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
            if not (start_dt <= final_closure_date <= end_dt):
                raise serializers.ValidationError({
                    'final_closure_date': 'final_closure_date should be between start_date and end_date.'
                })

        return attrs
        