import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type Props = {
  supabaseReady: boolean;
  authChecking: boolean;
};

const Auth = ({ supabaseReady, authChecking }: Props) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabaseReady) setError("Supabase not configured.");
  }, [supabaseReady]);

  const onSubmit = async () => {
    if (!supabase || !email.trim()) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="badge">Sign in</div>
        <h1 className="headline" style={{ margin: "8px 0" }}>Welcome back</h1>
        <p className="subtle">Enter your email to receive a magic link. You’ll stay signed in on this device.</p>
        <input
          className="pill-ghost"
          style={{ width: "100%", padding: "12px 14px", borderStyle: "solid", borderRadius: 12, margin: "12px 0" }}
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!supabaseReady || authChecking}
        />
        <button className="cta" style={{ width: "100%", marginBottom: 10 }} onClick={onSubmit} disabled={!supabaseReady || authChecking}>
          Send magic link
        </button>
        {sent && <p className="subtle">Check your email and tap the link; we’ll bring you back here.</p>}
        {error && <p className="subtle" style={{ color: "#dc2626" }}>{error}</p>}
        <p className="subtle" style={{ marginTop: 16 }}>Tip: Open the link on the same device for fastest sign-in.</p>
      </div>
    </div>
  );
};

export default Auth;
