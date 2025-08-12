"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { DollarSign, ExternalLink, FileText } from "lucide-react"

interface PackageInfo {
  id: string
  name?: string
  price?: number
}

interface InvoiceItem {
  id: string
  number?: string
  description?: string
  date: string | number | Date
  period_start?: string | number | Date
  period_end?: string | number | Date
  amount: number
  currency: string
  status: string
  hosted_invoice_url?: string
  invoice_pdf?: string
}

interface SubscriptionInfo {
  cancel_at_period_end?: boolean
  status?: string
  subscription_end_date: string | number | Date
  package_types?: { id?: number | string }
}

// Export a reusable packages list so other settings files can import the same source of truth
export const SETTINGS_UPGRADE_PACKAGES = [
  {
    id: '1',
    dbId: 1,
    name: 'Basic',
    price: 19.99,
    minutes: 500,
    features: [
      'Up to 500 call minutes per month',
      'Up to 10 call scripts',
      'Up to 10 contact lists',
      'Up to 1000 contacts per list',
      'Up to 5000 total contacts',
      'Up to 25 transcription access per month',
      'Up to 25 call summaries per month',
      'Up to 15 AI suggestions per month',
      'Priority support'
    ]
  },
  {
    id: '2',
    dbId: 2,
    name: 'Standard',
    price: 59.99,
    minutes: 1500,
    features: [
      'Up to 1500 call minutes per month',
      'Up to 25 call scripts',
      'Up to 25 contact lists',
      'Up to 2500 contacts per list',
      'Up to 15000 total contacts',
      'Up to 100 transcription access per month',
      'Up to 100 call summaries per month',
      'Up to 50 AI suggestions per month',
      'Priority support with dedicated account manager'
    ]
  },
  {
    id: '3',
    dbId: 3,
    name: 'Premium',
    price: 199.99,
    minutes: 8000,
    features: [
      'Up to 8000 call minutes per month',
      'Unlimited call scripts',
      'Unlimited contact lists',
      'Unlimited contacts per list',
      'Unlimited total contacts',
      'Unlimited transcription access',
      'Unlimited call summaries',
      'Unlimited AI suggestions',
      'Premium support with dedicated success team',
      'Custom integrations',
      'Advanced analytics and reporting'
    ]
  },
  {
    id: '4',
    dbId: 4,
    name: 'Pro',
    price: 299.99,
    minutes: 'unlimited',
    features: [
      'Unlimited call minutes per month',
      'Unlimited call scripts',
      'Unlimited contact lists',
      'Unlimited contacts per list',
      'Unlimited total contacts',
      'Unlimited transcription access',
      'Unlimited call summaries',
      'Unlimited AI suggestions',
      'Premium support with dedicated success team',
      'Custom integrations',
      'Advanced analytics and reporting'
    ]
  },
  {
    id: '5',
    dbId: 5,
    name: 'Business',
    price: 499.99,
    minutes: 'unlimited',
    features: [
      'Unlimited call minutes per month',
      'Unlimited call scripts',
      'Unlimited contact lists',
      'Unlimited contacts per list',
      'Unlimited total contacts',
      'Unlimited transcription access',
      'Unlimited call summaries',
      'Unlimited AI suggestions',
      'Premium support with dedicated success team',
      'Custom integrations',
      'Advanced analytics and reporting',
      'White-label solution'
    ]
  },
  {
    id: '6',
    dbId: 6,
    name: 'Enterprise',
    price: 999.99,
    minutes: 'unlimited',
    features: [
      'Unlimited call minutes per month',
      'Unlimited call scripts',
      'Unlimited contact lists',
      'Unlimited contacts per list',
      'Unlimited total contacts',
      'Unlimited transcription access',
      'Unlimited call summaries',
      'Unlimited AI suggestions',
      'Premium support with dedicated success team',
      'Custom integrations',
      'Advanced analytics and reporting',
      'White-label solution',
      'Dedicated infrastructure'
    ]
  }
]

interface BillingInvoicesTabProps {
  subscription: SubscriptionInfo | null
  getCurrentPackage: () => { name?: string; price?: number } | null
  getCurrentPackageFeatures: () => { basicFeatures: string[]; aiFeatures: string[] }
  handleEditSubscription: () => Promise<void> | void
  customerPortalLoading: boolean
  getAvailableUpgradePackages?: () => PackageInfo[]
  loadingInvoices: boolean
  invoices: InvoiceItem[]
  renderUpgradeCard?: (pkg: PackageInfo) => React.ReactNode
}

