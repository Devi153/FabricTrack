import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLoginPage } from "./pages/auth/AdminLoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { SetPasswordPage } from "./pages/auth/SetPasswordPage";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
