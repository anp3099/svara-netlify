export function MinimalLayout() {
  console.log('🎯 MinimalLayout rendering')
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Svara Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">12</div>
            <p className="text-sm text-gray-600">Active Campaigns</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">2,847</div>
            <p className="text-sm text-gray-600">Total Leads</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">24.8%</div>
            <p className="text-sm text-gray-600">Response Rate</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">3.2%</div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Svara AI</h2>
          <p className="text-gray-600">
            Your AI-powered sales automation platform is ready to help you scale your outreach.
          </p>
        </div>
      </div>
    </div>
  )
}