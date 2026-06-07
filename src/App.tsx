import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import LoginPage from './domains/auth/pages/LoginPage';
import RegisterPage from './domains/auth/pages/RegisterPage';
import UserAgreementPage from './domains/auth/pages/UserAgreementPage';
import DashboardPage from './domains/dashboard/pages/DashboardPage';
import PatientsListPage from './domains/patients/pages/PatientsListPage';
import PatientDetailsPage from './domains/patients/pages/PatientDetailsPage';
import NewPatientPage from './domains/patients/pages/NewPatientPage';
import SlimNewPatientPage from './domains/patients/pages/SlimNewPatientPage';
import ClinicalEncounterPage from './domains/clinical/pages/ClinicalEncounterPage';
import FollowUpEncounterPage from './domains/clinical/pages/FollowUpEncounterPage';
import EnhancedFollowUpPage from './domains/clinical/pages/EnhancedFollowUpPage';
import PatientClinicalSummaryPage from './domains/clinical/pages/PatientClinicalSummaryPage';
import VitalsPage from './domains/clinical/pages/VitalsPage';
import MDTPage from './domains/clinical/pages/MDTPage';
import BloodTransfusionPage from './domains/clinical/pages/BloodTransfusionPage';
import ReferralPage from './domains/clinical/pages/ReferralPage';
import TreatmentPlanPage from './domains/clinical/pages/TreatmentPlanPage';
import TreatmentPlanningDashboardPage from './domains/treatment-planning/pages/TreatmentPlanningDashboardPage';
import NewTreatmentPlanPage from './domains/treatment-planning/pages/NewTreatmentPlanPage';
import TreatmentPlanDetailPage from './domains/treatment-planning/pages/TreatmentPlanDetailPage';
import SurgeryListPage from './domains/surgery/pages/SurgeryListPage';
import SurgeryPlanningPage from './domains/surgery/pages/SurgeryPlanningPage';
import PreoperativeAssessmentPage from './domains/surgery/pages/PreoperativeAssessmentPage';
import PreoperativeAssessmentDetailsPage from './domains/surgery/pages/PreoperativeAssessmentDetailsPage';
import PostOperativeNotePage from './domains/surgery/pages/PostOperativeNotePage';
import PostOpNotesListPage from './domains/surgery/pages/PostOpNotesListPage';
import PostOpNoteFormPage from './domains/surgery/pages/PostOpNoteFormPage';
import WoundsPage from './domains/wounds/pages/WoundsPage';
import BurnsAssessmentPage from './domains/burns/pages/BurnsAssessmentPage';
import LaboratoryPage from './domains/laboratory/pages/LaboratoryPage';
import PharmacyPage from './domains/pharmacy/pages/PharmacyPage';
import NutritionPlannerPage from './domains/nutrition/pages/NutritionPlannerPage';
import BillingPage from './domains/billing/pages/BillingPage';
import PayrollDashboardPage from './domains/billing/pages/PayrollDashboardPage';
import SurgicalEstimatePage from './domains/billing/pages/SurgicalEstimatePage';
import HospitalsPage from './domains/hospitals/pages/HospitalsPage';
import SettingsPage from './domains/settings/pages/SettingsPage';
import UsersManagementPage from './domains/auth/pages/UsersManagementPage';
import UserActivityAnalyticsPage from './domains/analytics/pages/UserActivityAnalyticsPage';
import ClinicalCalculatorsPage from './domains/calculators/pages/ClinicalCalculatorsPage';
import AdmissionsPage from './domains/admissions/pages/AdmissionsPage';
import WardRoundsPage from './domains/ward-rounds/pages/WardRoundsPage';
import UnifiedLabPage from './domains/investigations/pages/UnifiedLabPage';
import InvestigationRequestsPage from './domains/investigations/pages/InvestigationRequestsPage';
import InvestigationRequestForm from './domains/investigations/components/InvestigationRequestForm';
import DischargePage from './domains/discharge/pages/DischargePage';
import ADTPage from './domains/adt/pages/ADTPage';
import PatientFlowPage from './domains/patient-flow/pages/PatientFlowPage';
import LimbSalvagePage from './domains/limb-salvage/pages/LimbSalvagePage';
import NPWTPage from './domains/npwt/pages/NPWTPage';
import MedicationChartPage from './domains/medication-chart/pages/MedicationChartPage';
import PatientEducationPage from './domains/patient-education/pages/PatientEducationPage';
import PatientEducationDetailPage from './domains/patient-education/pages/PatientEducationDetailPage';
import ChatPage from './domains/communication/pages/ChatPage';
import VideoConferencePage from './domains/communication/pages/VideoConferencePage';
import AppointmentsPage from './domains/appointments/pages/AppointmentsPage';
import DrReviewsPage from './domains/dr-reviews/pages/DrReviewsPage';
import ExternalReviewPage from './domains/external-review/pages/ExternalReviewPage';
import PostOpCarePage from './domains/post-op-care/pages/PostOpCarePage';
import PostOpMonitoringChartsPage from './domains/post-op-care/pages/PostOpMonitoringChartsPage';
import PreoperativePlanningPage from './domains/preoperative-planning/pages/PreoperativePlanningPage';
import ShoppingChecklistPage from './domains/shopping-checklist/pages/ShoppingChecklistPage';
import SubstanceUseAssessmentPage from './domains/substance-use/pages/SubstanceUseAssessmentPage';
import KeloidCarePlanningPage from './domains/keloid/pages/KeloidCarePlanningPage';
import UnifiedSurgicalPrepPage from './domains/surgery/pages/UnifiedSurgicalPrepPage';
import SurgicalWorkflowPage from './domains/surgery/pages/SurgicalWorkflowPage';
import STIProtocolPage from './domains/soft-tissue-infection/pages/STIProtocolPage';
import LymphedemaAssessmentPage from './domains/lymphedema/pages/LymphedemaAssessmentPage';
import PreSurgicalConferencePage from './domains/pre-surgical-conference/pages/PreSurgicalConferencePage';
// Finance (Part B – ZIGMA BOND)
import FinanceLayout from './domains/finance/components/FinanceLayout';
import FinanceDashboard from './domains/finance/pages/FinanceDashboard';
import FinanceIncome from './domains/finance/pages/FinanceIncome';
import FinanceBuckets from './domains/finance/pages/FinanceBuckets';
import FinanceExpenses from './domains/finance/pages/FinanceExpenses';
import FinanceProjects from './domains/finance/pages/FinanceProjects';
import FinanceInvestments from './domains/finance/pages/FinanceInvestments';
import FinanceSettings from './domains/finance/pages/FinanceSettings';
// Family (Part C) — native React + Supabase domain (family.* schema)
import FamilyShell from './domains/family/pages/FamilyShell';
import FamilyDashboard from './domains/family/pages/FamilyDashboard';
import FamilyChildren from './domains/family/pages/FamilyChildren';
import FamilyTasks from './domains/family/pages/FamilyTasks';
import FamilyWallets from './domains/family/pages/FamilyWallets';
import FamilyEvents from './domains/family/pages/FamilyEvents';
import FamilyPrayer from './domains/family/pages/FamilyPrayer';
import FamilyGrowth from './domains/family/pages/FamilyGrowth';
import FamilyHealth from './domains/family/pages/FamilyHealth';
import FamilySchool from './domains/family/pages/FamilySchool';
import FamilyNotifications from './domains/family/pages/FamilyNotifications';
// Public Clinic Booking (No login required)
import PublicBookingPage from './domains/appointments/pages/public/PublicBookingPage';
import ChildLoginPage from './domains/family/pages/child/ChildLoginPage';
import ChildShell from './domains/family/pages/child/ChildShell';
import ChildHome from './domains/family/pages/child/ChildHome';
import ChildTasks from './domains/family/pages/child/ChildTasks';
import ChildWallet from './domains/family/pages/child/ChildWallet';
import ChildSchool from './domains/family/pages/child/ChildSchool';
import ChildHomework from './domains/family/pages/child/ChildHomework';
import ChildReadiness from './domains/family/pages/child/ChildReadiness';
import ChildRoutines from './domains/family/pages/child/ChildRoutines';
import FamilyReadiness from './domains/family/pages/FamilyReadiness';
import FamilyRoutines from './domains/family/pages/FamilyRoutines';
import BookingSharePage from './domains/appointments/pages/public/BookingSharePage';
import ClinicBookingsManagementPage from './domains/appointments/pages/ClinicBookingsManagementPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingScreen from './components/common/LoadingScreen';
import InstallPrompt from './components/pwa/InstallPrompt';
import { UpdatePrompt } from './components/pwa';

