import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { OverviewPage } from "../pages/OverviewPage";
import { FeaturePlaceholderPage } from "../pages/FeaturePlaceholderPage";
import { SettingsPage } from "../pages/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="production" element={<FeaturePlaceholderPage page="production" />} />
        <Route path="wells" element={<FeaturePlaceholderPage page="wells" />} />
        <Route path="reservoir" element={<FeaturePlaceholderPage page="reservoir" />} />
        <Route path="natural-flow" element={<FeaturePlaceholderPage page="natural-flow" />} />
        <Route path="artificial-lift" element={<FeaturePlaceholderPage page="artificial-lift" />} />
        <Route path="models" element={<FeaturePlaceholderPage page="models" />} />
        <Route path="predictions" element={<FeaturePlaceholderPage page="predictions" />} />
        <Route path="datasets" element={<FeaturePlaceholderPage page="datasets" />} />
        <Route path="reports" element={<FeaturePlaceholderPage page="reports" />} />
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
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
