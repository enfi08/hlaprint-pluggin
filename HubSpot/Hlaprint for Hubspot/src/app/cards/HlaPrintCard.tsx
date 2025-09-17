import React, { useState } from "react";
import {
  hubspot,
  Button,
  Input,
  Select,
  LoadingSpinner,
  Alert,
} from "@hubspot/ui-extensions";

// ---- CONFIG: set your backend base once here ----
const BASE = "https://YOUR-HLAPRINT-DOMAIN"; // <-- change me

type Ctx = {
  objectType?: string;
  objectId?: string | number;
  userId?: string | number;
  portalId?: string | number;
};

export default function HlaPrintCard({ context }: { context: Ctx }) {
  // UI state
  const [stage, setStage] = useState<"login" | "ready" | "sending">("login");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Login & token (from /api/login)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string>("");

  // Required by your /api/createPrintjob validator
  const [deviceName, setDeviceName] = useState(""); // string, max 23
  const [fileUrl, setFileUrl] = useState(""); // must be a reachable URL with allowed Content-Type

  // Optional print options (mapped to print_files[*])
  const [copies, setCopies] = useState<number>(1); // 1..100
  const [color, setColor] = useState<boolean>(false); // true/false
  const [duplex, setDuplex] = useState<boolean>(true); // true/false
  const [pageSize, setPageSize] = useState<"A4" | "A3" | "Letter">("A4");
  const [orientation, setOrientation] = useState<
    "auto" | "portrait" | "landscape"
  >("auto");
  const [rangeStart, setRangeStart] = useState<string>(""); // '' means unset
  const [rangeEnd, setRangeEnd] = useState<string>(""); // '' means unset

  const portalId = String(context.portalId ?? "");
  const userId = String(context.userId ?? "");

  // small helper around hubspot.fetch
  async function hsFetch(path: string, init?: RequestInit) {
    const res = await hubspot.fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      body: init?.body,
    });
    const text = await res.text();
    const json = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    })();
    if (!res.ok) {
      throw new Error(
        typeof json === "string"
          ? `${res.status} ${json}`
          : json?.message || JSON.stringify(json)
      );
    }
    return json;
  }

  async function doLogin() {
    try {
      const out = await hsFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // API returns { message, token, status }
      const t = out?.token;
      if (!t) throw new Error("Token missing in response");
      setToken(t);
      setToast({ type: "success", msg: "Logged in to HlaPrint." });
      setStage("ready");
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Login failed" });
    }
  }

  // client-side guards matching your validator
  function validateBeforeSend(): string | null {
    if (!token) return "Please login first.";
    if (!deviceName) return "Device name is required.";
    if (deviceName.length > 23) return "Device name must be ≤ 23 characters.";
    if (!fileUrl) return "File URL is required.";

    // if either range field is set, enforce both and numeric order
    const hasStart = rangeStart.trim().length > 0;
    const hasEnd = rangeEnd.trim().length > 0;
    if (hasStart !== hasEnd)
      return "If using page range, set both start and end.";
    if (hasStart && hasEnd) {
      const s = Number(rangeStart),
        e = Number(rangeEnd);
      if (!Number.isInteger(s) || s < 1)
        return "Page start must be an integer ≥ 1.";
      if (!Number.isInteger(e) || e < 1)
        return "Page end must be an integer ≥ 1.";
      if (e < s) return "Page end must be ≥ page start.";
    }

    if (copies < 1 || copies > 100) return "Copies must be between 1 and 100.";
    return null;
  }

  async function sendPrint() {
    const err = validateBeforeSend();
    if (err) {
      setToast({ type: "error", msg: err });
      return;
    }

    setStage("sending");
    try {
      // Build one print file; you can extend to multiple if you want.
      const printFile: any = {
        filename: fileUrl,
        color,
        double_sided: duplex,
        page_size: pageSize,
        copies,
        page_orientation: orientation,
      };
      // Only include page range if both are set
      if (rangeStart && rangeEnd) {
        printFile.pages_start = Number(rangeStart);
        printFile.page_end = Number(rangeEnd);
      }

      const body = {
        device_name: deviceName,
        print_files: [printFile],
        // printer_name is NOT required by your validator; omitting.
      };

      // POST /api/createPrintjob with Bearer token
      const out = await hsFetch("/api/createPrintjob", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      // API returns: { message, transaction_id, code } on success
      setToast({
        type: "success",
        msg: `Created. Txn ${out?.transaction_id ?? "-"}, code ${
          out?.code ?? "-"
        }`,
      });
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to create job" });
    } finally {
      setStage("ready");
    }
  }

  return (
    <div style={{ padding: 12 }}>
      {toast && (
        <Alert
          title={toast.type === "success" ? "Success" : "Error"}
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.msg}
        </Alert>
      )}

      {stage === "login" && (
        <>
          <Input label="Email" value={email} onChange={setEmail} />
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          <Button onClick={doLogin} variant="primary">
            {stage === "login" ? "Login to HlaPrint" : "Please wait..."}
          </Button>
        </>
      )}

      {stage !== "login" && (
        <>
          <Input
            label="Device Name (≤ 23 chars)"
            placeholder="e.g., FrontDesk-PC"
            value={deviceName}
            onChange={(v) => v.length <= 23 && setDeviceName(v)}
          />

          <Input
            label="File URL (PDF / Image / Doc / Sheet)"
            placeholder="https://.../file.pdf"
            value={fileUrl}
            onChange={setFileUrl}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <Input
              type="number"
              label="Copies"
              value={String(copies)}
              onChange={(v) =>
                setCopies(Math.min(100, Math.max(1, Number(v) || 1)))
              }
            />
            <Select
              label="Color"
              value={String(color)}
              onChange={(v) => setColor(v === "true")}
              options={[
                { label: "Mono", value: "false" },
                { label: "Color", value: "true" },
              ]}
            />
            <Select
              label="Duplex"
              value={String(duplex)}
              onChange={(v) => setDuplex(v === "true")}
              options={[
                { label: "Single", value: "false" },
                { label: "Double", value: "true" },
              ]}
            />
            <Select
              label="Page Size"
              value={pageSize}
              onChange={(v) => setPageSize(v as any)}
              options={[
                { label: "A4", value: "A4" },
                { label: "A3", value: "A3" },
                { label: "Letter", value: "Letter" },
              ]}
            />
            <Select
              label="Orientation"
              value={orientation}
              onChange={(v) => setOrientation(v as any)}
              options={[
                { label: "Auto", value: "auto" },
                { label: "Portrait", value: "portrait" },
                { label: "Landscape", value: "landscape" },
              ]}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Input
              label="Page Start (optional)"
              value={rangeStart}
              onChange={setRangeStart}
            />
            <Input
              label="Page End (optional)"
              value={rangeEnd}
              onChange={setRangeEnd}
            />
          </div>

          <Button
            onClick={sendPrint}
            variant="primary"
            disabled={!deviceName || !fileUrl}
          >
            {stage === "sending" ? <LoadingSpinner /> : "Send to HlaPrint"}
          </Button>
        </>
      )}
    </div>
  );
}
