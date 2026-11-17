import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { FeaturePlaceholderPage } from "../pages/FeaturePlaceholderPage";
import { SettingsPage } from "../pages/SettingsPage";
import { WorkspaceProvider } from "./workspaceContext";

const OverviewPage = lazy(() => import("../pages/OverviewPage").then((module) => ({ default: module.OverviewPage })));
const DatasetManagerPage = lazy(() => import("../pages/DatasetManagerPage").then((module) => ({ default: module.DatasetManagerPage })));
const ProductionPage = lazy(() => import("../pages/ProductionPage").then((module) => ({ default: module.ProductionPage })));
const WellPerformancePage = lazy(() => import("../pages/WellPerformancePage").then((module) => ({ default: module.WellPerformancePage })));
const ReservoirContextPage = lazy(() => import("../pages/ReservoirContextPage").then((module) => ({ default: module.ReservoirContextPage })));
const NaturalFlowPage = lazy(() => import("../pages/NaturalFlowPage").then((module) => ({ default: module.NaturalFlowPage })));
const ArtificialLiftPage = lazy(() => import("../pages/ArtificialLiftPage").then((module) => ({ default: module.ArtificialLiftPage })));
const ModelsPage = lazy(() => import("../pages/ModelsPage").then((module) => ({ default: module.ModelsPage })));
const PredictionsPage = lazy(() => import("../pages/PredictionsPage").then((module) => ({ default: module.PredictionsPage })));
const ReportsPage = lazy(() => import("../pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));

function LoadingRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<section role="status" className="panel-card p-6 text-sm text-slate-400">Loading analytics workspace…</section>}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LoadingRoute><OverviewPage /></LoadingRoute>} />
        <Route path="production" element={<LoadingRoute><ProductionPage /></LoadingRoute>} />
        <Route path="wells" element={<LoadingRoute><WellPerformancePage /></LoadingRoute>} />
        <Route path="reservoir" element={<LoadingRoute><ReservoirContextPage /></LoadingRoute>} />
        <Route path="natural-flow" element={<LoadingRoute><NaturalFlowPage /></LoadingRoute>} />
        <Route path="artificial-lift" element={<LoadingRoute><ArtificialLiftPage /></LoadingRoute>} />
        <Route path="models" element={<LoadingRoute><ModelsPage /></LoadingRoute>} />
        <Route path="predictions" element={<LoadingRoute><PredictionsPage /></LoadingRoute>} />
        <Route path="datasets" element={<LoadingRoute><DatasetManagerPage /></LoadingRoute>} />
        <Route path="reports" element={<LoadingRoute><ReportsPage /></LoadingRoute>} />
        <Route path="visualization" element={<FeaturePlaceholderPage page="visualization" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="not-found" element={<FeaturePlaceholderPage page="not-found" />} />
        <Route path="*" element={<Navigate replace to="/not-found" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </WorkspaceProvider>
  );
}
