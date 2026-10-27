import type { Service } from './types'
interface CatalogDoc {
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
      { id: 'gstr1', name: 'GSTR-1 filed copy' },
      { id: 'gstr3b', name: 'GSTR-3B filed copy' },
      { id: 'gstr2a', name: 'GSTR-2A' },
      { id: 'itcledger', name: 'Input tax credit (ITC) ledger' },
      { id: 'cashledger', name: 'Electronic cash ledger' },
      { id: 'rcm', name: 'Reverse charge (RCM) statement' },
      { id: 'purinv', name: 'Purchase invoices' },
      { id: 'einvoice', name: 'E-invoice (IRN) report' },
      { id: 'shipbill', name: 'Shipping bills and export invoices' },
      { id: 'lut', name: 'LUT copy' },
      { id: 'refundapp', name: 'Refund application (RFD-01)' },
      { id: 'gstnotice', name: 'GST notice or order copy' },
      { id: 'stockreg', name: 'Stock register' },
      { id: 'rentagr', name: 'Rent agreement of business premises' },
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
      { id: 'tdsack', name: 'TDS return acknowledgement (Form 27A)' },
      { id: 'challan281', name: 'Challan 281 payment proof' },
      { id: 'vendorinv', name: 'Vendor invoices' },
      { id: 'contracts', name: 'Contracts and agreements' },
      { id: 'rentpaid', name: 'Rent paid statement' },
      { id: 'form12bb', name: 'Form 12BB declarations' },
      { id: 'form15gh', name: 'Form 15G / 15H' },
      { id: 'tdsnotice', name: 'TDS notice or default justification report' },
      { id: 'tanreg', name: 'TAN allotment letter' },
      { id: 'nrdetails', name: 'Non-resident payee details and TRC' },
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
  kind: Service // ITR (everything on the PAN: income tax, ROC, KYC), GST or TDS
  docIds: string[]
}