// Component to check agreement status and redirect
function AgreementGuard({ children }: { children: React.ReactNode }) {
  const { needsAgreement } = useAuth();
  
  if (needsAgreement()) {
    return <Navigate to="/agreement" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} />
      </Route>

      {/* User Agreement Route - for authenticated users who haven't accepted */}
      <Route 
        path="/agreement" 
        element={
          isAuthenticated 
            ? (user?.hasAcceptedAgreement 
                ? <Navigate to="/" replace /> 
                : <UserAgreementPage />)
            : <Navigate to="/login" replace />
        } 
      />

      {/* Public Clinic Booking - No Login Required */}
      <Route path="/book-appointment" element={<PublicBookingPage />} />

      {/* Family child self-service portal - No AstroHEALTH login required */}
      <Route path="/family/me/login" element={<ChildLoginPage />} />
      <Route path="/family/me" element={<ChildShell />}>
        <Route index element={<ChildHome />} />
        <Route path="readiness" element={<ChildReadiness />} />
        <Route path="routines" element={<ChildRoutines />} />
        <Route path="tasks" element={<ChildTasks />} />
        <Route path="homework" element={<ChildHomework />} />
        <Route path="wallet" element={<ChildWallet />} />
        <Route path="school" element={<ChildSchool />} />
      </Route>

      {/* Protected Routes - with Agreement Guard */}
      <Route element={isAuthenticated ? <AgreementGuard><MainLayout /></AgreementGuard> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        
        {/* Patient Routes */}
        <Route path="patients">
          <Route index element={<PatientsListPage />} />
          <Route path="new" element={<SlimNewPatientPage />} />
          <Route path="new-comprehensive" element={<NewPatientPage />} />
          <Route path=":patientId" element={<PatientDetailsPage />} />
          <Route path=":patientId/encounter" element={<ClinicalEncounterPage />} />
          <Route path=":patientId/follow-up" element={<EnhancedFollowUpPage />} />
          <Route path=":patientId/clinical-summary" element={<PatientClinicalSummaryPage />} />
          <Route path=":patientId/vitals" element={<VitalsPage />} />
          <Route path=":patientId/wounds" element={<WoundsPage />} />
        </Route>

        {/* Surgery Routes */}
        <Route path="surgery">
          <Route index element={<SurgeryListPage />} />
          <Route path="planning/:patientId" element={<SurgeryPlanningPage />} />
          <Route path="preoperative" element={<PreoperativeAssessmentPage />} />
          <Route path="preop/:assessmentId" element={<PreoperativeAssessmentDetailsPage />} />
          <Route path="post-op-notes" element={<PostOpNotesListPage />} />
          <Route path="post-op-note/create/:surgeryId" element={<PostOpNoteFormPage />} />
          <Route path="post-op-note/:surgeryId" element={<PostOperativeNotePage />} />
          <Route path="surgical-prep/:patientId" element={<UnifiedSurgicalPrepPage />} />
          <Route path="workflow" element={<SurgicalWorkflowPage />} />
          <Route path="workflow/:patientId" element={<SurgicalWorkflowPage />} />
        </Route>

        {/* Clinical Modules */}
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/clinic-bookings" element={<ClinicBookingsManagementPage />} />
        <Route path="appointments/share-booking" element={<BookingSharePage />} />
        <Route path="adt" element={<PatientFlowPage />} />
        <Route path="adt-legacy" element={<ADTPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="discharge" element={<DischargePage />} />
        <Route path="ward-rounds" element={<WardRoundsPage />} />
        <Route path="post-op-care" element={<PostOpCarePage />} />
        <Route path="post-op-care/charts/:patientId/:surgeryId" element={<PostOpMonitoringChartsPage />} />
        <Route path="preoperative-planning" element={<PreoperativePlanningPage />} />
        <Route path="treatment-plans/new" element={<TreatmentPlanPage />} />
        <Route path="treatment-planning" element={<TreatmentPlanningDashboardPage />} />
        <Route path="treatment-planning/new" element={<NewTreatmentPlanPage />} />
        <Route path="treatment-planning/:planId" element={<TreatmentPlanDetailPage />} />
        <Route path="mdt" element={<MDTPage />} />
        <Route path="blood-transfusion" element={<BloodTransfusionPage />} />
        <Route path="referrals" element={<ReferralPage />} />
        <Route path="investigations" element={<UnifiedLabPage />} />
        <Route path="patients/:patientId/investigations/request" element={<InvestigationRequestsPage />} />
        <Route path="patients/:patientId/investigations/request/new" element={<InvestigationRequestForm />} />
        <Route path="investigation-requests/:bundleId" element={<InvestigationRequestForm />} />
        <Route path="wounds" element={<WoundsPage />} />
        <Route path="burns" element={<BurnsAssessmentPage />} />
        <Route path="limb-salvage" element={<LimbSalvagePage />} />
        <Route path="npwt" element={<NPWTPage />} />
        <Route path="keloid-care" element={<KeloidCarePlanningPage />} />
        <Route path="sti-protocol" element={<STIProtocolPage />} />
        <Route path="lymphedema" element={<LymphedemaAssessmentPage />} />
        <Route path="substance-use" element={<SubstanceUseAssessmentPage />} />
        <Route path="medication-chart" element={<MedicationChartPage />} />
        <Route path="patient-education" element={<PatientEducationPage />} />
        <Route path="patient-education/:conditionId" element={<PatientEducationDetailPage />} />
        <Route path="laboratory" element={<LaboratoryPage />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="nutrition" element={<NutritionPlannerPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/payroll" element={<PayrollDashboardPage />} />
        <Route path="billing/surgical-estimate" element={<SurgicalEstimatePage />} />
        <Route path="shopping-checklist" element={<ShoppingChecklistPage />} />
        <Route path="pre-surgical-conference" element={<PreSurgicalConferencePage />} />
        <Route path="calculators" element={<ClinicalCalculatorsPage />} />
        <Route path="dr-reviews" element={<DrReviewsPage />} />
        <Route path="external-review" element={
          (user?.role === 'super_admin' || user?.role === 'hospital_admin') 
            ? <ExternalReviewPage /> 
            : <Navigate to="/" replace />
        } />
        <Route path="hospitals" element={<HospitalsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="user-activity" element={
          user?.role === 'super_admin' 
            ? <UserActivityAnalyticsPage /> 
            : <Navigate to="/" replace />
        } />
        <Route path="settings" element={<SettingsPage />} />

        {/* Finance (Part B – ZIGMA BOND): super_admin & hospital_admin only.
            Layout enforces the role guard. */}
        <Route path="finance" element={<FinanceLayout />}>
          <Route index element={<FinanceDashboard />} />
          <Route path="income" element={<FinanceIncome />} />
          <Route path="buckets" element={<FinanceBuckets />} />
          <Route path="expenses" element={<FinanceExpenses />} />
          <Route path="projects" element={<FinanceProjects />} />
          <Route path="investments" element={<FinanceInvestments />} />
          <Route path="settings" element={<FinanceSettings />} />
        </Route>

        {/* Family (Part C) — native domain backed by family.* Supabase schema */}
        <Route path="family" element={<FamilyShell />}>
          <Route index element={<FamilyDashboard />} />
          <Route path="children" element={<FamilyChildren />} />
          <Route path="tasks" element={<FamilyTasks />} />
          <Route path="routines" element={<FamilyRoutines />} />
          <Route path="readiness" element={<FamilyReadiness />} />
          <Route path="wallets" element={<FamilyWallets />} />
          <Route path="events" element={<FamilyEvents />} />
          <Route path="prayer" element={<FamilyPrayer />} />
          <Route path="growth" element={<FamilyGrowth />} />
          <Route path="health" element={<FamilyHealth />} />
          <Route path="school" element={<FamilySchool />} />
          <Route path="notifications" element={<FamilyNotifications />} />
        </Route>

        {/* Communication Routes */}
        <Route path="communication">
          <Route path="chat" element={<ChatPage />} />
          <Route path="video" element={<VideoConferencePage />} />
          <Route path="video/:conferenceId" element={<VideoConferencePage />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    
    {/* PWA Install Prompt & Offline/Update Notifications */}
    <InstallPrompt />
    <UpdatePrompt variant="banner" />
  </>
  );
}

export default App;
