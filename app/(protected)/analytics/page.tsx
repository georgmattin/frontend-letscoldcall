export default async function AnalyticsPage() {
  const AnalyticsMaster = (await import('./analytics-master')).default
  return <AnalyticsMaster />
}
