import { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import useAuth from './hooks/useAuth'
import { extractRoleFromToken } from './utils/auth'
import { getDefaultDashboardPath, ROLES } from './constants/roles'

import LoginPage from './pages/auth/LoginPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import AcademicYearPage from './pages/admin/AcademicYearPage'
import DepartmentPage from './pages/admin/DepartmentPage'
import SystemAnalyticsPage from './pages/admin/SystemAnalyticsPage'
import AllIdeasPage from './pages/qa_manager/AllIdeasPage'
import IdeasListPage from './pages/staff/IdeasListPage'
import DepartmentIdeasPage from './pages/qa_coordinator/DepartmentIdeasPage'
import EngagementPage from './pages/qa_coordinator/EngagementPage'
import DepartmentUserPage from './pages/qa_coordinator/DepartmentUserPage'
import CategoryManagementPage from './pages/qa_manager/CategoryManagementPage'
import UserModerationPage from './pages/qa_manager/UserModerationPage'
import DataExportPage from './pages/qa_manager/DataExportPage'
import ReportsPage from './pages/qa_manager/ReportsPage'
import CoordinatorReportsPage from './pages/qa_coordinator/ReportsPage'
import MainLayout from './layouts/MainLayout'
// import IdeasListPage from './pages/staff/IdeasListPage'
import StaffTermsPage from './pages/staff/StaffTermsPage'
import { fetchStaffIdeas, fetchMyIdeas } from './services/staffIdeaService'

function App() {
  const { accessToken, isAuthenticated } = useAuth()

  const roleValue = useMemo(() => {
    if (!accessToken) return null
    return extractRoleFromToken(accessToken)
  }, [accessToken])

  const effectiveRoleValue = roleValue ?? ROLES.ADMIN
  const defaultDashboardPath = getDefaultDashboardPath(effectiveRoleValue)

  // console.log(effectiveRoleValue)

  const renderProtectedRoute = (element, allowedRoles) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (allowedRoles?.length && !allowedRoles.includes(effectiveRoleValue)) {
      return <Navigate to={defaultDashboardPath} replace />
    }

    return element
  }

  return (
    <Routes>
      {/* Admin routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={defaultDashboardPath} replace /> : <LoginPage />}
      />

      <Route
        path="/admin"
        element={renderProtectedRoute(
          <UserManagementPage  roleValue={roleValue} />,
          [ROLES.ADMIN, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/academic-years"
        element={renderProtectedRoute(
          <AcademicYearPage/>,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/departments"
        element={renderProtectedRoute(
          <DepartmentPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />
      <Route
        path="/system-analytics"
        element={renderProtectedRoute(
          <SystemAnalyticsPage />,
          [ROLES.ADMIN],
        )}
      />
      {/* Admin routes end */}
      
      {/* QA manager routes */}
      <Route
        path="/all-ideas"
        element={renderProtectedRoute(
          <AllIdeasPage />,
          [ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/manage-categories"
        element={renderProtectedRoute(
          <CategoryManagementPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/user-moderation"
        element={renderProtectedRoute(
          <UserModerationPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/data-export"
        element={renderProtectedRoute(
          <DataExportPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/reports"
        element={renderProtectedRoute(
          roleValue === ROLES.QA_COORDINATOR ? <CoordinatorReportsPage /> : <ReportsPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />
      {/* QA manager routes end */}

      {/* QA coordinator routes */}
      <Route
        path="/department-ideas"
        element={renderProtectedRoute(
          <DepartmentIdeasPage />,
          [ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/department-users"
        element={renderProtectedRoute(
          <DepartmentUserPage />,
          [ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/engagement"
        element={renderProtectedRoute(
          <EngagementPage />,
          [ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/manage-categories"
        element={renderProtectedRoute(
          <CategoryManagementPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/user-moderation"
        element={renderProtectedRoute(
          <UserModerationPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/data-export"
        element={renderProtectedRoute(
          <DataExportPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />

      <Route
        path="/reports"
        element={renderProtectedRoute(
          <ReportsPage />,
          [ROLES.ADMIN, ROLES.QA_MANAGER, ROLES.QA_COORDINATOR],
        )}
      />
      {/* QA coordinator routes end */}
      
      {/* Admin route */}
      <Route
        path="/staff"
        element={renderProtectedRoute(
          <MainLayout><IdeasListPage fetchFn={fetchStaffIdeas} /></MainLayout>,
          [ROLES.STAFF],
        )}
      />

      <Route
        path="/staff/my-ideas"
        element={renderProtectedRoute(
          <MainLayout><IdeasListPage fetchFn={fetchMyIdeas} /></MainLayout>,
          [ROLES.STAFF],
        )}
      />

      <Route
        path="/staff/terms"
        element={renderProtectedRoute(
          <MainLayout><StaffTermsPage /></MainLayout>,
          [ROLES.STAFF],
        )}
      />
      {/* Admin route end  */}

      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? defaultDashboardPath : '/login'} replace />}
      />

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? defaultDashboardPath : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
