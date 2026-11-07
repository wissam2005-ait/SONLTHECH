export type RequestStatus = 'NEW' | 'IN_PROGRESS' | 'QUOTE_SENT' | 'ACCEPTED' | 'REFUSED'
export type ProjectStatus = 'TO_PLAN' | 'IN_PROGRESS' | 'SUSPENDED' | 'DONE'

export const requestStatusLabels: Record<RequestStatus, string> = {
  NEW: 'Nouvelle',
  IN_PROGRESS: 'En cours de traitement',
  QUOTE_SENT: 'Devis envoyé',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  TO_PLAN: 'À planifier',
  IN_PROGRESS: 'En cours',
  SUSPENDED: 'Suspendu',
  DONE: 'Terminé',
}

export interface ContactRequest {
  id: number
  kind: 'QUOTE' | 'CONTACT'
  fullName: string
  phone: string | null
  email: string | null
  workType: string | null
  siteAddress: string | null
  message: string
  status: RequestStatus
  clientId: number | null
  createdAt: string
}

export interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  siret: string | null
  vatNumber: string | null
  notes: string | null
}

export interface Project {
  id: number
  name: string
  clientId: number
  address: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  status: ProjectStatus
  budget: number | null
  progress: number
  memberIds: number[]
}

export interface ProjectUpdate {
  id: number
  progress: number
  note: string | null
  authorName: string
  createdAt: string
}

export type Role = 'ADMIN' | 'EMPLOYEE' | 'INTERN'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type ContractType = 'CDI' | 'CDD' | 'APPRENTICESHIP' | 'INTERNSHIP' | 'TEMPORARY' | 'OTHER'

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Dirigeant',
  EMPLOYEE: 'Employé',
  INTERN: 'Stagiaire',
}

export const contractLabels: Record<ContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  APPRENTICESHIP: 'Apprentissage',
  INTERNSHIP: 'Stage',
  TEMPORARY: 'Intérim',
  OTHER: 'Autre',
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
}

export interface UserAccount {
  id: number
  email: string
  fullName: string
  role: Role
  phone: string | null
  jobTitle: string | null
  active: boolean
  hireDate: string | null
  contractType: ContractType | null
  address: string | null
  notes: string | null
  monthlySalary: number | null
}

export interface Task {
  id: number
  projectId: number
  title: string
  description: string | null
  assigneeId: number
  dueDate: string | null
  status: TaskStatus
}

export interface Material {
  id: number
  projectId: number
  name: string
  unit: string
  quantity: number
  supplier: string | null
  unitCost: number | null // null pour les non-dirigeants
  purchasedOn: string | null
  invoiceId: number | null
}

export interface CatalogItem {
  id: number
  name: string
  reference: string | null
  unit: string
  unitPrice: number | null // null pour les non-dirigeants
  supplier: string | null
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID'

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Émise',
  PAID: 'Payée',
}

/** ITEM = article chiffré ; GROUP = article à sous-lignes ; SUBITEM = sous-ligne a/, b/… ; SECTION = titre de lot. */
export type LineKind = 'ITEM' | 'GROUP' | 'SUBITEM' | 'SECTION'

export interface InvoiceLine {
  kind: LineKind
  description: string
  unit: string | null
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoicePayment {
  id: number
  amount: number
  paidOn: string
  method: string | null
  note: string | null
}

export interface Invoice {
  id: number
  number: string | null
  projectId: number | null   // null = facture libre
  clientId: number
  title: string | null
  subtitle: string | null
  quoteId: number | null
  issueDate: string | null
  dueDate: string | null
  status: InvoiceStatus
  vatRate: number
  totalHt: number
  totalVat: number
  totalTtc: number
  notes: string | null
  paidOn: string | null
  paidAmount: number
  remaining: number
  lines: InvoiceLine[]
  payments: InvoicePayment[]
}

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'INVOICED'

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  INVOICED: 'Facturé',
}

export interface Quote {
  id: number
  number: string
  clientId: number
  projectId: number | null
  title: string | null
  subtitle: string | null
  issueDate: string
  validUntil: string | null
  status: QuoteStatus
  vatRate: number
  totalHt: number
  totalVat: number
  totalTtc: number
  notes: string | null
  invoiceId: number | null
  lines: InvoiceLine[]
}

export interface Realisation {
  id: number
  title: string
  description: string | null
  city: string | null
  completedOn: string | null
  published: boolean
  authorName: string
  authorId: number
  projectId: number | null
  photos: string[]
  createdAt: string
}

export interface PublicRealisation {
  id: number
  title: string
  description: string | null
  city: string | null
  completedOn: string | null
  photos: string[]
}

export interface SalaryRow {
  userId: number
  fullName: string
  jobTitle: string | null
  monthlyAmount: number
  paid: number
  remaining: number
  absenceDays: number
  unpaidAbsenceDays: number
}

export interface SalaryPayment {
  id: number
  period: string
  amount: number
  paidOn: string
  method: string | null
  note: string | null
}

export type AbsenceType = 'PAID_LEAVE' | 'SICK' | 'UNPAID' | 'UNJUSTIFIED' | 'TRAINING' | 'OTHER'

export const absenceLabels: Record<AbsenceType, string> = {
  PAID_LEAVE: 'Congé payé',
  SICK: 'Maladie',
  UNPAID: 'Sans solde',
  UNJUSTIFIED: 'Injustifiée',
  TRAINING: 'Formation',
  OTHER: 'Autre',
}

/** Couleur de chaque type d'absence (grille du planning, pastilles). */
export const absenceColors: Record<AbsenceType, string> = {
  PAID_LEAVE: '#1f5fae',
  SICK: '#8b4a1c',
  UNPAID: '#6b7785',
  UNJUSTIFIED: '#c2332b',
  TRAINING: '#1d7f46',
  OTHER: '#a86a00',
}

export interface Absence {
  id: number
  userId: number
  userName: string
  type: AbsenceType
  startDate: string
  endDate: string
  halfDay: boolean
  note: string | null
  days: number
}

export interface AbsenceSummaryRow {
  userId: number
  fullName: string
  active: boolean
  days: Partial<Record<AbsenceType, number>>
  total: number
}
