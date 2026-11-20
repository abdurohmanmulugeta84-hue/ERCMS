"""
Serializers for the accounts app.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Role

User = get_user_model()

# Roles that require Administrator approval before the account becomes active
ROLES_REQUIRING_APPROVAL = {Role.ORGANIZER, Role.TREASURER, Role.AUDITOR}


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Handles self-registration.

    - Members: account is immediately active.
    - Organizer / Treasurer / Auditor: account is created with is_active=False
      pending Administrator review.
    - Administrator: cannot be created via the public registration endpoint.
    """

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "username", "email", "first_name", "last_name",
            "phone", "role", "password", "password_confirm",
        ]
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
            "email": {"required": True},
        }

    def validate_role(self, value):
        if value == Role.ADMIN:
            raise serializers.ValidationError(
                "Administrator accounts cannot be created through public registration."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        role = validated_data.get("role", Role.MEMBER)

        # Staff roles start inactive until an Administrator approves them
        is_active = role not in ROLES_REQUIRING_APPROVAL

        user = User(**validated_data)
        user.set_password(password)
        user.is_active = is_active
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for reading and updating the authenticated user's own profile."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "phone", "role", "role_display", "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "username", "role", "is_active", "date_joined"]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_role_display(self, obj):
        return obj.get_role_display()


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for Administrators managing user accounts.
    Allows role and is_active to be modified.
    """

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "phone", "role", "is_active", "date_joined",
        ]
        read_only_fields = ["id", "username", "date_joined"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class ChangePasswordSerializer(serializers.Serializer):
    """Allows an authenticated user to change their own password."""

    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs
