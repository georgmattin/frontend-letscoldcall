"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export type TwilioFormData = {
  friendly_name?: string | null;
  account_sid: string;
  auth_token: string;
  phone_number: string;
  api_key?: string | null;
  api_secret?: string | null;
  twiml_app_sid?: string | null;
  is_default: boolean;
};

export type EditingTwilioConfig = {
  id: string;
  friendly_name?: string | null;
  is_default: boolean;
  is_active: boolean;
  phone_number?: string | null;
  created_at: string;
} | null;

type Props = {
  editingConfig: EditingTwilioConfig;
  formData: TwilioFormData;
  setFormData: React.Dispatch<React.SetStateAction<TwilioFormData>>;
  saving: boolean;
  onSave: () => void;
  onRequestClose: () => void;
};

const TwilioConfigModal: React.FC<Props> = ({ editingConfig, formData, setFormData, saving, onSave, onRequestClose }) => {
  const inputClass =
    "w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]";
  const labelClass = "block mb-2 text-[14px] text-[#003333]";
  const fontStyle: React.CSSProperties = { fontFamily: "Open Sans, sans-serif" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay matches Report A Problem */}
      <div
        className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm"
        onClick={onRequestClose}
      />

      {/* Panel */}
      <div className="relative z-10 mx-4">
      <section
        className="border border-[#0033331a] bg-white rounded-[10px] w-full flex flex-col overflow-hidden"
        style={{ width: 720, minHeight: 260, maxHeight: "90vh" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full w-full flex flex-col min-h-0">
          <div className="flex-1 p-[30px] overflow-y-auto overscroll-contain min-h-0">
          <h2 className="text-[23.04px] font-semibold text-[#003333]" style={fontStyle}>
            {editingConfig ? "Edit Twilio Configuration" : "Twilio Configuration"}
          </h2>
          <p className="mt-2 text-[16px] text-[#003333]" style={fontStyle}>
            {editingConfig ? "Update the Twilio credentials" : "Enter your Twilio credentials"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass} style={fontStyle}>
                Give it a name
              </label>
              <input
                type="text"
                value={formData.friendly_name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, friendly_name: e.target.value }))}
                placeholder="e.g Twilio Configuration #1"
                className={inputClass}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>

            <div>
              <label className={labelClass} style={fontStyle}>Account SID</label>
              <input
                type="text"
                value={formData.account_sid}
                onChange={(e) => setFormData((prev) => ({ ...prev, account_sid: e.target.value }))}
                placeholder="AC XXX XXX XXX"
                className={`${inputClass} font-mono`}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>
            <div>
              <label className={labelClass} style={fontStyle}>Auth token</label>
              <input
                type="text"
                value={formData.auth_token}
                onChange={(e) => setFormData((prev) => ({ ...prev, auth_token: e.target.value }))}
                placeholder="Twilio AUTH TOKEN"
                className={`${inputClass} font-mono`}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>

            <div>
              <label className={labelClass} style={fontStyle}>Phone number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                placeholder="Twilio phone number"
                className={inputClass}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>
            <div>
              <label className={labelClass} style={fontStyle}>API Key SID</label>
              <input
                type="text"
                value={formData.api_key || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                placeholder="SK XXX XXX XXX"
                className={`${inputClass} font-mono`}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>

            <div>
              <label className={labelClass} style={fontStyle}>API Secret</label>
              <input
                type="text"
                value={formData.api_secret || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_secret: e.target.value }))}
                placeholder="SK XXX XXX XXX"
                className={`${inputClass} font-mono`}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>

            <div>
              <label className={labelClass} style={fontStyle}>TwiML APP SID</label>
              <input
                type="text"
                value={formData.twiml_app_sid || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, twiml_app_sid: e.target.value }))}
                placeholder="AP XXX XXX XXX"
                className={`${inputClass} font-mono`}
                style={{ ...fontStyle, fontSize: 16 }}
              />
            </div>

            <div className="flex items-center mt-1">
              <input
                id="is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                className="h-4 w-4 text-[#059669] focus:ring-[#059669] border-[#0033331a] rounded"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-[#003333]" style={fontStyle}>
                Set as default configuration
              </label>
            </div>
          </div>
          </div>
          {/* END scrollable body */}
          <div className="p-[30px] pt-0">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !formData.account_sid || !formData.auth_token || !formData.phone_number}
                className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
                style={fontStyle}
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Saving</span>
                  </span>
                ) : (
                  editingConfig ? 'Update Configuration' : 'Save Configuration'
                )}
              </button>
              <button
                type="button"
                onClick={onRequestClose}
                className="w-full h-[41px] rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
                style={fontStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default TwilioConfigModal;
