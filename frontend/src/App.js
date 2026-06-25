import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import StudentLogin from "@/pages/StudentLogin";
import StudentPortal from "@/pages/StudentPortal";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Landing />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-portal" element={<StudentPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
