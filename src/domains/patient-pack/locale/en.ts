/**
 * Every patient-facing string added by the surgical journey, in one table,
 * so another language can be added later as a second file with the same
 * shape (no translations yet: plain English only).
 *
 * Rules for these strings: plain words, no scores (ASA, Mallampati, Caprini,
 * RCRI), no clinical shorthand, second person ("you", "your").
 */
export const en = {
  pack: {
    title: 'YOUR SURGERY INFORMATION',
    intro: (procedure: string) =>
      `This booklet is for you. It explains your diagnosis and plan, what to buy, the cost, how to get ready for your operation (${procedure}), how to look after yourself afterwards, and your follow-up dates. Please keep it and bring it to every visit.`,
    footer: 'Your copy. Keep it safe and contact the clinic with any questions.',
    fileName: (name: string, date: string) => `surgery-information-${name}-${date}.pdf`,
    sections: {
      diagnosisPlan: 'Your diagnosis and plan',
      shopping: 'What to buy before your operation',
      cost: 'Your cost estimate',
      beforeSurgery: 'Before your operation',
      afterSurgery: 'After your operation',
      warningSigns: 'Get help straight away if',
      followUp: 'Your follow-up dates',
    },
    procedure: (name: string, date?: string) => `Your operation: ${name}${date ? `, planned for ${date}` : ''}.`,
    noReview: 'Your surgeon will explain your diagnosis and the plan for your treatment.',
    shoppingIntro: 'Please buy these items and bring them with you on the day of your operation.',
    shoppingNone: 'You do not need to buy anything in advance. Your surgeon will tell you if this changes.',
    costLine: (label: string, amount: string) => `${label}: ${amount}`,
    costLabels: { surgeon: 'Surgeon', assistant: 'Assistant surgeon', anaesthesia: 'Anaesthesia', consumables: 'Materials and supplies', total: 'Total estimate' },
    costNote: 'This is an estimate. The final bill may change if your treatment changes.',
    costNone: 'Your cost estimate will be given to you separately.',
    followUpNone: 'Your follow-up appointments will be booked after your operation and sent to you.',
    followUpLine: (date: string, time: string, reason: string) => `${date} at ${time}: ${reason}`,
    followUpIntro: 'You will also get a WhatsApp reminder before each visit. If you cannot come, please call the clinic to change the date.',
    afterGeneric: [
      'Keep your dressing clean and dry until your first check, unless you were told otherwise.',
      'Take your pain medicine as prescribed.',
      'Rest, and avoid heavy lifting or strenuous activity until your surgeon says it is safe.',
    ],
    warningGeneric: [
      'You have a fever or feel hot and shivery.',
      'Pain is getting worse instead of better.',
      'The wound becomes red, swollen, hot, smells bad, or leaks pus.',
      'Bleeding soaks through the dressing.',
      'You feel unwell, breathless, or have pain or swelling in your leg.',
    ],
    contactLine: 'Contact the clinic, or go to the nearest emergency department.',
  },
  fasting: {
    heading: 'Eating and drinking before your operation',
    general: [
      'Stop eating food (including milk, tea or coffee with milk, sweets and chewing gum) 6 hours before your operation.',
      'You may drink clear fluids (water, clear apple juice, black tea or coffee without milk) until 2 hours before your operation. Then stop drinking.',
    ],
    child: [
      'Babies: breast milk may be given until 4 hours before the operation; formula milk until 6 hours before.',
    ],
    local: [
      'If you are having a local anaesthetic only (you stay awake), you can usually eat a light meal and drink as normal. Your surgeon will tell you if you need to fast.',
    ],
    arrival: 'Please arrive at the time you were given and bring this sheet with you.',
    confirm: 'Please confirm these instructions with your surgeon or anaesthetist.',
  },
  meds: {
    heading: 'Your medicines before your operation',
    intro: 'These are the medicines we have recorded for you. Do not stop any medicine unless your surgeon or anaesthetist has told you to.',
    none: 'We have no medicines recorded for you. Please tell your surgeon about every medicine you take, including herbal remedies.',
    warfarin: (name: string) => `${name}: this is usually stopped 5 days before the operation, and a blood test is done the day before. Your surgeon will tell you exactly when to stop and restart it.`,
    doac: (name: string) => `${name}: the last dose is usually taken 1 to 2 days before the operation (longer if your kidneys do not work well). Your surgeon will tell you the exact day.`,
    heparin: (name: string) => `${name} injections: the last injection is usually given 12 to 24 hours before the operation. Your surgeon will tell you when.`,
    aspirin: (name: string) => `${name}: many people continue this. Do not stop it on your own, especially if you have a heart stent. Ask your surgeon.`,
    antiplatelet: (name: string) => `${name}: this is often stopped about 5 to 7 days before the operation. Never stop it without asking, especially if you have a heart stent.`,
    metformin: (name: string) => `${name}: do not take it on the morning of your operation. Restart when you are eating and drinking normally.`,
    sglt2: (name: string) => `${name}: stop it 3 days before your operation (4 days for ertugliflozin). Restart when you are eating and drinking normally.`,
    insulin: (name: string) => `${name}: your dose may need to change the night before and the morning of your operation. Your care team will give you a plan.`,
    herbal: (name: string) => `${name}: please stop herbal and traditional remedies 2 weeks before your operation.`,
    other: (name: string) => `${name}: ask your anaesthetist whether to take it on the morning of your operation.`,
  },
  recall: {
    whatsapp: (patient: string, what: string, clinic: string) =>
      `Dear ${patient}, this is ${clinic}. It is time for your follow-up visit (${what}). Please reply or call us to book a date that suits you. Thank you.`,
    missed: (patient: string, date: string, clinic: string) =>
      `Dear ${patient}, this is ${clinic}. We missed you at your appointment on ${date}. Please reply or call us to book a new date. Thank you.`,
  },
} as const;

export type PatientLocale = typeof en;
export const patientText: PatientLocale = en;
