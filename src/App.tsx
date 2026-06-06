import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ChangePassword from "./pages/auth/ChangePassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import TVMode from "./pages/TVMode";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminContents from "./pages/admin/AdminContents";
import AdminContentForm from "./pages/admin/AdminContentForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminTvSettings from "./pages/admin/AdminTvSettings";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tv" element={<TVMode />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/change-password" element={<ChangePassword />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="contents" element={<AdminContents />} />
              <Route path="contents/new" element={<AdminContentForm />} />
              <Route path="contents/:id/edit" element={<AdminContentForm />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="tv" element={<AdminTvSettings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
