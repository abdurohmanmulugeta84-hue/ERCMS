"""
Authentication and user management views.

Endpoints:
  POST   /api/auth/register/        — public registration
  POST   /api/auth/login/            — session login
  POST   /api/auth/logout/           — session logout
  GET    /api/auth/me/               — return authenticated user profile
  PATCH  /api/auth/me/               — update own profile (name, phone)
  POST   /api/auth/change-password/  — change own password
  GET    /api/auth/users/            — list all users (Admin only)
  PATCH  /api/auth/users/<pk>/       — update user role / is_active (Admin only)
"""
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdministrator
from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()


class RegistrationView(APIView):
    """Public endpoint for creating a new account."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user.is_active:
                message = "Account created successfully. You can now log in."
            else:
                message = (
                    "Account created. Your account requires Administrator approval "
                    "before you can log in. You will be notified when it is activated."
                )
            return Response(
                {"detail": message, "username": user.username, "role": user.role},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginView(APIView):
    """
    Session-based login.
    The @ensure_csrf_cookie decorator guarantees the csrftoken cookie is
    set on the response so the React client can read it for subsequent
    mutating requests.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if a user with that username exists but is inactive first,
        # so we can return a helpful message (Django's authenticate() returns
        # None for both wrong password and inactive account).
        try:
            candidate = User.objects.get(username=username)
            if not candidate.is_active:
                return Response(
                    {"detail": "Your account has not been activated yet. Please contact an Administrator."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except User.DoesNotExist:
            pass

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials. Please check your username and password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Flushes the server-side session."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET  — return the authenticated user's profile.
    PATCH — update own first_name, last_name, phone.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Allows an authenticated user to change their own password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": "Incorrect current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        # Keep the session alive after password change
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user)
        return Response({"detail": "Password changed successfully."})


class UserListView(APIView):
    """List all users. Administrator only."""

    permission_classes = [IsAuthenticated, IsAdministrator]

    def get(self, request):
        users = User.objects.all().order_by("last_name", "first_name")
        serializer = AdminUserSerializer(users, many=True)
        return Response(serializer.data)


class UserDetailView(APIView):
    """Retrieve or update a single user. Administrator only."""

    permission_classes = [IsAuthenticated, IsAdministrator]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
