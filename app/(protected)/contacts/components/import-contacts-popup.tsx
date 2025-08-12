"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type ImportContactsPopupProps = {
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  onImportComplete?: () => Promise<void> | void;
};

const ImportContactsPopup: React.FC<ImportContactsPopupProps> = ({
  title = "Import contacts",
  description = "Upload a CSV file with your contacts. Required columns: Name (or First name + Last name) and Phone.",
  isOpen,
  onClose,
  listId,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus(null);
    }
  };

  // Normalize phone numbers for reliable duplicate detection
  const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    const digits = phone.replace(/[^0-9]/g, "");
    return digits;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.replace(/"/g, "").trim().toLowerCase());

    const rows = lines.slice(1);

    return rows
      .map((row) => {
        const values: string[] = [];
        let current = "";
        let insideQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '"') insideQuotes = !insideQuotes;
          else if (ch === "," && !insideQuotes) {
            values.push(current.trim());
            current = "";
          } else current += ch;
        }
        values.push(current.trim());

        const contact: any = {};
        headers.forEach((header, idx) => {
          const raw = values[idx]?.replace(/"/g, "").trim();
          if (!raw) return;

          if (header.includes("name") || header.includes("nimi")) contact.name = raw;
          else if (header.includes("first") || header.includes("eesnimi")) contact.firstName = raw;
          else if (header.includes("last") || header.includes("perenimi")) contact.lastName = raw;
          else if (header.includes("phone") || header.includes("telefon") || header.includes("telephone")) contact.phone = raw;
          else if (header.includes("email") || header.includes("e-mail") || header.includes("e-post")) contact.email = raw;
          else if (header.includes("company") || header.includes("ettevõte")) contact.company = raw;
          else if (header.includes("position") || header.includes("ametikoht")) contact.position = raw;
          else if (header.includes("website") || header.includes("veebileht")) contact.website = raw;
          else if (header.includes("notes") || header.includes("märkused")) contact.notes = raw;
        });

        if (!contact.name && (contact.firstName || contact.lastName)) {
          contact.name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        }
        return contact;
      })
      .filter((c) => c && c.name && c.phone);
  };

  const handleDownloadSample = () => {
    const sample = `Name,Phone,Email,Company,Position,Website,Notes\n"John Smith","+372 56272798","john@company.com","TechStart","CEO","https://example.com","Interested"`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "sample-contacts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setStatus("Please choose a CSV file first.");
      return;
    }

    try {
      setIsImporting(true);
      setStatus("Parsing CSV file...");

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setStatus("Authentication error. Please log in again.");
        setIsImporting(false);
        return;
        }

      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setStatus("No valid contacts found in the CSV file.");
        setIsImporting(false);
        return;
      }
      // Dedupe within-file based on normalized phone
      const inFileMap = new Map<string, any>();
      for (const c of parsed) {
        const key = normalizePhone(c.phone);
        if (!key) continue;
        if (!inFileMap.has(key)) inFileMap.set(key, c);
      }

      const uniqueParsed = Array.from(inFileMap.values());

      setStatus(`Found ${parsed.length} contacts (${uniqueParsed.length} unique). Checking duplicates...`);

      // Fetch existing phones for this list to avoid duplicates already in DB
      const { data: existingRows, error: existingErr } = await supabase
        .from("contacts")
        .select("phone")
        .eq("contact_list_id", listId)
        .limit(50000);
      if (existingErr) {
        console.error("Error loading existing contacts:", existingErr);
        setStatus("Error checking duplicates. Please try again.");
        setIsImporting(false);
        return;
      }

      const existingSet = new Set<string>((existingRows || []).map((r: any) => normalizePhone(r.phone)));

      const filtered = uniqueParsed.filter((c: any) => {
        const key = normalizePhone(c.phone);
        return key && !existingSet.has(key);
      });

      if (filtered.length === 0) {
        setStatus(`All ${parsed.length} contacts are duplicates for this list. Nothing to import.`);
        setIsImporting(false);
        return;
      }
      const skipped = parsed.length - filtered.length;
      setStatus(`Importing ${filtered.length} new contact(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s).` : "."}`);

      const toInsert = filtered.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        company: c.company || null,
        position: c.position || null,
        website: c.website || null,
        notes: c.notes || null,
        contact_list_id: listId,
        user_id: user.id,
        status: "not_called",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: inserted, error } = await supabase
        .from("contacts")
        .insert(toInsert)
        .select("id");
      if (error) {
        console.error("Import error:", error);
        setStatus("Error importing contacts. Please try again.");
        setIsImporting(false);
        return;
      }

      // Log user activity for adding new contacts to a list
      try {
        await supabase.from("user_activity_logs").insert({
          user_id: user.id,
          action: "Add New Contacts To List",
          entity_type: "contacts",
          metadata: {
            table: "contacts",
            contact_list_id: listId,
            count: Array.isArray(inserted) ? inserted.length : filtered.length,
            contact_ids: Array.isArray(inserted) ? inserted.map((r: any) => r.id) : [],
          },
        });
      } catch (logErr) {
        console.warn("Failed to log user activity (add contacts):", logErr);
      }

      setStatus(`Successfully imported ${toInsert.length} contact(s).${skipped > 0 ? ` Skipped ${skipped} duplicate(s).` : ""}`);
      // Trigger refresh without blocking UI so the popup can close immediately
      try {
        if (onImportComplete) {
          // Do not await to avoid keeping the button in loading state
          Promise.resolve(onImportComplete()).catch((e) => {
            console.error("onImportComplete error:", e);
          });
        }
      } finally {
        // Clear loading and close popup right away
        setSelectedFile(null);
        setIsImporting(false);
        onClose();
      }
    } catch (e) {
      console.error(e);
      setStatus("Error reading the CSV file. Please try again.");
      setIsImporting(false);
    }
  };

  const canClose = !isImporting;

  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 561, minHeight: 260 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-[23.04px] font-semibold text-[#003333]"
              style={{ fontFamily: "Open Sans, sans-serif" }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-2 text-[16px] text-[#003333]"
                style={{ fontFamily: "Open Sans, sans-serif" }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => canClose && onClose()}
            disabled={!canClose}
            className="w-[32px] h-[32px] rounded-[8px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] disabled:opacity-60"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-5">
          <label
            htmlFor="contacts-csv"
            className={`w-full h-[120px] rounded-[16px] border border-dashed ${isImporting ? "opacity-60" : ""} flex flex-col items-center justify-center cursor-pointer bg-[#F4F6F6] hover:bg-[#eef2f2] transition-colors`}
          >
            <input
              id="contacts-csv"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isImporting}
              className="hidden"
            />
            <svg className="w-6 h-6 text-[#059669] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <p className="text-[#059669] text-[14px] font-semibold" style={{ fontFamily: "Open Sans, sans-serif" }}>
              Click to choose a CSV file
            </p>
            {selectedFile && (
              <p className="text-[13px] text-[#003333] mt-1" style={{ fontFamily: "Open Sans, sans-serif" }}>
                Selected: {selectedFile.name}
              </p>
            )}
          </label>

          {status && (
            <div
              className={`mt-4 p-3 rounded-[10px] border text-[14px]`}
              style={{
                fontFamily: "Open Sans, sans-serif",
                color: status.includes("Error") || status.includes("Please") ? "#991B1B" : status.includes("Successfully") ? "#065F46" : "#1E40AF",
                backgroundColor: status.includes("Error") || status.includes("Please") ? "#FEF2F2" : status.includes("Successfully") ? "#ECFDF5" : "#EFF6FF",
                borderColor: status.includes("Error") || status.includes("Please") ? "#FECACA" : status.includes("Successfully") ? "#D1FAE5" : "#BFDBFE",
              }}
            >
              {status}
            </div>
          )}

          <div className="mt-4">
            <p className="text-[14px] font-semibold text-[#059669]" style={{ fontFamily: "Open Sans, sans-serif" }}>
              CSV file format
            </p>
            <ul className="mt-1 text-[13px] text-[#003333] list-disc pl-5" style={{ fontFamily: "Open Sans, sans-serif" }}>
              <li>Name (required) or First name + Last name</li>
              <li>Phone/Telephone (required)</li>
              <li>Company, Position, Email, Website, Notes (optional)</li>
            </ul>
            <button
              type="button"
              onClick={handleDownloadSample}
              disabled={isImporting}
              className="mt-2 text-[13px] font-semibold text-[#059669] hover:underline disabled:opacity-60"
              style={{ fontFamily: "Open Sans, sans-serif" }}
            >
              Download sample file
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => canClose && onClose()}
            disabled={!canClose}
            className="h-[41px] px-4 rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px] disabled:opacity-60"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="h-[41px] px-6 rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors inline-flex items-center gap-2"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            {isImporting ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span>Importing</span>
              </>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ImportContactsPopup;
