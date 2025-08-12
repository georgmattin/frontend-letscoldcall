// Sample data structure for contact lists
// This is used as a reference for the data structure

export interface ContactListData {
  id: number
  name: string
  description: string
  createdDate: string
  totalContacts: number
  calledContacts: number
  remainingContacts: number
}

// Sample data for development/testing
export const contactListsData: ContactListData[] = [
  {
    id: 1,
    name: "Tech Startups Q1 2024",
    description: "Early-stage technology companies in the Bay Area focusing on SaaS and fintech solutions.",
    createdDate: "Jan 15, 2024",
    totalContacts: 150,
    calledContacts: 45,
    remainingContacts: 105
  },
  {
    id: 2,
    name: "Healthcare Prospects",
    description: "Healthcare organizations and medical device companies interested in digital transformation.",
    createdDate: "Feb 2, 2024",
    totalContacts: 89,
    calledContacts: 89,
    remainingContacts: 0
  },
  {
    id: 3,
    name: "E-commerce Retailers",
    description: "Small to medium e-commerce businesses looking to scale their operations and marketing.",
    createdDate: "Feb 20, 2024",
    totalContacts: 200,
    calledContacts: 12,
    remainingContacts: 188
  },
  {
    id: 4,
    name: "Manufacturing Companies",
    description: "Traditional manufacturing companies exploring automation and digital solutions.",
    createdDate: "Mar 5, 2024",
    totalContacts: 75,
    calledContacts: 0,
    remainingContacts: 75
  }
]
