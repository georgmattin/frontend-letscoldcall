"use client";
import React from "react";
import { Activity } from "lucide-react";

export interface UsageLimitsTabProps {
  usagePeriod: string;
  setUsagePeriod: React.Dispatch<React.SetStateAction<string>>;
  usageLoading: boolean;
  twilioLoading: boolean;
  twilioStats: any;
  packageUsage: any;
  usageStats: any;
}

const UsageLimitsTab: React.FC<UsageLimitsTabProps> = ({
  usagePeriod,
  setUsagePeriod,
  usageLoading,
  twilioLoading,
  twilioStats,
  packageUsage,
  usageStats,
}) => {
  const formatActionType = (val: unknown) => {
    if (typeof val !== 'string') return '';
    return val
      .replace(/[_-]+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  };
  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Usage & Limits</h2>
          <p style={{ color: '#003333' }}>Track your calls, minutes, and package usage</p>
        </div>
      </div>

      {usageLoading || twilioLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#059669]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Calls and Minutes */}
          <div className="space-y-6 pr-6">
            {/* Calls Section */}
            <div className="space-y-4">
              <h3 className="text-[19.2px] font-semibold text-[#003333]">Calls</h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-[5px] p-4">
                  <div className="text-[25.04px] font-bold text-[#003333] mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block align-middle"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#059669',
                        WebkitMaskImage: "url('/total-calls-icon.svg')",
                        maskImage: "url('/total-calls-icon.svg')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                      }}
                    />
                    {twilioStats?.statistics?.totalCalls || 0}
                  </div>
                  <div className="text-[16px] text-[#003333] font-medium">Total Calls</div>
                </div>

                <div className="rounded-[5px] border border-gray-200 p-4">
                  <div className="text-[25.04px] font-bold text-[#003333] mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block align-middle"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#059669',
                        WebkitMaskImage: "url('/outgoing-call-arrow.svg')",
                        maskImage: "url('/outgoing-call-arrow.svg')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                      }}
                    />
                    {twilioStats?.statistics?.outboundCalls || 0}
                  </div>
                  <div className="text-[16px] text-[#003333]">Outbound Calls</div>
                </div>

                <div className="rounded-[5px] border border-gray-200 p-4">
                  <div className="text-[25.04px] font-bold text-[#003333] mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block align-middle"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#059669',
                        WebkitMaskImage: "url('/incoming-call-arrow.svg')",
                        maskImage: "url('/incoming-call-arrow.svg')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                      }}
                    />
                    {twilioStats?.statistics?.inboundCalls || 0}
                  </div>
                  <div className="text-[16px] text-[#003333]">Inbound Calls</div>
                </div>
              </div>
            </div>

            {/* Call Minutes Section */}
            <div className="space-y-4">
              <h3 className="text-[19.2px] font-semibold text-[#003333]">Call Minutes</h3>

              <div className="border rounded-[5px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[16px] text-[#003333] font-medium">Total Minutes</div>
                  <div className="text-[16px] text-[#003333]">
                    {(twilioStats?.statistics?.totalCallTime || 0).toFixed(1)} / {packageUsage?.package?.limits?.max_call_minutes || 500}
                  </div>
                </div>
                <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                  <div
                    className="bg-[#059669] h-[10px] rounded-full"
                    style={{
                      width: `${Math.min(100, ((twilioStats?.statistics?.totalCallTime || 0) / (packageUsage?.package?.limits?.max_call_minutes || 500)) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[5px] border border-gray-200 p-4">
                  <div className="text-[25.04px] font-bold text-[#003333] mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block align-middle"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#059669',
                        WebkitMaskImage: "url('/outgoing-call-arrow.svg')",
                        maskImage: "url('/outgoing-call-arrow.svg')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                      }}
                    />
                    {(twilioStats?.statistics?.outboundCallTime || 0).toFixed(1)}
                  </div>
                  <div className="text-[16px] text-[#003333]">Outbound Minutes</div>
                </div>

                <div className="rounded-[5px] border border-gray-200 p-4">
                  <div className="text-[25.04px] font-bold text-[#003333] mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block align-middle"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#059669',
                        WebkitMaskImage: "url('/incoming-call-arrow.svg')",
                        maskImage: "url('/incoming-call-arrow.svg')",
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                      }}
                    />
                    {(twilioStats?.statistics?.inboundCallTime || 0).toFixed(1)}
                  </div>
                  <div className="text-[16px] text-[#003333]">Inbound Minutes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Package Limits */}
          <div className="space-y-4">
            <h3 className="text-[19.2px] font-semibold text-[#003333]">Package Limits</h3>

            {packageUsage?.package && packageUsage?.currentUsage ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column - AI Limits */}
                <div className="space-y-3">
                  {/* AI Transcriptions */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-medium text-[#003333]">
                          <span className="bg-[#059669] text-white px-1.5 py-0.5 rounded text-[16px] font-bold mr-1">AI</span>
                          Transcriptions
                        </span>
                      </div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.transcription_access_used || 0} / {packageUsage?.package?.limits?.max_transcription_access || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.transcription_access_used || 0) / (packageUsage?.package?.limits?.max_transcription_access || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Call Summaries */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-medium text-[#003333]">
                          <span className="bg-[#059669] text-white px-1.5 py-0.5 rounded text-[16px] font-bold mr-1">AI</span>
                          Call Summaries
                        </span>
                      </div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.call_summary_generations_used || 0} / {packageUsage?.package?.limits?.max_call_summary_generations || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.call_summary_generations_used || 0) / (packageUsage?.package?.limits?.max_call_summary_generations || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-medium text-[#003333]">
                          <span className="bg-[#059669] text-white px-1.5 py-0.5 rounded text-[16px] font-bold mr-1">AI</span>
                          Suggestions
                        </span>
                      </div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.call_suggestions_generations_used || 0} / {packageUsage?.package?.limits?.max_call_suggestions_generations || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.call_suggestions_generations_used || 0) / (packageUsage?.package?.limits?.max_call_suggestions_generations || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* AI Call Scripts */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-medium text-[#003333]">
                          <span className="bg-[#059669] text-white px-1.5 py-0.5 rounded text-[16px] font-bold mr-1">AI</span>
                          Call Scripts
                        </span>
                      </div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.script_generations_used || 0} / {packageUsage?.package?.limits?.max_script_generations || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.script_generations_used || 0) / (packageUsage?.package?.limits?.max_script_generations || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* AI Call Script Objections */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-medium text-[#003333]">
                          <span className="bg-[#059669] text-white px-1.5 py-0.5 rounded text-[16px] font-bold mr-1">AI</span>
                          Call Script Objections
                        </span>
                      </div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.objection_generations_used || 0} / {packageUsage?.package?.limits?.max_objection_generations || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.objection_generations_used || 0) / (packageUsage?.package?.limits?.max_objection_generations || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Other Limits */}
                <div className="space-y-3">
                  {/* Call Recordings */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[16px] font-medium text-[#003333]">Call Recordings</div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.recordings_accessed || 0} / {packageUsage?.package?.limits?.max_recordings_access || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.recordings_accessed || 0) / (packageUsage?.package?.limits?.max_recordings_access || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Call Scripts */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[16px] font-medium text-[#003333]">Call Scripts</div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.active_call_scripts || 0} / {packageUsage?.package?.limits?.max_call_scripts || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.active_call_scripts || 0) / (packageUsage?.package?.limits?.max_call_scripts || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Contact Lists */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[16px] font-medium text-[#003333]">Contact Lists</div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.active_contact_lists || 0} / {packageUsage?.package?.limits?.max_contact_lists || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.active_contact_lists || 0) / (packageUsage?.package?.limits?.max_contact_lists || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="rounded-[5px] border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[16px] font-medium text-[#003333]">Contacts</div>
                      <span className="text-[16px] text-[#003333]">
                        {packageUsage?.currentUsage?.total_contacts || 0} / {packageUsage?.package?.limits?.max_total_contacts || 500}
                      </span>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-full h-[10px]">
                      <div
                        className="bg-[#059669] h-[10px] rounded-full"
                        style={{
                          width: `${Math.min(100, ((packageUsage?.currentUsage?.total_contacts || 0) / (packageUsage?.package?.limits?.max_total_contacts || 500)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-[#003333]">No package information available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activities */}
      {usageStats?.recent_activity && (
        <div className="mt-8">
          <h3 className="text-[19.2px] font-semibold text-[#003333] mb-4">Recent Activities</h3>
          <div>
            {usageStats.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {usageStats.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-[5px] border [border-color:#003333]/10">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-[#059669]" />
                      <span className="text-[16px] font-medium text-[#003333]">{formatActionType(activity.action_type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] text-[#003333]">
                        {activity.created_at
                          ? new Date(activity.created_at).toLocaleString("et-EE", {
                              timeZone: "Europe/Tallinn",
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </span>
                      <span
                        className={`text-[16px] px-2 py-1 rounded-full text-[#003333] ${
                          activity.status === "completed" ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#003333]">No recent activities</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageLimitsTab;
