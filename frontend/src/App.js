import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import StudentLogin from "@/pages/StudentLogin";
import StudentPortal from "@/pages/StudentPortal";
import AdvisorLogin from "@/pages/AdvisorLogin";
import AdvisorDashboard from "@/pages/AdvisorDashboard";
import AdvisorStudentDetail from "@/pages/AdvisorStudentDetail";
import Contact from "@/pages/Contact";
import WalletPage from "@/pages/WalletPage";
import DevelopmentCenter from "@/pages/DevelopmentCenter";
import AutoPilotPage from "@/pages/AutoPilotPage";
import AlinmaSponsorship from "@/pages/AlinmaSponsorship";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Landing />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-portal" element={<StudentPortal />} />
          <Route path="/advisor-login" element={<AdvisorLogin />} />
          <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
          <Route path="/advisor-dashboard/student/:student_id" element={<AdvisorStudentDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/development-center" element={<DevelopmentCenter />} />
          <Route path="/auto-pilot" element={<AutoPilotPage />} />
          <Route path="/alinma-sponsorship" element={<AlinmaSponsorship />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
