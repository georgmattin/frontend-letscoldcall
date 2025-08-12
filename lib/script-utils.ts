export interface ScriptVariables {
  // Contact information
  name?: string // Contact's first name only
  full_name?: string // Contact's full name
  company?: string
  position?: string
  email?: string
  phone?: string
  website?: string
  location?: string
  
  // User/caller information
  my_name?: string
  my_company_name?: string
  
  // Additional variables
  [key: string]: string | undefined
}

export interface ScriptObjection {
  id: string
  objection: string
  response: string
  category?: string
  priority?: 'high' | 'medium' | 'low'
}

export function replaceScriptVariables(scriptContent: string, variables: ScriptVariables): string {
  if (!scriptContent) return ''
  
  let processedScript = scriptContent
  
  // Replace all variables with square bracket notation
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      // Replace [key] with the actual value
      const regex = new RegExp(`\\[${key}\\]`, 'gi')
      processedScript = processedScript.replace(regex, value)
    }
  })
  
  // Handle legacy placeholders (Your Name, Company, etc.)
  if (variables.my_name) {
    processedScript = processedScript.replace(/\[Your Name\]/gi, variables.my_name)
    processedScript = processedScript.replace(/\[your name\]/gi, variables.my_name)
  }
  
  if (variables.my_company_name) {
    processedScript = processedScript.replace(/\[Company\]/gi, variables.my_company_name)
    processedScript = processedScript.replace(/\[company\]/gi, variables.my_company_name)
  }
  
  if (variables.name) {
    processedScript = processedScript.replace(/\[Name\]/gi, variables.name)
  }
  
  if (variables.full_name) {
    processedScript = processedScript.replace(/\[Full Name\]/gi, variables.full_name)
    processedScript = processedScript.replace(/\[full name\]/gi, variables.full_name)
  }
  
  return processedScript
}

export function extractFirstName(fullName: string): string {
  if (!fullName) return ''
  
  // Split by space and take the first part
  const parts = fullName.trim().split(/\s+/)
  return parts[0] || ''
}

export function getAvailableScriptVariables(): { key: string; label: string; description: string; category: 'contact' | 'user' | 'other' }[] {
  return [
    // Contact variables
    { key: 'name', label: '[name]', description: 'Contact\'s first name only', category: 'contact' },
    { key: 'full_name', label: '[full_name]', description: 'Contact\'s full name', category: 'contact' },
    { key: 'company', label: '[company]', description: 'Contact\'s company name', category: 'contact' },
    { key: 'position', label: '[position]', description: 'Contact\'s job title/position', category: 'contact' },
    { key: 'email', label: '[email]', description: 'Contact\'s email address', category: 'contact' },
    { key: 'phone', label: '[phone]', description: 'Contact\'s phone number', category: 'contact' },
    { key: 'website', label: '[website]', description: 'Contact\'s company website', category: 'contact' },
    { key: 'location', label: '[location]', description: 'Contact\'s location/address', category: 'contact' },
    
    // User/caller variables
    { key: 'my_name', label: '[my_name]', description: 'Your name (from settings)', category: 'user' },
    { key: 'my_company_name', label: '[my_company_name]', description: 'Your company name (from settings)', category: 'user' },
  ]
} 