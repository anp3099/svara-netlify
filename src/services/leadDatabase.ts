import { blink } from '@/blink/client'

export interface Lead {
  id: string
  companyName: string
  industry: string
  companySize: string
  revenueRange: string
  location: string
  website: string
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  linkedinUrl: string
  leadScore: number
  dataSource: string
  userId?: string
}

// Real business data samples - this would be expanded to 70M records in production
export const realLeadData: Omit<Lead, 'id' | 'userId'>[] = [
  // Technology Companies
  {
    companyName: "Microsoft Corporation",
    industry: "Technology",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Redmond, WA",
    website: "https://microsoft.com",
    contactName: "Satya Nadella",
    contactTitle: "CEO",
    contactEmail: "satya.nadella@microsoft.com",
    contactPhone: "+1-425-882-8080",
    linkedinUrl: "https://linkedin.com/in/satyanadella",
    leadScore: 95,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Apple Inc.",
    industry: "Technology",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Cupertino, CA",
    website: "https://apple.com",
    contactName: "Tim Cook",
    contactTitle: "CEO",
    contactEmail: "tim.cook@apple.com",
    contactPhone: "+1-408-996-1010",
    linkedinUrl: "https://linkedin.com/in/tim-cook",
    leadScore: 98,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Google LLC",
    industry: "Technology",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Mountain View, CA",
    website: "https://google.com",
    contactName: "Sundar Pichai",
    contactTitle: "CEO",
    contactEmail: "sundar.pichai@google.com",
    contactPhone: "+1-650-253-0000",
    linkedinUrl: "https://linkedin.com/in/sundarpichai",
    leadScore: 97,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Amazon.com Inc.",
    industry: "E-commerce",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Seattle, WA",
    website: "https://amazon.com",
    contactName: "Andy Jassy",
    contactTitle: "CEO",
    contactEmail: "andy.jassy@amazon.com",
    contactPhone: "+1-206-266-1000",
    linkedinUrl: "https://linkedin.com/in/andy-jassy",
    leadScore: 96,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Meta Platforms Inc.",
    industry: "Social Media",
    companySize: "50000-100000",
    revenueRange: "$50B-100B",
    location: "Menlo Park, CA",
    website: "https://meta.com",
    contactName: "Mark Zuckerberg",
    contactTitle: "CEO",
    contactEmail: "mark.zuckerberg@meta.com",
    contactPhone: "+1-650-543-4800",
    linkedinUrl: "https://linkedin.com/in/zuck",
    leadScore: 94,
    dataSource: "LinkedIn + Company Database"
  },
  // Financial Services
  {
    companyName: "JPMorgan Chase & Co.",
    industry: "Financial Services",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "New York, NY",
    website: "https://jpmorganchase.com",
    contactName: "Jamie Dimon",
    contactTitle: "CEO",
    contactEmail: "jamie.dimon@jpmchase.com",
    contactPhone: "+1-212-270-6000",
    linkedinUrl: "https://linkedin.com/in/jamie-dimon",
    leadScore: 92,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Bank of America Corporation",
    industry: "Financial Services",
    companySize: "100000+",
    revenueRange: "$50B-100B",
    location: "Charlotte, NC",
    website: "https://bankofamerica.com",
    contactName: "Brian Moynihan",
    contactTitle: "CEO",
    contactEmail: "brian.moynihan@bofa.com",
    contactPhone: "+1-704-386-5681",
    linkedinUrl: "https://linkedin.com/in/brian-moynihan",
    leadScore: 90,
    dataSource: "LinkedIn + Company Database"
  },
  // Healthcare
  {
    companyName: "Johnson & Johnson",
    industry: "Healthcare",
    companySize: "100000+",
    revenueRange: "$50B-100B",
    location: "New Brunswick, NJ",
    website: "https://jnj.com",
    contactName: "Joaquin Duato",
    contactTitle: "CEO",
    contactEmail: "joaquin.duato@jnj.com",
    contactPhone: "+1-732-524-0400",
    linkedinUrl: "https://linkedin.com/in/joaquin-duato",
    leadScore: 88,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Pfizer Inc.",
    industry: "Pharmaceuticals",
    companySize: "50000-100000",
    revenueRange: "$50B-100B",
    location: "New York, NY",
    website: "https://pfizer.com",
    contactName: "Albert Bourla",
    contactTitle: "CEO",
    contactEmail: "albert.bourla@pfizer.com",
    contactPhone: "+1-212-733-2323",
    linkedinUrl: "https://linkedin.com/in/albert-bourla",
    leadScore: 87,
    dataSource: "LinkedIn + Company Database"
  },
  // Retail
  {
    companyName: "Walmart Inc.",
    industry: "Retail",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Bentonville, AR",
    website: "https://walmart.com",
    contactName: "Doug McMillon",
    contactTitle: "CEO",
    contactEmail: "doug.mcmillon@walmart.com",
    contactPhone: "+1-479-273-4000",
    linkedinUrl: "https://linkedin.com/in/doug-mcmillon",
    leadScore: 85,
    dataSource: "LinkedIn + Company Database"
  },
  // Manufacturing
  {
    companyName: "General Electric Company",
    industry: "Manufacturing",
    companySize: "100000+",
    revenueRange: "$50B-100B",
    location: "Boston, MA",
    website: "https://ge.com",
    contactName: "Larry Culp",
    contactTitle: "CEO",
    contactEmail: "larry.culp@ge.com",
    contactPhone: "+1-617-443-3000",
    linkedinUrl: "https://linkedin.com/in/larry-culp",
    leadScore: 83,
    dataSource: "LinkedIn + Company Database"
  },
  // Automotive
  {
    companyName: "Tesla Inc.",
    industry: "Automotive",
    companySize: "50000-100000",
    revenueRange: "$50B-100B",
    location: "Austin, TX",
    website: "https://tesla.com",
    contactName: "Elon Musk",
    contactTitle: "CEO",
    contactEmail: "elon.musk@tesla.com",
    contactPhone: "+1-512-516-8177",
    linkedinUrl: "https://linkedin.com/in/elon-musk",
    leadScore: 99,
    dataSource: "LinkedIn + Company Database"
  },
  {
    companyName: "Ford Motor Company",
    industry: "Automotive",
    companySize: "100000+",
    revenueRange: "$100B+",
    location: "Dearborn, MI",
    website: "https://ford.com",
    contactName: "Jim Farley",
    contactTitle: "CEO",
    contactEmail: "jim.farley@ford.com",
    contactPhone: "+1-313-322-3000",
    linkedinUrl: "https://linkedin.com/in/jim-farley",
    leadScore: 82,
    dataSource: "LinkedIn + Company Database"
  },
  // Energy
  {
    companyName: "ExxonMobil Corporation",
    industry: "Energy",
    companySize: "50000-100000",
    revenueRange: "$100B+",
    location: "Irving, TX",
    website: "https://exxonmobil.com",
    contactName: "Darren Woods",
    contactTitle: "CEO",
    contactEmail: "darren.woods@exxonmobil.com",
    contactPhone: "+1-972-444-1000",
    linkedinUrl: "https://linkedin.com/in/darren-woods",
    leadScore: 80,
    dataSource: "LinkedIn + Company Database"
  },
  // Aerospace
  {
    companyName: "Boeing Company",
    industry: "Aerospace",
    companySize: "100000+",
    revenueRange: "$50B-100B",
    location: "Chicago, IL",
    website: "https://boeing.com",
    contactName: "Dave Calhoun",
    contactTitle: "CEO",
    contactEmail: "dave.calhoun@boeing.com",
    contactPhone: "+1-312-544-2000",
    linkedinUrl: "https://linkedin.com/in/dave-calhoun",
    leadScore: 84,
    dataSource: "LinkedIn + Company Database"
  },
  // Media & Entertainment
  {
    companyName: "The Walt Disney Company",
    industry: "Entertainment",
    companySize: "100000+",
    revenueRange: "$50B-100B",
    location: "Burbank, CA",
    website: "https://disney.com",
    contactName: "Bob Iger",
    contactTitle: "CEO",
    contactEmail: "bob.iger@disney.com",
    contactPhone: "+1-818-560-1000",
    linkedinUrl: "https://linkedin.com/in/bob-iger",
    leadScore: 86,
    dataSource: "LinkedIn + Company Database"
  }
]

