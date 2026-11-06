/**
 * Citations for config v1. Every number in nutritionConfig.v1.ts names one of
 * these by id.
 *
 * verifiedAgainstPrimary is false for every source in v1: the numbers were
 * entered by the engine's author and have not yet been checked line by line
 * against the primary publications. That check is item 1 of the sign-off
 * checklist in docs/NUTRITION_ENGINE.md.
 */

import type { Source } from './types';

const s = (citation: string, note?: string): Source => ({ citation, verifiedAgainstPrimary: false, note });

export const SOURCES_V1: Record<string, Source> = {
  chumlea1985: s('Chumlea WC, Roche AF, Steinbaugh ML. Estimating stature from knee height for persons 60 to 90 years of age. J Am Geriatr Soc. 1985;33(2):116-120.'),
  chumlea1994: s('Chumlea WC, Guo SS, Steinbaugh ML. Prediction of stature from knee height for black and white adults and children with application to mobility-impaired or handicapped persons. J Am Diet Assoc. 1994;94(12):1385-1388.'),
  chumlea1998: s('Chumlea WC, Guo SS, Wholihan K, Cockram D, Kuczmarski RJ, Johnson CL. Stature prediction equations for elderly non-Hispanic white, non-Hispanic black, and Mexican-American persons developed from NHANES III data. J Am Diet Assoc. 1998;98(2):137-142.'),
  chumlea1988: s('Chumlea WC, Guo S, Roche AF, Steinbaugh ML. Prediction of body weight for the nonambulatory elderly from anthropometry. J Am Diet Assoc. 1988;88(5):564-568.'),
  rossRaceSpecificWeight: s('TODO: race- and age-specific weight-from-knee-height-and-MUAC equations (Ross Laboratories / Chumlea, 1993). Primary source not confirmed; coefficients deliberately not entered.'),
  nigerianAnthropometry: s('TODO: a published Nigerian/West African stature or weight prediction equation. None entered: no coefficient could be confirmed from a citable primary source.'),
  bapenMust2003: s("Elia M (ed). The 'MUST' Explanatory Booklet. Redditch: BAPEN; 2003 (MUAC guidance; alternative height measurements table).",
    'Ulna equations are a linear fit that reproduces the published ulna-length table; BAPEN publishes the table, not the equations.'),
  osterkamp1995: s('Osterkamp LK. Current perspective on assessment of human body proportions of relevance to amputees. J Am Diet Assoc. 1995;95(2):215-218.'),
  devine1974: s('Devine BJ. Gentamicin therapy. Drug Intell Clin Pharm. 1974;8:650-655.'),
  canonicalEngine: s('CareBridge shared calculation engine, src/domains/calculators/engine/calculationEngine.ts (calculateBMI, Devine IBW, AdjBW, Mifflin-St Jeor, revised Harris-Benedict).'),
  ewgsop2: s('Cruz-Jentoft AJ, Bahat G, Bauer J, et al. Sarcopenia: revised European consensus on definition and diagnosis. Age Ageing. 2019;48(1):16-31.'),
  blackburn1977: s('Blackburn GL, Bistrian BR, Maini BS, Schlamm HT, Smith MF. Nutritional and metabolic assessment of the hospitalized patient. JPEN. 1977;1(1):11-22.'),
  kondrup2003: s('Kondrup J, Rasmussen HH, Hamberg O, Stanga Z; ESPEN Working Group. Nutritional risk screening (NRS 2002). Clin Nutr. 2003;22(3):321-336.'),
  detsky1987: s('Detsky AS, McLaughlin JR, Baker JP, et al. What is subjective global assessment of nutritional status? JPEN. 1987;11(1):8-13.'),
  glim2019: s('Cederholm T, Jensen GL, Correia MITD, et al. GLIM criteria for the diagnosis of malnutrition. Clin Nutr. 2019;38(1):1-9.'),
  heyland2011: s('Heyland DK, Dhaliwal R, Jiang X, Day AG. Identifying critically ill patients who benefit the most from nutrition therapy: the NUTRIC score. Crit Care. 2011;15(6):R268.'),
  rahman2016: s('Rahman A, Hasan RM, Agarwala R, et al. Identifying critically-ill patients who will benefit most from nutritional therapy: further validation of the "modified NUTRIC" score. Clin Nutr. 2016;35(1):158-162.'),
  mifflin1990: s('Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.'),
  harrisBenedict1919: s('Harris JA, Benedict FG. A Biometric Study of Basal Metabolism in Man. Washington DC: Carnegie Institution; 1919. Publication 279.'),
  rozaShizgal1984: s('Roza AM, Shizgal HM. The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass. Am J Clin Nutr. 1984;40(1):168-182.'),
  long1979: s('Long CL, Schaffel N, Geiger JW, Schiller WR, Blakemore WS. Metabolic response to injury and illness: estimation of energy and protein needs from indirect calorimetry and nitrogen balance. JPEN. 1979;3(6):452-456.'),
  frankenfield2004: s('Frankenfield D, Smith JS, Cooney RN. Validation of 2 approaches to predicting resting metabolic rate in critically ill patients. JPEN. 2004;28(4):259-264. (Penn State 2003b)'),
  frankenfield2009: s('Frankenfield DC, Coleman A, Alam S, Cooney RN. Analysis of estimation methods for resting metabolic rate in critically ill adults. JPEN. 2009;33(1):27-36. (Penn State 2010 / modified)'),
  allard1990: s('Allard JP, Pichard C, Hoshino E, et al. Validation of a new formula for calculating the energy requirements of burn patients. JPEN. 1990;14(2):115-118. (Toronto formula)'),
  curreri1974: s('Curreri PW, Richmond D, Marvin J, Baxter CR. Dietary requirements of patients with major burns. J Am Diet Assoc. 1974;65(4):415-417.'),
  espenIcu2006: s('Kreymann KG, Berger MM, Deutz NEP, et al. ESPEN Guidelines on Enteral Nutrition: Intensive care. Clin Nutr. 2006;25(2):210-223.'),
  espenIcu2019: s('Singer P, Blaser AR, Berger MM, et al. ESPEN guideline on clinical nutrition in the intensive care unit. Clin Nutr. 2019;38(1):48-79.'),
  aspen2016: s('McClave SA, Taylor BE, Martindale RG, et al. Guidelines for the provision and assessment of nutrition support therapy in the adult critically ill patient: SCCM and ASPEN. JPEN. 2016;40(2):159-211.'),
  espenBurns2013: s('Rousseau AF, Losser MR, Ichai C, Berger MM. ESPEN endorsed recommendations: nutritional therapy in major burns. Clin Nutr. 2013;32(4):497-502.'),
  kdoqi2020: s('Ikizler TA, Burrowes JD, Byham-Gray LD, et al. KDOQI clinical practice guideline for nutrition in CKD: 2020 update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1-S107.'),
  niceCg32: s('NICE CG32. Nutrition support for adults: oral nutrition support, enteral tube feeding and parenteral nutrition. 2006, updated 2017.'),
  wishnofsky1958: s('Wishnofsky M. Caloric equivalents of gained or lost weight. Am J Clin Nutr. 1958;6(5):542-546.',
    'Static model. Hall KD et al. (Lancet 2011;378:826-837) show it over-predicts long-term loss; projections are indicative only.'),
  nhlbi1998: s('NHLBI. Clinical guidelines on the identification, evaluation, and treatment of overweight and obesity in adults. NIH Publication 98-4083; 1998.'),
  jensen2013: s('Jensen MD, Ryan DH, Apovian CM, et al. 2013 AHA/ACC/TOS guideline for the management of overweight and obesity in adults. Circulation. 2014;129(25 Suppl 2):S102-S138.'),
  espenMicronutrients2022: s('Berger MM, Shenkin A, Schweinlin A, et al. ESPEN micronutrient guideline. Clin Nutr. 2022;41(6):1357-1424.'),
  localPolicy: s('Module specification / local unit policy (UNTH Enugu). Not a published threshold: requires local clinical sign-off.',
    'Values marked localPolicy are operational choices, not evidence-derived cut-offs.'),
};