// Ready-made checklists. The first three keep their old ids and contents.
export const templates: Template[] = [
  { id: 'itr', kind: 'ITR', name: 'ITR salaried', docIds: ['pan', 'aadhaar', 'form16', '26as', 'bank', 'homeloan', 'lic'] },
  { id: 'gst', kind: 'GST', name: 'GST monthly', docIds: ['sales', 'purchase', 'gstr2b', 'bank'] },
  { id: 'tds', kind: 'TDS', name: 'TDS quarterly', docIds: ['challans', 'deductees', 'form16a', 'bank'] },
  { id: 'itr-biz', kind: 'ITR', name: 'ITR business / profession', docIds: ['pan', 'aadhaar', '26as', 'bank', 'pl', 'bs', 'ledger', 'far', 'sales', 'purchase', 'homeloan'] },
  { id: 'itr-cg', kind: 'ITR', name: 'ITR capital gains', docIds: ['pan', 'aadhaar', '26as', 'bank', 'brokerpl', 'mfcg', 'saledeed', 'purdeed', 'improvement', 'vda'] },
  { id: 'itr-senior', kind: 'ITR', name: 'ITR pensioner / senior citizen', docIds: ['pan', 'aadhaar', '26as', 'pension', 'intcert', 'bank', 'health', '80g'] },
  { id: 'gst-annual', kind: 'GST', name: 'GST annual return', docIds: ['sales', 'purchase', 'gstr2b', 'hsn', 'cdnotes', 'gstrecon', 'bs', 'pl', 'tb'] },
  { id: 'gst-reg', kind: 'GST', name: 'GST registration', docIds: ['pan', 'aadhaar', 'photo', 'address', 'cheque', 'deed'] },
  { id: 'tds-sal', kind: 'TDS', name: 'TDS on salary (24Q)', docIds: ['salreg', 'challans', 'deductees', 'emplist', 'bank'] },
  { id: 'advtax', kind: 'ITR', name: 'Advance tax', docIds: ['26as', 'bank', 'pl', 'intcert', 'dividend'] },
  { id: 'taxaudit', kind: 'ITR', name: 'Tax audit', docIds: ['tb', 'ledger', 'bs', 'pl', 'far', 'stock', 'debtors', 'bank', 'bankconf', 'assetbills'] },
  { id: 'roc', kind: 'ITR', name: 'Company annual filing (ROC)', docIds: ['fs', 'auditreport', 'boardres', 'shareholding', 'agm', 'dinkyc', 'coi'] },
  { id: 'llp', kind: 'ITR', name: 'LLP annual filing', docIds: ['fs', 'deed', 'dinkyc', 'bank', 'tb'] },
  { id: 'pfesi', kind: 'ITR', name: 'PF and ESI monthly', docIds: ['salreg', 'epf', 'esi', 'attendance', 'emplist'] },
  { id: 'books', kind: 'ITR', name: 'Monthly bookkeeping', docIds: ['bank', 'sales', 'purchase', 'cashbook', 'ledger', 'debtors', 'stock'] },
  { id: 'incorp', kind: 'ITR', name: 'Business registration', docIds: ['pan', 'aadhaar', 'photo', 'address', 'cheque', 'moa', 'dsc', 'udyam'] },
  { id: 'loan', kind: 'ITR', name: 'Loan application', docIds: ['pan', 'aadhaar', 'address', 'bank', 'form16', 'salary', '26as', 'bs', 'pl'] },
  { id: 'gst-qrmp', kind: 'GST', name: 'GST quarterly (QRMP)', docIds: ['sales', 'purchase', 'gstr2b', 'invoices', 'bank'] },
  { id: 'gst-1', kind: 'GST', name: 'GSTR-1 (sales return)', docIds: ['sales', 'invoices', 'cdnotes', 'hsn', 'einvoice'] },
  { id: 'gst-3b', kind: 'GST', name: 'GSTR-3B (monthly return)', docIds: ['sales', 'purchase', 'gstr2b', 'itcledger', 'rcm', 'cashledger'] },
  { id: 'gst-9c', kind: 'GST', name: 'GST audit (GSTR-9C)', docIds: ['gstr1', 'gstr3b', 'gstr2a', 'itcledger', 'gstrecon', 'bs', 'pl', 'tb'] },
  { id: 'gst-refund', kind: 'GST', name: 'GST refund claim', docIds: ['refundapp', 'invoices', 'shipbill', 'lut', 'bank', 'gstr1', 'gstr3b'] },
  { id: 'gst-export', kind: 'GST', name: 'Export and LUT', docIds: ['shipbill', 'lut', 'invoices', 'bank', 'hsn'] },
  { id: 'gst-notice', kind: 'GST', name: 'GST notice reply', docIds: ['gstnotice', 'gstr1', 'gstr3b', 'gstr2a', 'itcledger', 'invoices', 'purinv'] },
  { id: 'gst-amend', kind: 'GST', name: 'GST amendment or cancellation', docIds: ['gstcert', 'pan', 'aadhaar', 'address', 'rentagr', 'stockreg'] },
  { id: 'tds-26q', kind: 'TDS', name: 'TDS on contractors and professionals (26Q)', docIds: ['challans', 'deductees', 'vendorinv', 'contracts', 'form16a', 'bank'] },
  { id: 'tds-rent', kind: 'TDS', name: 'TDS on rent', docIds: ['rentpaid', 'contracts', 'challans', 'deductees', 'bank'] },
  { id: 'tds-27q', kind: 'TDS', name: 'TDS on non-resident payments (27Q)', docIds: ['nrdetails', 'form15ca', 'challans', 'deductees', 'contracts', 'bank'] },
  { id: 'tds-corr', kind: 'TDS', name: 'TDS return correction', docIds: ['tdsack', 'challan281', 'challans', 'deductees', 'form16a'] },
  { id: 'tds-notice', kind: 'TDS', name: 'TDS notice reply', docIds: ['tdsnotice', 'tdsack', 'challan281', 'challans', 'deductees', 'form16a'] },
  { id: 'tds-sal-decl', kind: 'TDS', name: 'Salary TDS declarations', docIds: ['form12bb', 'emplist', 'salreg', 'form15gh', 'bank'] },
  { id: 'tds-tan', kind: 'TDS', name: 'TAN registration', docIds: ['pan', 'aadhaar', 'address', 'tanreg', 'photo'] },
  { id: 'kyc', kind: 'ITR', name: 'KYC documents', docIds: ['pan', 'aadhaar', 'address', 'photo'] },
  { id: 'custom', kind: 'ITR', name: 'Custom', docIds: [] },
]
