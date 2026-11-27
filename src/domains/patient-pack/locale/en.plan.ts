/**
 * Patient-facing strings for the clerking treatment plan (stage 5), part of
 * the one locale table (en.ts `plan`). Same rules as en.ts: plain words, no
 * scores, no clinical shorthand, second person. Nothing about safeguarding,
 * mental health or substance use: the patient copy may be read by others.
 */

const WOUND_WARNING = [
  'The wound becomes more painful, red, hot or swollen, or starts to smell bad.',
  'Pus or a lot of fluid comes out of the wound.',
  'You have a fever, feel shivery, or feel unwell.',
  'The skin around the wound turns dark or black.',
];

/** A child's dose on the patient copy: the dose worked out for the child, or the prescription. */
const forChild = (dose?: string | null) => dose || 'the dose your doctor has written for your child\'s weight';

export const planEn = {
  copy: {
    title: 'YOUR TREATMENT PLAN',
    intro: 'This is your copy of the plan we agreed with you. It explains what we found, the tests we have asked for and why, your medicines, the treatment options, what we talked about, when to get help, and your follow-up dates. Please keep it and bring it to every visit.',
    footer: 'Your copy. Keep it safe and contact the clinic with any questions.',
    fileName: (name: string, date: string) => `treatment-plan-${name}-${date}.pdf`,
    sections: {
      diagnosis: 'What we found',
      tests: 'Your tests and why we need them',
      results: 'Your test results',
      medicines: 'Your medicines and how to take them',
      food: 'Eating to heal',
      options: 'Your treatment options',
      counselling: 'What we talked about',
      warning: 'Get help straight away if',
      followUp: 'Your follow-up visits',
    },
    noTests: 'No tests are needed at the moment.',
    noMedicines: 'No new medicines were started at this visit.',
    resultsIntro: 'Your doctor will explain what your results mean for you.',
    followUpNone: 'Your doctor will tell you when to come back.',
    followUpLine: (date: string, purpose: string) => `${date}: ${purpose}`,
    followUpUndated: (when: string, purpose: string) => `${when}: ${purpose}`,
    contactLine: 'Contact the clinic, or go to the nearest emergency department.',
    foodLine: (kcal: string | null, protein: string | null, fluid: string | null) =>
      [kcal && `Aim for about ${kcal} of food energy a day`, protein && `about ${protein} of protein a day`, fluid && `and about ${fluid} of fluid a day`]
        .filter(Boolean).join(', ') + '.',
    foods: 'Foods that help: eggs, beans and moi moi, fish (including crayfish and stockfish), chicken, milk, groundnuts and soya.',
    drink: 'If you are not eating well, a high-protein drink between meals helps.',
    generalWarning: [
      'You have a fever or feel hot and shivery.',
      'Pain is getting worse instead of better.',
      'You feel very unwell, faint or breathless.',
    ],
  },

  /** Why each test is done, in plain words (keyed by the protocol / template test id). */
  tests: {
    fbc: 'Full blood count: checks for low blood (anaemia) and signs of infection.',
    esr_crp: 'ESR and CRP: measure inflammation and infection.',
    glucose_hba1c: 'Blood sugar and HbA1c: check for diabetes and how well it is controlled.',
    eucr: 'Kidney tests: check how well your kidneys are working.',
    lft_albumin: 'Liver tests and albumin: check your liver and general health.',
    iron_studies: 'Iron tests: check whether your body is short of iron.',
    zinc: 'Zinc level, taken in the morning before you eat: zinc helps wounds close.',
    vitamin_d: 'Vitamin D level: low vitamin D is common and affects healing.',
    hiv: 'HIV test, only with your agreement: some infections slow healing and change the treatment.',
    genotype: 'Genotype test: sickle cell disease can cause ulcers and slow healing.',
    urinalysis: 'Urine test: checks for sugar, protein and infection.',
    nutrition_screen: 'Weight, height and arm measurement: to check your nutrition.',
    wound_baseline: 'Measuring and photographing your wound, so we can see it heal.',
    culture: 'A sample from deep in the wound to find the germ and choose the right antibiotic.',
    blood_culture: 'A blood test to look for germs in the blood.',
    xray: 'An X-ray to look at the bone.',
    abpi: 'A blood-flow test of the legs, before any tight bandaging.',
    duplex: 'A scan of the leg veins.',
    biopsy: 'A small piece of tissue sent to the laboratory to find out exactly what it is.',
    vasculitis: 'Blood and urine tests for inflammation of the blood vessels.',
    minerals: 'Blood minerals (magnesium, phosphate and calcium).',
    b12_folate: 'Vitamin B12 and folate levels.',
    copper: 'Copper level, checked when zinc is taken for a long time.',
    thyroid: 'A thyroid blood test.',
    child_growth: 'Weight and height on a growth chart, and stool and malaria tests if needed.',
    ultrasound: 'An ultrasound scan.',
    mri: 'An MRI scan, if available, to see the deeper tissues.',
    nerve_test: 'A nerve test, to see how much the nerve is squeezed.',
    hormones: 'Hormone blood tests, to look for a cause.',
    breast_imaging: 'A breast scan (ultrasound, and a mammogram if you are older).',
    filaria: 'A blood test for filaria (a worm infection that can block lymph drainage).',
    fbc_preop: 'Full blood count: checks the blood count before the operation.',
    genotype_preop: 'Genotype test: sickle cell status matters for a safe anaesthetic and operation.',
    syndrome_screen: 'A check of the heart, kidneys, spine or other parts of the body, as some children have other differences.',
  },

  /**
   * Medicine lines for the patient copy, in plain words (owner decision
   * 2026-11-27): the medicine, how many and what strength, how often, for how
   * long, and one key tip. No "elemental", no "e.g." product notes, no mg/kg
   * working: a child's line shows only the dose worked out for the child (or
   * says the doctor has written it, when the weight is not recorded). The
   * clinician copy keeps the full protocol wording. Keyed by medicine.
   */
  medicines: {
    multivitamin: (k: { child: boolean }) => k.child
      ? 'Children\'s multivitamin – give the dose for your child\'s age written on the label, once a day, until the wound has healed and your child is eating well.'
      : 'Multivitamin with minerals – take 1 tablet once a day until the wound has healed and you are eating well.',
    antenatal: () => 'Antenatal vitamins with folic acid – take 1 dose once a day, as written on the pack, through your pregnancy. Do not take any other vitamin A supplement.',
    vitamin_c: (k: { child: boolean; dose?: string | null }) => k.child
      ? `Vitamin C – give ${forChild(k.dose)} once a day until the wound has healed.`
      : 'Vitamin C tablet – take 500 mg once a day (or 250 mg twice a day) until the wound has healed. Tell us if you have ever had kidney stones.',
    zinc: (k: { child: boolean; dose?: string | null }) => k.child
      ? `Zinc – give ${forChild(k.dose)} once a day with food for 8–12 weeks. Do not give it at the same time as iron.`
      : 'Zinc tablet – take 1 tablet (50 mg) once a day with food for 8–12 weeks. Do not take it at the same time as your iron tablet.',
    iron: (k: { child: boolean; dose?: string | null; severe?: boolean }) => k.child
      ? `Iron – give ${forChild(k.dose)} ${k.severe ? 'a day' : 'once a day'} until 3 months after your child's blood count is back to normal. Keep it out of children's reach: too much iron is dangerous.`
      : 'Iron tablet – take 1 tablet (ferrous sulphate 200 mg) once a day or every other day, until 3 months after your blood count is back to normal. Take it with orange juice, not with tea, milk or antacids.',
    folic_acid: (k: { child: boolean; dose?: string | null; continuous: boolean }) =>
      `Folic acid${k.child ? '' : ' tablet'} – ${k.child ? `give ${forChild(k.dose)}` : 'take 5 mg'} once a day${k.continuous ? ', every day, for as long as your doctor tells you. Keep taking it even when you feel well.' : k.child ? ' for as long as your doctor tells you.' : ' for 4 months.'}`,
    vitamin_d: (k: { child: boolean; dose?: string | null; then?: string | null }) => k.child
      ? `Vitamin D3 – give ${forChild(k.dose)} once a day for 12 weeks${k.then ? `, then ${k.then} once a day` : ''}. Give it with milk or other calcium-rich food if your child eats little.`
      : 'Vitamin D3 – take 50,000 units once a week for 8 weeks, then 800 to 2,000 units once a day. Tell us if you have kidney stones.',
    b12: (k: { child: boolean }) => k.child
      ? 'Vitamin B12 injection (1 mg) – given in the clinic, with advice from a children\'s specialist.'
      : 'Vitamin B12 injection (1 mg) – given in the clinic three times a week for 2 weeks, then once every 3 months. Please keep every appointment.',
    vitamin_a: () => 'Vitamin A – take 10,000 to 25,000 units once a day for 10 to 14 days only. Do not take it if you are or could be pregnant.',
    arginine: () => 'Arginine nutrition drink – take the amount of the special drink that gives about 4.5 g of arginine a day, while the pressure sore is open.',
    paracetamol: (k: { child: boolean; dose?: string | null; light?: boolean }) => k.child
      ? `Paracetamol – give ${forChild(k.dose)} every 6 hours when needed for pain. Do not give more than 4 doses in 24 hours.`
      : k.light
        ? 'Paracetamol 500 mg tablets – take 1 or 2 tablets (500 mg to 1 g) every 6 hours when needed for pain. Do not take more than 6 tablets (3 g) in 24 hours.'
        : 'Paracetamol 500 mg tablets – take 2 tablets (1 g) every 6 hours when needed for pain. Do not take more than 8 tablets (4 g) in 24 hours.',
    ibuprofen: (k: { child: boolean; dose?: string | null }) => k.child
      ? `Ibuprofen – give ${forChild(k.dose)} every 8 hours with food when needed for pain. Do not give it if your child is not drinking or is being sick.`
      : 'Ibuprofen tablet – take 1 tablet (400 mg) three times a day with food when needed for pain. Stop it and tell us if you get stomach pain or black stools.',
    coamoxiclav: (k: { child: boolean; dose?: string | null; duration: string }) =>
      `Co-amoxiclav antibiotic – ${k.child ? `give ${forChild(k.dose)}` : 'take 1 tablet (625 mg)'} three times a day ${k.duration}. Finish the course, even if the wound looks better.`,
    clindamycin: (k: { child: boolean; dose?: string | null; duration: string; drip?: boolean }) => k.drip
      ? `Clindamycin antibiotic – given by drip in hospital at first, then by mouth, ${k.duration}. Tell us straight away if you get bad diarrhoea.`
      : `Clindamycin antibiotic – ${k.child ? `give ${forChild(k.dose)}` : `take ${k.dose || 'the dose on your prescription'}`} four times a day (every 6 hours) ${k.duration}. Tell us straight away if you get bad diarrhoea.`,
    flucloxacillin: (k: { child: boolean; dose?: string | null; duration: string; drip?: boolean }) => k.drip
      ? `Flucloxacillin antibiotic – given by drip in hospital at first, then by mouth, ${k.duration}. Finish the course, even if the skin looks better.`
      : `Flucloxacillin antibiotic – ${k.child ? `give ${forChild(k.dose)}` : 'take 1 or 2 capsules (500 mg to 1 g)'} four times a day (every 6 hours) ${k.duration}. ${k.child ? 'Give' : 'Take'} it on an empty stomach, 1 hour before food.`,
    dripAntibiotic: () => 'Antibiotics by drip – given into a vein in hospital. We choose the medicine from the wound sample and review it after 2 to 3 days.',
    doxycycline: () => 'Doxycycline – take 200 mg once a day for 6 weeks. Swallow it with a full glass of water while sitting or standing.',
    cellulitisPrevention: (k: { penicillinAllergy: boolean }) => k.penicillinAllergy
      ? 'Erythromycin tablet – take 250 mg twice a day, every day, to prevent skin infections. We will review it after 6 to 12 months.'
      : 'Penicillin V tablet – take 250 mg twice a day, every day, to prevent skin infections. Take it 1 hour before food. We will review it after 6 to 12 months.',
    clotrimazole: () => 'Clotrimazole 1% cream – rub a thin layer between the toes twice a day for 2 to 4 weeks. Dry well between the toes before you put it on.',
    tetanus: () => 'Tetanus vaccine – one injection (0.5 mL) given in the clinic. Ask us to update your vaccination card.',
    rabies: () => 'Rabies vaccine – a course of injections given in the clinic, starting today, then on days 3 and 7 (and later as we tell you), with an injection into and around the wound. Do not miss any dose.',
    propranolol: (k: { start?: string | null }) =>
      `Propranolol liquid – ${k.start ? `start with ${k.start}` : 'give the dose written on the prescription'} twice a day with a feed or food; we increase the dose at the review visits. Do not give it if your baby is not feeding or is being sick.`,
  },

  wound: {
    monitoring: 'We will measure and photograph your wound at every visit, the same way each time.',
    week4: 'At about 4 weeks we check whether the wound is shrinking well. If it is not, we look again for the cause and change the plan.',
    warning: WOUND_WARNING,
    followUp: {
      twoWeeks: 'Wound check: we measure and photograph the wound to see how it is healing',
      week4: 'Wound check at 4 weeks: is the wound shrinking well enough?',
      bloods: 'Repeat blood tests',
      zinc: 'Repeat zinc level; we stop zinc once the wound has healed',
    },
  },

  conditions: {
    syndactyly: {
      name: 'Syndactyly (fingers or toes joined together)',
      about: 'Some fingers or toes did not separate fully before birth. It is common, it is not caused by anything the parents did, and it can be treated with an operation.',
      options: {
        release: 'An operation to separate the fingers, usually with a small skin graft (skin from a hidden area such as the groin) to line the new web space.',
      },
      counselling: [
        'The best time for the operation is usually between 12 and 18 months of age. Fingers at the edge of the hand (thumb and index, ring and little) are often separated earlier, from about 6 months, so they do not pull the growing fingers crooked.',
        'Only one side of a finger is separated at a time, so more than one operation may be needed.',
        'After the operation the hand is kept in a bulky dressing or cast for about 2 to 3 weeks. Keep it clean and dry.',
        'As your child grows, the new web can creep forward, and a small further operation is sometimes needed later.',
        'An X-ray may be needed if the bones are joined.',
        'We will also check the rest of the body, as some children have other differences that need attention.',
      ],
      warning: ['After the operation: the fingers become cold, pale or blue, the dressing gets wet, smells bad, or your child has a fever.'],
    },
    polydactyly: {
      name: 'Polydactyly (an extra finger or toe)',
      about: 'An extra finger or toe formed before birth. It is common and often runs in families.',
      options: {
        excision: 'A small operation to remove the extra finger or toe, with stitches that dissolve.',
        reconstruction: 'For an extra thumb, an operation to remove the extra part and rebuild the remaining thumb so it is straight and stable, usually around 1 year of age.',
      },
      counselling: [
        'Tying a thread around the extra finger is not recommended: it can leave a painful bump or cause infection.',
        'A small extra finger on the little-finger side, on a thin stalk, can be removed in a short day-case operation.',
        'An extra thumb needs a more careful operation to make the remaining thumb stable and straight.',
        'Some children need X-rays to see the bones before the operation.',
      ],
      warning: ['After the operation: bleeding that does not stop with pressure, a fever, or the wound smells bad.'],
    },
    congenital_hand: {
      name: 'A difference in how the hand formed',
      about: 'Your child\'s hand formed differently before birth. Every hand is different, and we plan treatment around how your child uses the hand.',
      options: {
        reconstruction: 'An operation may be offered to improve how the hand works, for example widening the space between the thumb and index finger or closing a cleft, usually in the first 1 to 2 years.',
      },
      counselling: [
        'Many children with a hand difference adapt very well and use the hand for most tasks.',
        'Any operation is planned for function first; appearance is also considered.',
        'We will examine the other hand, the feet and the rest of the body, and may ask for X-rays.',
        'A family assessment may be offered, as some hand differences run in families.',
      ],
      warning: [],
    },
    trigger_finger: {
      name: 'Trigger finger (a finger that catches or locks)',
      about: 'The tendon that bends the finger is catching in a tight tunnel at the base of the finger. It is common and can be treated.',
      options: {
        splint: 'A small splint worn at night to rest the finger.',
        injection: 'A steroid injection into the tunnel at the base of the finger. It helps many people, and a second injection can be given if needed.',
        release: 'A short operation under local anaesthetic to open the tight tunnel, if injections do not work or the finger stays locked.',
      },
      counselling: [
        'Many trigger fingers settle with a splint or an injection.',
        'If you have diabetes, an injection can raise your blood sugar for a few days: check it more often.',
        'After an operation, move the finger gently from the first day.',
        'In young children a trigger thumb is different: we may watch it for a while before deciding on an operation.',
      ],
      warning: [],
    },
    dupuytren: {
      name: 'Dupuytren\'s disease (tight bands in the palm)',
      about: 'Thickened tissue under the skin of the palm forms cords that slowly pull the fingers into the palm. It is not cancer.',
      options: {
        needle: 'Needle release: the cord is divided through the skin with a needle, under local anaesthetic.',
        fasciectomy: 'An operation to remove the tight cords so the finger straightens better.',
      },
      counselling: [
        'Treatment is usually offered when you cannot put your hand flat on a table, or a finger joint is bending in.',
        'The condition can come back after any treatment.',
        'After treatment you will need hand exercises and often a night splint for some months.',
        'Tell us about diabetes and any medicines you take.',
      ],
      warning: [],
    },
    carpal_tunnel: {
      name: 'Carpal tunnel syndrome (a squeezed nerve at the wrist)',
      about: 'The nerve that gives feeling to the thumb and fingers is squeezed at the wrist. It causes tingling, numbness and weakness, often worse at night.',
      options: {
        splint: 'A wrist splint worn at night, keeping the wrist straight.',
        injection: 'A steroid injection near the nerve, which can ease the symptoms.',
        release: 'An operation under local anaesthetic to release the tight band at the wrist and take the pressure off the nerve.',
      },
      counselling: [
        'Mild symptoms often improve with a night splint.',
        'If the thumb muscles are wasting or the numbness is constant, an operation is usually advised so the nerve is not permanently damaged.',
        'A nerve test may be arranged to see how badly the nerve is squeezed.',
        'Carpal tunnel can be linked to diabetes, an underactive thyroid, pregnancy or arthritis, so we may check your blood.',
      ],
      warning: [],
    },
    ganglion: {
      name: 'Ganglion (a fluid-filled lump near a joint or tendon)',
      about: 'A ganglion is a harmless swelling filled with jelly-like fluid. Many go away on their own.',
      options: {
        observe: 'Leaving it alone and watching it: a safe choice if it does not hurt or get in the way.',
        aspiration: 'Drawing the fluid out with a needle. The lump can come back.',
        excision: 'An operation to remove the ganglion and its root. It can still come back in some people.',
      },
      counselling: [
        'A ganglion is not cancer.',
        'Do not try to burst it by hitting it.',
        'A lump at the end joint of a finger (a mucous cyst) is linked to wear in that joint, so we may take an X-ray.',
      ],
      warning: [],
    },
    hand_trauma: {
      name: 'Hand or fingertip injury',
      about: 'You have an injury to your hand or fingertip. Finding out which parts are hurt (bone, tendon, nerve, nail bed) helps us plan the right repair.',
      options: {
        repair: 'Cleaning the wound and repairing the injured parts (skin, nail bed, tendon or nerve) in theatre.',
        tip: 'For a fingertip injury: dressings to let it heal, or a repair or small flap to cover the tip, depending on the injury.',
      },
      counselling: [
        'Keep the hand raised above the level of your heart to reduce swelling.',
        'Hand exercises after the repair are as important as the operation for getting movement back.',
        'Do not remove the splint unless you are told to.',
        'Smoking slows healing.',
        'You may need a tetanus injection.',
      ],
      warning: ['The finger or hand becomes cold, pale, blue or very swollen, or the pain becomes severe.'],
    },
    facial_laceration: {
      name: 'A cut on the face',
      about: 'You have a cut on your face. We check for damage to the nerves of the face, the tear duct, the eyelid and the saliva duct before repairing it.',
      options: {
        repair: 'Careful cleaning and stitching of the cut, layer by layer, usually under local anaesthetic.',
      },
      counselling: [
        'Stitches on the face are usually removed after about 5 days.',
        'Keep the wound clean and apply the ointment you are given.',
        'Protect the scar from the sun for at least 6 months (hat, sunscreen) to help it fade.',
        'Scars take 12 to 18 months to mature, and usually soften and flatten with time.',
        'If you tend to form keloids, tell us: we may add treatment to lower the risk.',
        'You may need a tetanus injection; after a dog bite you may also need rabies vaccine.',
      ],
      warning: [],
    },
    lipoma_cyst: {
      name: 'A lump under the skin (lipoma or cyst)',
      about: 'A lipoma is a soft lump of fat. A sebaceous (epidermoid) cyst is a small sac under the skin, often with a tiny dark dot on top. Both are usually harmless.',
      options: {
        excision: 'A small operation to remove the lump, usually under local anaesthetic. The lump is sent to the laboratory.',
        observe: 'Leaving it alone and watching it, if it is small, soft and not changing.',
      },
      counselling: [
        'Removal is a choice if the lump is not causing problems, unless it is growing quickly, painful, hard or large.',
        'A cyst that is red and painful (infected) is treated first, and removed once it has settled, so it is less likely to come back.',
        'Do not squeeze a cyst.',
        'There will be a scar, usually a little longer than the lump.',
        'A large or deep lump may need a scan before the operation.',
      ],
      warning: [],
    },
    keloid: {
      name: 'Keloid or raised scar',
      about: 'A keloid is a scar that keeps growing beyond the original wound. A raised (hypertrophic) scar stays within the wound and often flattens with time.',
      options: {
        injection: 'Steroid injections into the scar every 4 to 6 weeks to flatten and soften it.',
        silicone: 'Silicone gel or sheets on the scar every day for several months.',
        excision: 'Removing the keloid, always followed by treatment to stop it coming back (injections, pressure earrings or radiotherapy).',
      },
      counselling: [
        'Cutting out a keloid without other treatment usually makes it come back bigger.',
        'For ear keloids, pressure earrings are worn day and night for several months after surgery.',
        'Treatment takes months; please keep every appointment.',
        'Avoid new piercings, tattoos and tribal marks, as they can cause new keloids.',
      ],
      warning: [],
    },
    burn_contracture: {
      name: 'Tight burn scar (burn contracture)',
      about: 'A burn scar has tightened and is pulling on a joint, limiting movement.',
      options: {
        release: 'An operation to release the tight scar and cover the gap with a skin graft or a flap of nearby skin.',
        therapy: 'Splints, stretching exercises and pressure garments, before and after any operation.',
      },
      counselling: [
        'After the operation, a splint and exercises are needed for months to stop the scar tightening again.',
        'Pressure garments may be needed to keep the new scar flat.',
        'An old burn scar that breaks down into a sore that does not heal needs to be checked, as rarely it can turn into a skin cancer.',
      ],
      warning: [],
    },
    chronic_wound: {
      name: 'A wound or ulcer that is slow to heal',
      about: 'Your wound has been slow to heal. We look for the reasons (such as blood flow, infection, blood sugar, low blood or poor nutrition) and treat each one.',
      options: {
        debridement: 'Cleaning the wound and removing dead tissue, in the clinic or in theatre.',
        compression: 'Compression bandaging, for leg ulcers caused by poor vein circulation, only after a test of the blood flow in your legs.',
        closure: 'Once the wound is clean and healthy, a skin graft or flap may be offered to close it faster.',
      },
      counselling: [
        'Keep the dressing clean and dry, and change it as advised.',
        'Raise your leg when sitting, if we advise it.',
        'Eat protein at every meal.',
        'Do not put herbs, powders or native medicine on the wound.',
        'If you smoke, stopping helps the wound heal.',
      ],
      warning: WOUND_WARNING,
    },
    diabetic_foot: {
      name: 'Diabetic foot ulcer',
      about: 'Diabetes can reduce feeling and blood flow in the feet, so small injuries become ulcers that heal slowly and can get infected.',
      options: {
        debridement: 'Removing dead and infected tissue, in the clinic or in theatre.',
        offloading: 'Taking pressure off the ulcer with a special shoe, a cast or crutches.',
        amputation: 'If infection or dead tissue spreads, an operation to remove part of a toe or the foot may be needed to save the leg.',
      },
      counselling: [
        'Keep weight off the foot as much as you can: the ulcer will not heal while you walk on it.',
        'Keep your blood sugar under control: this helps healing and fights infection.',
        'Check both feet every day for cuts, blisters, redness or swelling.',
        'Never walk barefoot, and wear shoes that fit well.',
      ],
      warning: [...WOUND_WARNING, 'Your blood sugar stays very high or very low.'],
    },
    pressure_injury: {
      name: 'Pressure sore',
      about: 'Pressure on the skin over a bony area has damaged the skin and the tissue under it.',
      options: {
        debridement: 'Removing dead tissue to help healing.',
        flap: 'For a deep sore that does not heal, an operation to close it with nearby tissue, once nutrition and pressure relief are right.',
      },
      counselling: [
        'Change position at least every 2 hours, day and night.',
        'Use a pressure-relieving mattress or cushion if you can.',
        'Keep the skin clean and dry, especially after passing urine or stool.',
        'Food with protein at every meal helps healing.',
        'Check the skin every day for new red areas.',
      ],
      warning: WOUND_WARNING,
    },
    cellulitis_abscess: {
      name: 'Skin infection (cellulitis) or abscess (a collection of pus)',
      about: 'Germs have infected the skin and the tissue under it. An abscess is a pocket of pus that needs draining.',
      options: {
        drainage: 'Opening and draining the abscess, under local or general anaesthetic.',
        antibiotics: 'Antibiotics, when the infection is spreading in the skin.',
      },
      counselling: [
        'Take the antibiotics exactly as prescribed and finish the course.',
        'Raise the affected arm or leg to reduce swelling.',
        'We drew a line around the redness: if it spreads beyond the line, come back.',
        'If you have diabetes, check your blood sugar more often while you have an infection.',
      ],
      warning: [
        'The redness spreads quickly, the skin turns dark or blistered, or the pain becomes severe.',
        'You feel faint, confused or very unwell, or have a high fever.',
      ],
    },
    breast_hypertrophy: {
      name: 'Large breasts causing symptoms',
      about: 'Very large breasts can cause neck, back and shoulder pain, bra-strap grooves and skin rashes under the breasts.',
      options: {
        support: 'A well-fitted supportive bra, physiotherapy and weight management.',
        reduction: 'Breast reduction: an operation to remove breast tissue and skin and lift the breasts.',
      },
      counselling: [
        'Reaching a healthy weight before surgery gives a better and safer result.',
        'There will be permanent scars around the nipple and under the breast.',
        'Breastfeeding may not be possible after a reduction, and nipple feeling may change.',
        'Stopping smoking at least 4 weeks before surgery lowers the risk of wound problems.',
        'A breast scan may be arranged before the operation.',
      ],
      warning: [],
    },
    gynaecomastia: {
      name: 'Enlarged breast tissue in a man or boy (gynaecomastia)',
      about: 'Breast tissue has grown in the chest. In teenage boys it is common and often goes away on its own within 1 to 2 years.',
      options: {
        observe: 'Waiting and checking again, especially in teenagers, as most cases settle.',
        excision: 'An operation to remove the extra tissue (liposuction, removal through a small cut at the edge of the nipple, or both).',
      },
      counselling: [
        'Some medicines and body-building supplements can cause it: tell us everything you take.',
        'Blood tests may be done to look for a hormone cause.',
        'Tell us if you notice a lump in a testicle.',
      ],
      warning: [],
    },
    vascular_anomaly: {
      name: 'A birthmark made of blood vessels (haemangioma or vascular malformation)',
      about: 'An infantile haemangioma grows in the first months of life and then slowly shrinks over years. A vascular malformation is present from birth and grows with the child.',
      options: {
        observe: 'Watching it with photos at each visit, as most haemangiomas shrink with time.',
        propranolol: 'A medicine (propranolol) to shrink a haemangioma that is in a risky place, has formed a sore, or is growing fast.',
        sclerotherapy: 'For some malformations, injections to shrink the vessels, or an operation.',
        excision: 'An operation to remove a leftover lump or loose skin after a haemangioma has shrunk.',
      },
      counselling: [
        'Most haemangiomas need no treatment and shrink with time.',
        'If your baby is on propranolol: give each dose with a feed or food, and do not give it if your baby is not feeding or is vomiting, as it can lower blood sugar.',
        'If the birthmark bleeds, press on it firmly with a clean cloth for 10 minutes.',
      ],
      warning: [
        'The birthmark bleeds and does not stop with pressure, or forms a sore.',
        'A baby on propranolol is unusually sleepy, sweaty, floppy, cold or wheezy, or is not feeding.',
        'A lump near the eye, nose or mouth affects sight, breathing or feeding.',
      ],
    },
    pigmented_lesion: {
      name: 'A mole or skin growth that needs checking',
      about: 'A mole or skin growth has features that need a closer look. Removing it (or a piece of it) and examining it in the laboratory tells us exactly what it is.',
      options: {
        excisionBiopsy: 'An operation to remove the whole growth with a small margin of normal skin, sent to the laboratory.',
        incisionalBiopsy: 'For a large growth, a small piece is taken first to make the diagnosis.',
        wideExcision: 'If the result shows a skin cancer, a second operation with a wider margin, and sometimes a check of the lymph glands.',
      },
      counselling: [
        'We will tell you the laboratory result at your next visit; please come back for it.',
        'Protect your skin from the sun: wide hat, long sleeves, shade and sunscreen.',
        'Check your skin, including the soles, palms and nails, for new or changing spots.',
        'If you have albinism, sun protection and regular skin checks are especially important.',
      ],
      warning: ['The growth bleeds, breaks down, or grows quickly before your next visit.'],
    },
    lymphoedema: {
      name: 'Lymphoedema (long-term swelling of a limb)',
      about: 'The lymph drainage of the limb is not working well, so fluid builds up and the limb swells. It can be controlled with daily care.',
      options: {
        decongestive: 'Decongestive therapy: special massage, layered bandaging, then fitted compression stockings.',
        surgery: 'Surgery is considered only for some people, after a period of good compression care.',
      },
      counselling: [
        'Wash and dry the skin carefully every day, especially between the toes, and moisturise.',
        'Treat any cut, scratch or fungal infection between the toes early, as infection makes the swelling worse.',
        'Wear shoes and socks outdoors.',
        'Wear your compression garment every day, and raise the leg when resting.',
        'Keep moving and exercise.',
      ],
      warning: ['The limb becomes red, hot and more painful, or you have a fever: this is an infection that needs antibiotics quickly.'],
    },
    hypospadias: {
      name: 'Hypospadias (the opening of the penis is not at the tip)',
      about: 'The opening where urine comes out is on the underside of the penis instead of at the tip. It is common and can be repaired with an operation.',
      options: {
        repair: 'An operation to move the opening to the tip and straighten the penis, usually between 6 and 18 months of age.',
      },
      counselling: [
        'Do not circumcise your baby: the foreskin is often used in the repair.',
        'Some children need more than one operation.',
        'After the operation a small tube may drain urine for about a week.',
        'We will check that both testicles are in the scrotum.',
      ],
      warning: ['After the operation: your child cannot pass urine, the tube falls out or blocks, or there is bleeding or fever.'],
    },
    other: {
      name: 'Your condition',
      about: 'Your doctor will explain what was found and the plan.',
      options: {},
      counselling: [],
      warning: [],
    },
  },
} as const;

export type PlanLocale = typeof planEn;
export type ConditionLocale = PlanLocale['conditions'][keyof PlanLocale['conditions']];
