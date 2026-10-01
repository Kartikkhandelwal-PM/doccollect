export interface CatalogDoc {
  id: string
  name: string
}

export interface CatalogGroup {
  title: string
  docs: CatalogDoc[]
}

// The starting set of documents a CA usually asks for. Firms can add, rename and delete their own.
export const groups: CatalogGroup[] = [
  {
    title: 'Identity',
    docs: [
      { id: 'pan', name: 'PAN card' },
      { id: 'aadhaar', name: 'Aadhaar card' },
      { id: 'passport', name: 'Passport' },
      { id: 'address', name: 'Address proof' },
      { id: 'photo', name: 'Passport-size photograph' },
    ],
  },
  {
    title: 'Income',
    docs: [
      { id: 'form16', name: 'Form 16 (Part A & B)' },
      { id: '26as', name: 'Form 26AS / AIS' },
      { id: 'salary', name: 'Salary slips' },
      { id: 'rent', name: 'Rent receipts' },
      { id: 'intcert', name: 'Interest certificates' },
      { id: 'dividend', name: 'Dividend statement' },
      { id: 'pension', name: 'Pension certificate' },
    ],
  },
  {
    title: 'Bank',
    docs: [
      { id: 'bank', name: 'Bank statement Apr–Mar' },
      { id: 'fd', name: 'FD statements' },
      { id: 'loanstmt', name: 'Loan account statement' },
      { id: 'cheque', name: 'Cancelled cheque' },
    ],
  },
  {
    title: 'Deductions',
    docs: [
      { id: 'homeloan', name: 'Home loan interest certificate' },
      { id: 'lic', name: 'LIC premium receipts' },
      { id: 'health', name: 'Health insurance premium' },
      { id: '80g', name: '80G donation receipts' },
      { id: 'tuition', name: 'Tuition fee receipts' },
      { id: 'nps', name: 'NPS contribution statement' },
      { id: 'elss', name: 'ELSS / mutual fund 80C proof' },
    ],
  },
  {
    title: 'Capital gains',
    docs: [
      { id: 'brokerpl', name: 'Broker profit and loss statement' },
      { id: 'mfcg', name: 'Mutual fund capital gains statement' },
      { id: 'saledeed', name: 'Property sale deed' },
      { id: 'purdeed', name: 'Property purchase deed' },
      { id: 'improvement', name: 'Cost of improvement bills' },
      { id: 'vda', name: 'Crypto / VDA transaction report' },
    ],
  },
  {
    title: 'Business',
    docs: [
      { id: 'gstcert', name: 'GST registration certificate' },
      { id: 'udyam', name: 'Udyam registration' },
      { id: 'deed', name: 'Partnership deed / LLP agreement' },
      { id: 'coi', name: 'Certificate of incorporation' },
      { id: 'moa', name: 'MOA and AOA' },
      { id: 'shopact', name: 'Shop and establishment licence' },
      { id: 'dsc', name: 'Digital signature certificate' },
      { id: 'dinkyc', name: 'Director KYC (DIN)' },
    ],
  },
  {
    title: 'Accounts',
    docs: [
      { id: 'tb', name: 'Trial balance' },
      { id: 'ledger', name: 'Ledgers' },
      { id: 'bs', name: 'Balance sheet' },
      { id: 'pl', name: 'Profit and loss account' },
      { id: 'far', name: 'Fixed asset register' },
      { id: 'stock', name: 'Stock statement' },
      { id: 'debtors', name: 'Debtors and creditors list' },
      { id: 'cashbook', name: 'Cash book' },
    ],
  },
  {
    title: 'GST',
    docs: [
      { id: 'sales', name: 'Sales register' },
      { id: 'purchase', name: 'Purchase register' },
      { id: 'gstr2b', name: 'GSTR-2B' },
      { id: 'eway', name: 'E-way bills' },
      { id: 'invoices', name: 'Sales invoices' },
      { id: 'cdnotes', name: 'Credit and debit notes' },
      { id: 'hsn', name: 'HSN summary' },
      { id: 'gstrecon', name: 'GST reconciliation sheet' },
    ],
  },
  {
    title: 'TDS',
    docs: [
      { id: 'challans', name: 'TDS challans' },
      { id: 'deductees', name: 'Deductee list' },
      { id: 'form16a', name: 'Form 16A' },
      { id: 'salreg', name: 'Salary register' },
      { id: 'lowerded', name: 'Lower deduction certificate' },
      { id: 'form15ca', name: 'Form 15CA / 15CB' },
    ],
  },
  {
    title: 'Payroll',
    docs: [
      { id: 'epf', name: 'PF challans and ECR' },
      { id: 'esi', name: 'ESI challans' },
      { id: 'attendance', name: 'Attendance sheet' },
      { id: 'emplist', name: 'Employee list' },
    ],
  },
  {
    title: 'Company',
    docs: [
      { id: 'fs', name: 'Audited financial statements' },
      { id: 'auditreport', name: "Auditor's report" },
      { id: 'boardres', name: 'Board resolutions' },
      { id: 'shareholding', name: 'Shareholding pattern' },
      { id: 'agm', name: 'AGM notice' },
    ],
  },
  {
    title: 'Audit',
    docs: [
      { id: 'bankconf', name: 'Bank confirmation letters' },
      { id: 'loansanction', name: 'Loan sanction letters' },
      { id: 'assetbills', name: 'Fixed asset purchase bills' },
    ],
  },
]

