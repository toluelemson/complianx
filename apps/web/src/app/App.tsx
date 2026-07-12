import { Route, Routes } from 'react-router-dom';
import LandingPage from '@/domains/marketing/pages/LandingPage';
import LoginPage from '@/domains/auth/pages/LoginPage';
import SignupPage from '@/domains/auth/pages/SignupPage';
import ForgotPasswordPage from '@/domains/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/domains/auth/pages/ResetPasswordPage';
import VerifyEmailPage from '@/domains/auth/pages/VerifyEmailPage';
import ContactPage from '@/domains/marketing/pages/ContactPage';
import SubmitSystemPage from '@/domains/ai-systems/pages/SubmitSystemPage';
import LoanApprovalDemoPage from '@/domains/assessments/pages/LoanApprovalDemoPage';
import EuAiActGeneratorDemoPage from '@/domains/reports/pages/EuAiActGeneratorDemoPage';
import PublicEuAiActCheckerPage from '@/domains/regulatory-frameworks/pages/PublicEuAiActCheckerPage';
import PublicEuAiActResultPage from '@/domains/regulatory-frameworks/pages/PublicEuAiActResultPage';
import DashboardPage from '@/domains/ai-systems/pages/DashboardPage';
import ProjectPage from '@/domains/ai-systems/pages/ProjectPage';
import ProjectTrustPage from '@/domains/assessments/pages/ProjectTrustPage';
import RoleManagerPage from '@/domains/organizations/pages/RoleManagerPage';
import CompanyPage from '@/domains/organizations/pages/CompanyPage';
import BillingStatusPage from '@/domains/billing/pages/BillingStatusPage';
import BillingLandingPage from '@/domains/billing/pages/BillingLandingPage';
import ProfilePage from '@/domains/auth/pages/ProfilePage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/submit-system" element={<SubmitSystemPage />} />
      <Route path="/demo/loan-approval-ai" element={<LoanApprovalDemoPage />} />
      <Route
        path="/demo/eu-ai-act-report"
        element={
          <ProtectedRoute>
            <EuAiActGeneratorDemoPage />
          </ProtectedRoute>
        }
      />
      <Route path="/eu-ai-act-checker" element={<PublicEuAiActCheckerPage />} />
      <Route
        path="/eu-ai-act-checker/results/:resultId"
        element={<PublicEuAiActResultPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/trust"
        element={
          <ProtectedRoute>
            <ProjectTrustPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <RoleManagerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company"
        element={
          <ProtectedRoute>
            <CompanyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/success"
        element={
          <ProtectedRoute>
            <BillingStatusPage variant="success" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/cancel"
        element={
          <ProtectedRoute>
            <BillingStatusPage variant="cancel" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingLandingPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
