import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CoursesPage from "./pages/CoursesPage";
import CourseDetail from "./pages/CourseDetail";
import ApplyPage from "./pages/ApplyPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/courses" component={CoursesPage} />
    <Route path="/courses/:slug" component={CourseDetail} />
    <Route path="/apply/:slug" component={ApplyPage} />
    <Route path="/login" component={LoginPage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