export interface Template {
  id: string
  name: string
  docIds: string[]
}

// Ready-made checklists. The first three keep their old ids and contents.
export const templates: Template[] = [
  { id: 'itr', name: 'ITR salaried', docIds: ['pan', 'aadhaar', 'form16', '26as', 'bank', 'homeloan', 'lic'] },
  { id: 'gst', name: 'GST monthly', docIds: ['sales', 'purchase', 'gstr2b', 'bank'] },
  { id: 'tds', name: 'TDS quarterly', docIds: ['challans', 'deductees', 'form16a', 'bank'] },
  { id: 'itr-biz', name: 'ITR business / profession', docIds: ['pan', 'aadhaar', '26as', 'bank', 'pl', 'bs', 'ledger', 'far', 'sales', 'purchase', 'homeloan'] },
  { id: 'itr-cg', name: 'ITR capital gains', docIds: ['pan', 'aadhaar', '26as', 'bank', 'brokerpl', 'mfcg', 'saledeed', 'purdeed', 'improvement', 'vda'] },
  { id: 'itr-senior', name: 'ITR pensioner / senior citizen', docIds: ['pan', 'aadhaar', '26as', 'pension', 'intcert', 'bank', 'health', '80g'] },
  { id: 'gst-annual', name: 'GST annual return', docIds: ['sales', 'purchase', 'gstr2b', 'hsn', 'cdnotes', 'gstrecon', 'bs', 'pl', 'tb'] },
  { id: 'gst-reg', name: 'GST registration', docIds: ['pan', 'aadhaar', 'photo', 'address', 'cheque', 'deed'] },
  { id: 'tds-sal', name: 'TDS on salary (24Q)', docIds: ['salreg', 'challans', 'deductees', 'emplist', 'bank'] },
  { id: 'advtax', name: 'Advance tax', docIds: ['26as', 'bank', 'pl', 'intcert', 'dividend'] },
  { id: 'taxaudit', name: 'Tax audit', docIds: ['tb', 'ledger', 'bs', 'pl', 'far', 'stock', 'debtors', 'bank', 'bankconf', 'assetbills'] },
  { id: 'roc', name: 'Company annual filing (ROC)', docIds: ['fs', 'auditreport', 'boardres', 'shareholding', 'agm', 'dinkyc', 'coi'] },
  { id: 'llp', name: 'LLP annual filing', docIds: ['fs', 'deed', 'dinkyc', 'bank', 'tb'] },
  { id: 'pfesi', name: 'PF and ESI monthly', docIds: ['salreg', 'epf', 'esi', 'attendance', 'emplist'] },
  { id: 'books', name: 'Monthly bookkeeping', docIds: ['bank', 'sales', 'purchase', 'cashbook', 'ledger', 'debtors', 'stock'] },
  { id: 'incorp', name: 'Business registration', docIds: ['pan', 'aadhaar', 'photo', 'address', 'cheque', 'moa', 'dsc', 'udyam'] },
  { id: 'loan', name: 'Loan application', docIds: ['pan', 'aadhaar', 'address', 'bank', 'form16', 'salary', '26as', 'bs', 'pl'] },
  { id: 'custom', name: 'Custom', docIds: [] },
]

export const docName = (id: string, extra: CatalogDoc[] = []) =>
  [...groups.flatMap((g) => g.docs), ...extra].find((d) => d.id === id)?.name ?? id