export default function BillingInvoicesTab({
  subscription,
  getCurrentPackage,
  getCurrentPackageFeatures,
  handleEditSubscription,
  customerPortalLoading,
  getAvailableUpgradePackages,
  loadingInvoices,
  invoices,
  renderUpgradeCard,
}: BillingInvoicesTabProps) {
  const currentPkg = getCurrentPackage()
  const features = getCurrentPackageFeatures()
  // Local fallback for upgrades if parent doesn't provide a resolver
  const localUpgrades = React.useMemo(() => {
    const id = subscription?.package_types?.id
    if (!id) return [] as any[]
    const currentId = parseInt(id as any)
    if (isNaN(currentId)) return [] as any[]
    return SETTINGS_UPGRADE_PACKAGES.filter((pkg: any) => pkg.dbId > currentId)
  }, [subscription?.package_types?.id])

  const upgrades = getAvailableUpgradePackages ? getAvailableUpgradePackages() : (localUpgrades as PackageInfo[])

  // Default upgrade card if parent does not supply one
  const renderUpgradeCardDefault = (pkg: any) => {
    return (
      <div key={pkg.id} className=" h-full flex flex-col" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xl font-bold" style={{ color: '#003333' }}>{pkg.name}</h4>
            <span className="text-white text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#059669' }}>
              Upgrade
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold" style={{ color: '#003333' }}>${pkg.price}</span>
            <span className="text-sm" style={{ color: '#003333' }}> / mo.</span>
          </div>
        </div>

        {/* Features styled like current package */}
        {Array.isArray(pkg.features) && pkg.features.length > 0 && (
          <div className="space-y-1 mb-6">
            {pkg.features.slice(0, 6).map((f: string, i: number) => (
              <div key={i} className="flex items-start">
                <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</div>
                <span className="text-sm" style={{ color: '#003333' }}>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-auto">
          <Button
            onClick={handleEditSubscription}
            disabled={customerPortalLoading}
            className="w-full text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#059669', borderRadius: '11px' }}
            onMouseEnter={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' } }}
            onMouseLeave={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' } }}
          >
            {customerPortalLoading ? 'Please wait...' : 'Upgrade in portal'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Billing & Invoices</h2>
          <p style={{ color: '#003333' }}>Manage your subscription, upgrades, and billing history</p>
        </div>
      </div>

      {/* Current Package Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4" style={{ color: '#003333' }}>Current Package</h3>
        {subscription && currentPkg ? (
          <div className="rounded-lg p-6 border" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            {/* Package Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-bold" style={{ color: '#003333' }}>
                  {currentPkg?.name}
                </h4>
                <span className="text-white text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#059669' }}>
                  Current
                </span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold" style={{ color: '#003333' }}>
                  ${currentPkg?.price}
                </span>
                <span className="text-sm" style={{ color: '#003333' }}> / mo.</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#003333' }}>
                {subscription.cancel_at_period_end ? (
                  <span className="text-orange-600">
                    Canceling at period end • Active until: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </span>
                ) : subscription.status === 'canceled' ? (
                  <span className="text-red-600">
                    Canceled • Ended: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-green-600">
                    Active • Next billing: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>

            {/* Package Features */}
            <div className="space-y-4 mb-6">
              {/* Basic Features */}
              {features.basicFeatures.length > 0 && (
                <div>
                  <h6 className="text-sm font-semibold mb-2" style={{ color: '#003333' }}>Basic features:</h6>
                  <div className="space-y-1">
                    {features.basicFeatures.map((feature: string, index: number) => (
                      <div key={`basic-${index}`} className="flex items-start">
                        <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</div>
                        <span className="text-sm" style={{ color: '#003333' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Features */}
              {features.aiFeatures.length > 0 && (
                <div>
                  <h6 className="text-sm font-semibold mb-2" style={{ color: '#003333' }}>AI Features:</h6>
                  <div className="space-y-1">
                    {features.aiFeatures.map((feature: string, index: number) => (
                      <div key={`ai-${index}`} className="flex items-start">
                        <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</div>
                        <span className="text-sm" style={{ color: '#003333' }}>
                          <span className="text-white px-1.5 py-0.5 rounded text-xs font-bold mr-1" style={{ backgroundColor: '#059669' }}>AI</span>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Manage Subscription Button */}
            <Button
              onClick={handleEditSubscription}
              disabled={customerPortalLoading}
              className="w-full text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#059669', borderRadius: '11px' }}
              onMouseEnter={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' } }}
              onMouseLeave={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' } }}
            >
              {customerPortalLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: '#059669', borderBottomColor: '#FFFFFF' }}></div>
                  Please wait...
                </>
              ) : (
                'Manage subscription'
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-gray-50 border rounded-lg p-6" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            <p style={{ color: '#003333' }}>No active subscription found.</p>
          </div>
        )}
      </div>

      {/* Change Package Section */}
      <div>
        <h3 className="text-lg font-medium mb-4" style={{ color: '#003333' }}>Upgrade Package</h3>
        <p className="mb-6" style={{ color: '#003333' }}>Select a higher-tier package to upgrade your subscription. All upgrades are processed securely with prorated billing.</p>

        {upgrades.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            <p style={{ color: '#003333' }}>You are already on the highest available package.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upgrades.map((pkg) => (renderUpgradeCard ? renderUpgradeCard(pkg) : renderUpgradeCardDefault(pkg)))}
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(0,51,51,0.1)' }}>
        <h3 className="text-lg font-medium mb-4" style={{ color: '#003333' }}>Billing History</h3>
        <p className="mb-6" style={{ color: '#003333' }}>View and download your past invoices.</p>

        {loadingInvoices ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#059669' }}></div>
            <span className="ml-2" style={{ color: '#003333' }}>Loading invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2" style={{ color: '#003333' }}>No invoices found</h4>
            <p style={{ color: '#003333' }}>
              Your billing history will appear here once you have active subscriptions.
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            <table className="min-w-full divide-y" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#003333' }}>Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#003333' }}>Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#003333' }}>Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#003333' }}>Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#003333' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#003333' }}>
                          {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                        </div>
                        <div className="text-sm" style={{ color: '#003333' }}>{invoice.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{ color: '#003333' }}>{new Date(invoice.date).toLocaleDateString()}</div>
                      {invoice.period_start && invoice.period_end && (
                        <div className="text-xs" style={{ color: '#003333' }}>
                          {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium" style={{ color: '#003333' }}>${invoice.amount.toFixed(2)} {invoice.currency}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {invoice.hosted_invoice_url && (
                          <button
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                            className="flex items-center px-2 py-1"
                            style={{ color: '#059669', borderRadius: '11px' }}
                            title="View invoice"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View
                          </button>
                        )}
                        {invoice.invoice_pdf && (
                          <button
                            onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                            className="flex items-center ml-2 px-2 py-1"
                            style={{ color: '#059669', borderRadius: '11px' }}
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
