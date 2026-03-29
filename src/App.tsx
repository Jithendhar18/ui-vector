import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RoleGuard from "@/components/shared/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  PageSkeleton,
  ChatSkeleton,
  DashboardSkeleton,
  TableSkeleton,
} from "@/components/skeletons/Skeletons";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const IngestionPage = lazy(() => import("./pages/IngestionPage"));
const PopularQuestionsPage = lazy(() => import("./pages/PopularQuestionsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <ErrorBoundary>
                      <Suspense fallback={<PageSkeleton />}>
                        <LoginPage />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <ErrorBoundary>
                      <Suspense fallback={<PageSkeleton />}>
                        <RegisterPage />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route
                      path="/chat"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<ChatSkeleton />}>
                            <ChatPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/chat/:sessionId"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<ChatSkeleton />}>
                            <ChatPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <SettingsPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />

                    {/* Admin only */}
                    <Route element={<RoleGuard roles={["admin"]} />}>
                      <Route
                        path="/admin/dashboard"
                        element={
                          <ErrorBoundary>
                            <Suspense fallback={<DashboardSkeleton />}>
                              <DashboardPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/admin/users"
                        element={
                          <ErrorBoundary>
                            <Suspense fallback={<TableSkeleton />}>
                              <UsersPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                    </Route>

                    {/* Admin + Developer */}
                    <Route element={<RoleGuard roles={["admin", "developer"]} />}>
                      <Route
                        path="/admin/ingestion"
                        element={
                          <ErrorBoundary>
                            <Suspense fallback={<TableSkeleton />}>
                              <IngestionPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/admin/popular"
                        element={
                          <ErrorBoundary>
                            <Suspense fallback={<TableSkeleton />}>
                              <PopularQuestionsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                    </Route>

                    {/* Backwards-compatible aliases */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/users" element={<Navigate to="/admin/users" replace />} />
                    <Route path="/ingestion" element={<Navigate to="/admin/ingestion" replace />} />
                  </Route>
                </Route>

                {/* Catch-all */}
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="*" element={<Navigate to="/chat" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
