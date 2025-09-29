import React, { useState } from "react";
import { hubspot, Input, Button, Alert } from "@hubspot/ui-extensions";

const BASE = "https://879a9ec3af06.ngrok-free.app"; // https://879a9ec3af06.ngrok-free.app

type AnyCtx = Record<string, any>;

function SettingsPage({ context }: { context: AnyCtx }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    msg: string;
  }>(null);

  async function connect() {
    setStatus(null);
    setBusy(true);
    try {
      const res = await hubspot.fetch(
        `${BASE}/api/hubspot/settings/hlaprint/connect`,
        {
          method: "POST",
          headers: {
            // "Content-Type": "application/json",
            // Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const txt = await res.text();
      let json: any;
      try {
        json = JSON.parse(txt);
      } catch {
        json = { status: "FAILURE", message: txt };
      }

      if (json.status === "SUCCESS") {
        setStatus({ type: "success", msg: "Connected to HlaPrint." });
      } else {
        setStatus({
          type: "error",
          msg: json.message || "Failed to connect. Check credentials.",
        });
      }
    } catch (e: any) {
      setStatus({ type: "error", msg: e?.message || "Unexpected error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {status && (
        <Alert
          title={status.type === "success" ? "Success" : "Error"}
          variant={status.type}
          onClose={() => setStatus(null)}
        >
          {status.msg}
        </Alert>
      )}

      <Input label="HlaPrint Email" value={email} onChange={setEmail} />
      <Input
        type="password"
        label="HlaPrint Password"
        value={password}
        onChange={setPassword}
      />

      <Button
        variant="primary"
        onClick={connect}
        disabled={!email || !password || busy}
      >
        {busy ? "Connecting…" : "Connect"}
      </Button>
    </>
  );
}

export default hubspot.extend(({ context }) => (
  <SettingsPage context={context as AnyCtx} />
));
