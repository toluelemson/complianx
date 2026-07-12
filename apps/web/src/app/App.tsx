import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import LandingPage from '@/domains/marketing/pages/LandingPage';
import { ProtectedRoute } from '@/app/routing/ProtectedRoute';

const LoginPage = lazy(() => import('@/domains/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('@/domains/auth/pages/SignupPage'));
const ForgotPasswordPage = lazy(
  () => import('@/domains/auth/pages/ForgotPasswordPage'),
);
const ResetPasswordPage = lazy(
  () => import('@/domains/auth/pages/ResetPasswordPage'),
);
const VerifyEmailPage = lazy(
  () => import('@/domains/auth/pages/VerifyEmailPage'),
);
const ContactPage = lazy(() => import('@/domains/marketing/pages/ContactPage'));
const SubmitSystemPage = lazy(
  () => import('@/domains/ai-systems/pages/SubmitSystemPage'),
);
const LoanApprovalDemoPage = lazy(
  () => import('@/domains/assessments/pages/LoanApprovalDemoPage'),
);
const EuAiActGeneratorDemoPage = lazy(
  () => import('@/domains/reports/pages/EuAiActGeneratorDemoPage'),
);
const PublicEuAiActCheckerPage = lazy(
  () => import('@/domains/regulatory-frameworks/pages/PublicEuAiActCheckerPage'),
);
const PublicEuAiActResultPage = lazy(
  () => import('@/domains/regulatory-frameworks/pages/PublicEuAiActResultPage'),
);
const DashboardPage = lazy(
  () => import('@/domains/ai-systems/pages/DashboardPage'),
);
const ProjectPage = lazy(() => import('@/domains/ai-systems/pages/ProjectPage'));
const ProjectTrustPage = lazy(
  () => import('@/domains/assessments/pages/ProjectTrustPage'),
);
const RoleManagerPage = lazy(
  () => import('@/domains/organizations/pages/RoleManagerPage'),
);
const CompanyPage = lazy(
  () => import('@/domains/organizations/pages/CompanyPage'),
);
const BillingStatusPage = lazy(
  () => import('@/domains/billing/pages/BillingStatusPage'),
);
const BillingLandingPage = lazy(
  () => import('@/domains/billing/pages/BillingLandingPage'),
);
const ProfilePage = lazy(() => import('@/domains/auth/pages/ProfilePage'));

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c10]" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/submit-system" element={<SubmitSystemPage />} />
        <Route
          path="/demo/loan-approval-ai"
          element={<LoanApprovalDemoPage />}
        />
        <Route
          path="/demo/eu-ai-act-report"
          element={
            <ProtectedRoute>
              <EuAiActGeneratorDemoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eu-ai-act-checker"
          element={<PublicEuAiActCheckerPage />}
        />
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
    </Suspense>
  );
}

export default App;
