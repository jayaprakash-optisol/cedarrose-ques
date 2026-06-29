import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";
import { env } from "@/config/env";
import { hasAppSelected } from "@/lib/app-selection";

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const CompleteRegistrationPage = lazy(() => import("@/features/auth/pages/CompleteRegistrationPage"));
const SelectAppPage = lazy(() => import("@/features/auth/pages/SelectAppPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const CasesPage = lazy(() => import("@/features/cases/pages/CasesPage"));
const NewRequestPage = lazy(() => import("@/features/new-request/pages/NewRequestPage"));
const AuditLogPage = lazy(() => import("@/features/audit-log/pages/AuditLogPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const FormBuilderPage = lazy(() => import("@/features/admin/form-builder/pages/FormBuilderPage"));
const ConfigurationPage = lazy(() => import("@/features/admin/configuration/pages/ConfigurationPage"));
const UsersPage = lazy(() => import("@/features/admin/users/pages/UsersPage"));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AuthGuard() {
  const { user, isLoading, isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (env.useMock) return <Outlet />;

  if (isBootstrapping || isLoading) return <PageLoader />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function AppSelectedGuard() {
  const location = useLocation();
  if (!hasAppSelected()) {
    return <Navigate to="/select-app" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function AdminGuard() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <LazyPage>
        <LoginPage />
      </LazyPage>
    ),
  },
  {
    path: "/complete-registration",
    element: (
      <LazyPage>
        <CompleteRegistrationPage />
      </LazyPage>
    ),
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: "/select-app",
        element: (
          <LazyPage>
            <SelectAppPage />
          </LazyPage>
        ),
      },
      {
        element: <AppSelectedGuard />,
        children: [
      {
        path: "/",
        element: (
          <LazyPage>
            <DashboardPage />
          </LazyPage>
        ),
      },
      {
        path: "/cases",
        element: (
          <LazyPage>
            <CasesPage />
          </LazyPage>
        ),
      },
      {
        path: "/new-request",
        element: (
          <LazyPage>
            <NewRequestPage />
          </LazyPage>
        ),
      },
      {
        path: "/audit-log",
        element: (
          <LazyPage>
            <AuditLogPage />
          </LazyPage>
        ),
      },
      {
        path: "/settings",
        element: (
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        ),
      },
      {
        path: "/admin",
        element: <AdminGuard />,
        children: [
          {
            path: "form-builder",
            element: (
              <LazyPage>
                <FormBuilderPage />
              </LazyPage>
            ),
          },
          {
            path: "configuration",
            element: (
              <LazyPage>
                <ConfigurationPage />
              </LazyPage>
            ),
          },
          {
            path: "users",
            element: (
              <LazyPage>
                <UsersPage />
              </LazyPage>
            ),
          },
        ],
      },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
