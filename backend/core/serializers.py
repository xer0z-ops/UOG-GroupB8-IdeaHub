from rest_framework import serializers

from core.models import Status


class StatusSerializer(serializers.ModelSerializer):
    entity_type_display = serializers.CharField(
        source='get_entity_type_display',
        read_only=True,
    )

    class Meta:
        model = Status
        fields = (
            'id',
            'name',
            'entity_type',
            'entity_type_display',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'entity_type_display',
            'created_at',
            'updated_at',
        )