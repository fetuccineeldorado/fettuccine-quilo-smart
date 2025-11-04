import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Weighing from "./pages/Weighing";
import Orders from "./pages/Orders";
import Cashier from "./pages/Cashier";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Customers from "./pages/Customers";
import Employees from "./pages/Employees";
import EditOrder from "./pages/EditOrder";
import OrderDetails from "./pages/OrderDetails";
import CashManagement from "./pages/CashManagement";
import Inventory from "./pages/Inventory";
import Promotions from "./pages/Promotions";
import ExtraItemsManagement from "./pages/ExtraItemsManagement";
import EmployeeTimeClock from "./pages/EmployeeTimeClock";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