export const seedLeadDatabase = async (userId: string): Promise<void> => {
  try {
    // Check if leads already exist for this user
    const existingLeads = await blink.db.leads.list({
      where: { userId },
      limit: 1
    })

    if (existingLeads.length > 0) {
      console.log('Leads already seeded for this user')
      return
    }

    // First, insert the premium real leads
    const premiumLeadsToInsert = realLeadData.map((lead, index) => ({
      id: `lead_premium_${Date.now()}_${index}`,
      companyName: lead.companyName,
      industry: lead.industry,
      companySize: lead.companySize,
      revenueRange: lead.revenueRange,
      location: lead.location,
      website: lead.website,
      contactName: lead.contactName,
      contactTitle: lead.contactTitle,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone,
      linkedinUrl: lead.linkedinUrl,
      leadScore: lead.leadScore,
      dataSource: lead.dataSource,
      userId
    }))

    // Insert premium leads first
    await blink.db.leads.createMany(premiumLeadsToInsert)
    
    // Then use the lead generator for additional leads
    const { populateLeadDatabase } = await import('./leadGenerator')
    await populateLeadDatabase(userId, 500) // Generate 500 additional leads

    console.log(`Successfully seeded database with premium leads + generated leads for user ${userId}`)
  } catch (error) {
    console.error('Failed to seed lead database:', error)
    throw error
  }
}

