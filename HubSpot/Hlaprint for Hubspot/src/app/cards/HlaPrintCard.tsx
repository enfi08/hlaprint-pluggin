import React, { useState } from "react";
import {
  hubspot,
  Stack,
  Inline,
  Text,
  Button,
  Input,
  Select,
  LoadingSpinner,
  Alert,
} from "@hubspot/ui-extensions";

const BASE = "https://hlaprint.com";

type Ctx = {
  objectType?: string;
  objectId?: string | number;
  userId?: string | number;
  portalId?: string | number;
};

function HlaPrintCardView({ context }: { context: Ctx }) {
  const [stage, setStage] = useState<"login" | "ready" | "sending">("login");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string>("");

  const [deviceName, setDeviceName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const [copies, setCopies] = useState<number>(1);
  const [color, setColor] = useState<boolean>(false);
  const [duplex, setDuplex] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<"A4" | "A3" | "Letter">("A4");
  const [orientation, setOrientation] = useState<
    "auto" | "portrait" | "landscape"
  >("auto");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

  const hsFetch = async (path: string, init?: RequestInit) => {
    const url = `${BASE}${path}`;
    const res = await hubspot.fetch(url, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: init?.body,
    });
    const text = await res.text();
    const xErr = (res as any).headers?.get?.("x-hubspot-external-error") || "";
    if (!res.ok) {
      const detail =
        `URL: ${url}\n` +
        `Status: ${res.status}\n` +
        `Proxy-Error: ${xErr}\n` +
        `Body: ${(text || "<empty>").slice(0, 400)}`;
      setToast({ type: "error", msg: detail });
      console.error("hsFetch error", { url, status: res.status, xErr, text });
      throw new Error(detail);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const debugPing = async () => {
    try {
      const res = await hubspot.fetch(`${BASE}/robots.txt`, { method: "GET" });
      setToast({
        type: res.ok ? "success" : "error",
        msg: `Ping ${res.status} ${BASE}/robots.txt`,
      });
    } catch (e: any) {
      setToast({ type: "error", msg: `Ping failed: ${String(e)}` });
    }
  };

  async function doLogin() {
    try {
      const out = await hsFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const t = (out as any)?.token;
      if (!t) throw new Error("Token missing in response");
      setToken(t);
      setToast({ type: "success", msg: "Logged in to HlaPrint." });
      setStage("ready");
    } catch (e: any) {
      //handled in hs fetch already
    }
  }

  function validateBeforeSend(): string | null {
    if (!token) return "Please login first.";
    if (!deviceName) return "Device name is required.";
    if (deviceName.length > 23) return "Device name must be ≤ 23 characters.";
    if (!fileUrl) return "File URL is required.";
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
      const printFile: any = {
        filename: fileUrl,
        color,
        double_sided: duplex,
        page_size: pageSize,
        copies,
        page_orientation: orientation,
      };
      if (rangeStart && rangeEnd) {
        printFile.pages_start = Number(rangeStart);
        printFile.page_end = Number(rangeEnd);
      }
      const body = { device_name: deviceName, print_files: [printFile] };

      const out = await hsFetch("/api/createPrintjob", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      setToast({
        type: "success",
        msg: `Created. Txn ${(out as any)?.transaction_id ?? "-"}, code ${
          (out as any)?.code ?? "-"
        }`,
      });
    } catch {
      // hsFetch already handles
    } finally {
      setStage("ready");
    }
  }

  return (
    <Stack gap="sm">
      <Text format="bold">HlaPrint</Text>

      {toast && (
        <Alert
          title={toast.type === "success" ? "Success" : "Error"}
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.msg}
        </Alert>
      )}

      <Inline gap="xs">
        <Button onClick={debugPing} variant="secondary">
          Debug Ping
        </Button>
      </Inline>

      {stage === "login" ? (
        <Stack gap="sm">
          <Input label="Email" value={email} onChange={setEmail} />
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          <Button onClick={doLogin} variant="primary">
            Login to HlaPrint
          </Button>
        </Stack>
      ) : (
        <Stack gap="sm">
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

          <Inline gap="sm">
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
          </Inline>

          <Inline gap="sm">
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
          </Inline>

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

          <Inline gap="sm">
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
          </Inline>

          <Button
            onClick={sendPrint}
            variant="primary"
            disabled={!deviceName || !fileUrl}
          >
            {stage === "sending" ? <LoadingSpinner /> : "Send to HlaPrint"}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

hubspot.extend(({ context }) => <HlaPrintCardView context={context as Ctx} />);
