import { useEffect, useState, type FormEvent } from "react";
import { Check, RotateCcw, Server, ShieldAlert } from "lucide-react";
import { getApiBaseUrl, saveApiBaseUrl } from "../services/api";
import { useApiStatusContext } from "../app/apiStatusContext";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useApiStatusContext();

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      saveApiBaseUrl(apiUrl);
      setMessage("API address saved for this browser session. Checking connection…");
      void refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enter a valid API address.");
    }
  }

  function resetUrl() {
    window.sessionStorage.removeItem("sgd.apiBaseUrl");
    setApiUrl(import.meta.env.VITE_SGD_API_BASE_URL || "http://127.0.0.1:8000");
    setMessage("Session override cleared. The configured default will be used.");
    setError(null);
    window.dispatchEvent(new Event("sgd-api-config-change"));
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Connection and session behavior</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Settings</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Set the FastAPI origin for this browser tab/session. No authentication token or API secret belongs in this form.</p>
      </div>
      <article className="panel-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-cyan/20 bg-cyan/10 p-2 text-cyan"><Server size={18} /></span>
          <div>
            <h3 className="text-base font-semibold text-white">FastAPI base URL</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Default: <code>http://127.0.0.1:8000</code>. Local Vite origin <code>http://localhost:5173</code> is allowed by the current backend CORS configuration.</p>
          </div>
        </div>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="api-url">API origin</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="api-url" className="text-input flex-1" type="url" required value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="http://127.0.0.1:8000" />
            <button className="primary-action justify-center" type="submit"><Check size={15} /> Save for session</button>
            <button className="secondary-action justify-center" type="button" onClick={resetUrl}><RotateCcw size={15} /> Reset</button>
          </div>
          {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        </form>
      </article>
      <article className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-200" />
          <div>
            <h3 className="text-sm font-semibold text-amber-100">Local prototype security</h3>
            <p className="mt-2 text-xs leading-5 text-amber-50/70">The current API has no user authentication, access control, or persistent ownership boundaries. Keep it on a trusted local environment. Do not paste confidential field histories into an unauthenticated public endpoint.</p>
          </div>
        </div>
      </article>
      <div className="panel-card p-5 text-sm text-slate-400">
        <p className="font-medium text-slate-200">Session data</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Uploaded production data will be held in browser memory while the session is active. This initial frontend does not create user accounts, a database, saved analysis history, or durable model storage.</p>
      </div>
    </section>
  );
}