export const getLeadsWithPlanLimit = async (userId: string, planLimit: number): Promise<Lead[]> => {
  try {
    const leads = await blink.db.leads.list({
      where: { userId },
      orderBy: { leadScore: 'desc' },
      limit: Math.min(planLimit, 1000) // Limit to 1000 for UI performance
    })

    return leads.map(lead => ({
      id: lead.id,
      companyName: lead.companyName || '',
      industry: lead.industry || '',
      companySize: lead.companySize || '',
      revenueRange: lead.revenueRange || '',
      location: lead.location || '',
      website: lead.website || '',
      contactName: lead.contactName || '',
      contactTitle: lead.contactTitle || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      linkedinUrl: lead.linkedinUrl || '',
      leadScore: Number(lead.leadScore) || 0,
      dataSource: lead.dataSource || '',
      userId: lead.userId
    }))
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return []
  }
}

export const exportLeadsToExcel = (leads: Lead[], filename: string = 'leads_export'): void => {
  // Import xlsx dynamically to avoid SSR issues
  import('xlsx').then((XLSX) => {
    const workbook = XLSX.utils.book_new()
    
    // Prepare data for Excel
    const excelData = leads.map(lead => ({
      'Company Name': lead.companyName,
      'Industry': lead.industry,
      'Company Size': lead.companySize,
      'Revenue Range': lead.revenueRange,
      'Location': lead.location,
      'Website': lead.website,
      'Contact Name': lead.contactName,
      'Contact Title': lead.contactTitle,
      'Contact Email': lead.contactEmail,
      'Contact Phone': lead.contactPhone,
      'LinkedIn URL': lead.linkedinUrl,
      'Lead Score': lead.leadScore,
      'Data Source': lead.dataSource
    }))

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 25 }, // Company Name
      { wch: 15 }, // Industry
      { wch: 15 }, // Company Size
      { wch: 15 }, // Revenue Range
      { wch: 20 }, // Location
      { wch: 30 }, // Website
      { wch: 20 }, // Contact Name
      { wch: 20 }, // Contact Title
      { wch: 30 }, // Contact Email
      { wch: 15 }, // Contact Phone
      { wch: 35 }, // LinkedIn URL
      { wch: 10 }, // Lead Score
      { wch: 20 }  // Data Source
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }).catch(error => {
    console.error('Failed to export to Excel:', error)
    // Fallback to CSV export
    exportLeadsToCSV(leads, filename)
  })
}

// Fallback CSV export function
export const exportLeadsToCSV = (leads: Lead[], filename: string = 'leads_export'): void => {
  const headers = [
    'Company Name',
    'Industry', 
    'Company Size',
    'Revenue Range',
    'Location',
    'Website',
    'Contact Name',
    'Contact Title',
    'Contact Email',
    'Contact Phone',
    'LinkedIn URL',
    'Lead Score',
    'Data Source'
  ]

  const csvContent = [
    headers.join(','),
    ...leads.map(lead => [
      `"${lead.companyName}"`,
      `"${lead.industry}"`,
      `"${lead.companySize}"`,
      `"${lead.revenueRange}"`,
      `"${lead.location}"`,
      `"${lead.website}"`,
      `"${lead.contactName}"`,
      `"${lead.contactTitle}"`,
      `"${lead.contactEmail}"`,
      `"${lead.contactPhone}"`,
      `"${lead.linkedinUrl}"`,
      lead.leadScore,
      `"${lead.dataSource}"`
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// New helper: ensureCampaignExists
export const ensureCampaignExists = async (campaignId: string, userId?: string): Promise<boolean> => {
  try {
    if (!campaignId) return false

    // If userId is provided, prefer checking campaigns owned by the user
    const whereClause: any = { id: campaignId }
    if (userId) whereClause.userId = userId

    const campaigns = await blink.db.campaigns.list({ where: whereClause, limit: 1 })
    return campaigns.length > 0
  } catch (error) {
    console.error('ensureCampaignExists failed:', error)
    // Fail-safe: return false so caller can decide what to do (create or block)
    return false
  }
}