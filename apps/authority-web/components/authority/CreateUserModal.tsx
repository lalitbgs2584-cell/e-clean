"use client";

import { useRef, useState } from "react";
import { ShieldCheck, Users, X } from "lucide-react";
import { authorityApi, AuthorityApiError } from "./api";
import type { AuthorityDashboardPayload } from "./shared";

interface CreateUserModalProps {
  zones: AuthorityDashboardPayload["zones"];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({
  zones,
  token,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [role, setRole] = useState<"WORKER" | "AUTHORITY">("WORKER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state (workers only)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the profile photo.");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in full name, email, and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!token) {
      setError("Authentication required.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await authorityApi.createUser(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        zone: zone.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      // If a photo was chosen and the user is a WORKER, upload it immediately
      if (photoFile && role === "WORKER" && result?.data?.id) {
        try {
          await authorityApi.assignWorkerProfileImage(
            token,
            result.data.id,
            photoFile,
          );
        } catch {
          // Photo upload is best-effort — user was created, don't fail the whole flow
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create user.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="overlay modal-overlay">
      <div
        className="modal workflow-modal"
        style={{
          maxWidth: 600,
          width: "92%",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button className="modal-close" onClick={onClose} disabled={pending}>
          <X size={19} />
        </button>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <span className="modal-icon" style={{ margin: 0 }}>
            {role === "WORKER" ? (
              <Users size={22} />
            ) : (
              <ShieldCheck size={22} />
            )}
          </span>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              {role === "WORKER"
                ? "Provision Field Worker"
                : "Provision Authority Officer"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
              {role === "WORKER"
                ? "Creates credentials for mobile field worker app access."
                : "Creates credentials for authority web command center access."}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: 14,
          }}
        >
          {/* Role selector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 4,
              background: "var(--surface-subtle, #f5f8f5)",
              borderRadius: 10,
              border: "1px solid var(--border-color, #dce3d8)",
            }}
          >
            <button
              type="button"
              className={`button ${role === "WORKER" ? "primary" : "ghost"}`}
              style={{ padding: "7px 12px", fontSize: 12, justifyContent: "center" }}
              onClick={() => {
                setRole("WORKER");
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              <Users size={14} style={{ marginRight: 6 }} /> Field Worker
            </button>
            <button
              type="button"
              className={`button ${role === "AUTHORITY" ? "primary" : "ghost"}`}
              style={{ padding: "7px 12px", fontSize: 12, justifyContent: "center" }}
              onClick={() => {
                setRole("AUTHORITY");
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              <ShieldCheck size={14} style={{ marginRight: 6 }} /> Authority Officer
            </button>
          </div>

          {/* Name & Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="setting-field" style={{ margin: 0 }}>
              Full Name *
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "WORKER" ? "Ramesh Kumar" : "Officer Sharma"}
              />
            </label>
            <label className="setting-field" style={{ margin: 0 }}>
              Email Address *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "WORKER" ? "worker@eclean.in" : "officer@city.gov"}
              />
            </label>
          </div>

          {/* Password & Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="setting-field" style={{ margin: 0 }}>
              Initial Password *
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </label>
            <label className="setting-field" style={{ margin: 0 }}>
              Contact Phone (Optional)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
          </div>

          {/* Zone */}
          <label className="setting-field" style={{ margin: 0 }}>
            Assigned Ward / Zone (Optional)
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g. Ward 12, Green Park"
              list="zones-datalist-modal"
            />
            <datalist id="zones-datalist-modal">
              {zones.map((z) => (
                <option key={z.zone} value={z.zone} />
              ))}
            </datalist>
          </label>

          {/* Profile photo — workers only */}
          {role === "WORKER" && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Profile Photo (Optional)
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--green)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#E8F0E5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed var(--border, #DCE3D8)",
                    }}
                  >
                    <Users size={24} style={{ color: "var(--muted)" }} />
                  </div>
                )}
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    className="button ghost"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {photoFile ? "Change photo" : "Choose photo"}
                  </button>
                  {photoFile && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>
                      {photoFile.name}
                    </p>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>
                    Uploaded immediately after account creation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                color: "#D64545",
                backgroundColor: "#FFF2F2",
                border: "1px solid #FFCDD2",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 4 }}>
            <button
              type="button"
              className="button ghost"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={pending}>
              {pending
                ? photoFile
                  ? "Creating account & uploading photo…"
                  : "Creating…"
                : role === "WORKER"
                  ? "Create Worker Account"
                  : "Create Authority Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
