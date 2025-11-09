import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy load all pages for better performance
const Auth = lazy(() => import("./pages/Auth"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Weighing = lazy(() => import("./pages/Weighing"));
const Orders = lazy(() => import("./pages/Orders"));
const Cashier = lazy(() => import("./pages/Cashier"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Customers = lazy(() => import("./pages/Customers"));
const Employees = lazy(() => import("./pages/Employees"));
const EditOrder = lazy(() => import("./pages/EditOrder"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const CashManagement = lazy(() => import("./pages/CashManagement"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Promotions = lazy(() => import("./pages/Promotions"));
const ExtraItemsManagement = lazy(() => import("./pages/ExtraItemsManagement"));
const EmployeeTimeClock = lazy(() => import("./pages/EmployeeTimeClock"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Enhanced QueryClient with better defaults for performance and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Carregando FETUCCINE...</p>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/weighing" element={<Weighing />} />
                <Route path="/dashboard/orders" element={<Orders />} />
                <Route path="/dashboard/cashier" element={<Cashier />} />
                <Route path="/dashboard/cash-management" element={<CashManagement />} />
                <Route path="/dashboard/inventory" element={<Inventory />} />
                <Route path="/dashboard/promotions" element={<Promotions />} />
                <Route path="/dashboard/extra-items" element={<ExtraItemsManagement />} />
                <Route path="/dashboard/reports" element={<Reports />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                <Route path="/dashboard/customers" element={<Customers />} />
                <Route path="/dashboard/employees" element={<Employees />} />
                <Route path="/dashboard/time-clock" element={<EmployeeTimeClock />} />
                <Route path="/dashboard/edit-order/:orderId" element={<EditOrder />} />
                <Route path="/edit-order/:orderId" element={<EditOrder />} />
                <Route path="/dashboard/order-details/:orderId" element={<OrderDetails />} />
                <Route path="/order-details/:orderId" element={<OrderDetails />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
