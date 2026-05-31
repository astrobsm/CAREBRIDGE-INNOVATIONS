const db = require('../config/db');

// ============================================================
// CURATED NIGERIAN HOME CHORE LIBRARY
// Age bands (typical, adjustable):
//   3-5  toddler  | 6-8 early-primary | 9-12 primary
//   13-15 JSS     | 16-18 SSS/young adult
// Gender: 'any' (default), 'male', 'female' — based on TRADITIONAL
// Nigerian household defaults but every chore is assignable to any child.
// ============================================================
const LIBRARY = [
  // ---------- 3–5 TODDLERS / NURSERY ----------
  { code:'pack_own_toys', name:'Pack Own Toys After Play', category:'tidying', icon:'🧸', min_age:3, max_age:8, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Stop play 10 mins before bedtime','Pick up every toy from floor','Drop each toy into the right basket','Push basket back to corner'], nigerian_context:'Teach early — "if you carry am out, you must return am".' },
  { code:'put_dirty_clothes_basket', name:'Put Dirty Clothes in Laundry Basket', category:'laundry', icon:'🧺', min_age:3, max_age:18, default_points:1, default_duration_minutes:2, frequency:'daily', difficulty:1,
    steps:['Remove the day\'s worn clothes','Check pockets for paper/sweet wrappers','Drop in the correct basket (whites/colours)','Place school socks separately for soaking'] },
  { code:'arrange_own_shoes', name:'Arrange Own Shoes on Rack', category:'tidying', icon:'👟', min_age:3, max_age:18, default_points:1, default_duration_minutes:3, frequency:'daily', difficulty:1,
    steps:['Remove shoes at the door','Tap soles together to knock off sand','Place pair side-by-side on rack','Push slippers under the rack'] },
  { code:'fetch_slippers', name:'Fetch Slippers / Bring Items on Request', category:'errand', icon:'🩴', min_age:3, max_age:8, default_points:1, default_duration_minutes:2, frequency:'daily', difficulty:1,
    steps:['Listen carefully to what is asked','Walk (don\'t run) to fetch it','Hand over with two hands or say "here it is"'], nigerian_context:'Builds the cultural value of respect and responsiveness.' },
  { code:'water_small_plants', name:'Water Small Indoor Plants', category:'garden', icon:'🪴', min_age:4, max_age:10, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Fill small watering can half-way','Water at the base of each plant slowly','Wipe any water that spills on the floor'] },

  // ---------- 6–8 EARLY PRIMARY ----------
  { code:'make_own_bed', name:'Make Own Bed', category:'bedroom', icon:'🛏️', min_age:6, max_age:18, default_points:3, default_duration_minutes:5, frequency:'daily', difficulty:2,
    steps:['Straighten the bedsheet from all four corners','Fluff and lay pillows neatly at the head','Fold blanket/duvet at the foot of the bed','Tuck mosquito net if used'] },
  { code:'sweep_own_room', name:'Sweep Own Bedroom', category:'room_clean', icon:'🧹', min_age:6, max_age:18, default_points:4, default_duration_minutes:10, frequency:'daily', difficulty:2,
    steps:['Move chairs and small items aside','Sweep from corners towards the door','Gather dust into dustpan','Empty into the bin and return broom'] },
  { code:'feed_pets', name:'Feed Pets (Dog/Cat/Birds)', category:'pets', icon:'🐶', min_age:6, max_age:18, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Wash the food/water bowl','Measure the correct portion of food','Refill clean water','Return measuring scoop to the bag'] },
  { code:'set_table', name:'Set Dining Table for Meal', category:'mealtime', icon:'🍽️', min_age:6, max_age:18, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Wipe table top with clean cloth','Place mats for each person','Lay plate, spoon, fork, knife','Add cups and serving spoons'] },
  { code:'clear_table', name:'Clear Dining Table After Meal', category:'mealtime', icon:'🧽', min_age:6, max_age:18, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Carry plates carefully to the sink','Scrape leftovers into the bin','Wipe table with damp cloth','Push chairs back in place'] },
  { code:'fold_socks_undies', name:'Fold Own Socks & Underwear', category:'laundry', icon:'🧦', min_age:6, max_age:18, default_points:2, default_duration_minutes:8, frequency:'weekend', suggested_day:'sunday', difficulty:1,
    steps:['Pair socks correctly','Fold each pair into ball or flat','Fold underwear into thirds','Stack neatly into drawer'] },
  { code:'polish_own_shoes', name:'Polish Own School Shoes', category:'footwear', icon:'👞', min_age:6, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekend', suggested_day:'sunday', suggested_time:'17:00', difficulty:2,
    steps:['Lay newspaper on the floor','Brush off dust from shoes','Apply small amount of polish with cloth','Shine with brush until it gleams','Return polish, brush and newspaper'] },
  { code:'dust_low_furniture', name:'Dust Tables / TV Stand', category:'common_areas', icon:'🪣', min_age:6, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekly', suggested_day:'saturday', difficulty:2,
    steps:['Lift items off the surface','Wipe with slightly damp cloth','Dry with clean cloth','Place items back tidily'] },
  { code:'sort_laundry_basket', name:'Sort Family Laundry Basket', category:'laundry', icon:'🧺', min_age:7, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekend', suggested_day:'saturday', difficulty:2,
    steps:['Empty basket onto clean mat','Separate whites from colours','Pull out delicates (lace, ankara, lingerie)','Pull out heavy items (jeans, towels)','Return to labelled piles'] },
  { code:'wash_own_plate', name:'Wash Own Plate After Eating', category:'dishes', icon:'🍽️', min_age:7, max_age:18, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Scrape leftover into bin','Rinse plate under tap','Apply sponge with small soap','Rinse until no slippery feel','Place on drying rack face-down'], nigerian_context:'Standard rule from age 7: "wey clean your own plate".' },

  // ---------- 9–12 PRIMARY ----------
  { code:'full_room_clean', name:'Full Bedroom Cleaning', category:'room_clean', icon:'🧼', min_age:9, max_age:18, default_points:8, default_duration_minutes:30, frequency:'weekly', suggested_day:'saturday', suggested_time:'09:00', difficulty:3,
    steps:['Open windows for ventilation','Strip bed, take linens to laundry','Dust all surfaces top-down','Sweep and then mop the floor','Wipe windows and mirror','Spray room freshener','Remake the bed with fresh sheets'] },
  { code:'mop_floor', name:'Mop Tiled Floor', category:'common_areas', icon:'🪣', min_age:9, max_age:18, default_points:5, default_duration_minutes:20, frequency:'weekly', suggested_day:'saturday', difficulty:3,
    steps:['Sweep floor thoroughly first','Fill bucket with water + Dettol or floor cleaner','Wring mop until just damp','Mop from far corner backwards to the door','Empty dirty water and rinse mop'], safety_notes:'Put a "wet floor" warning so siblings don\'t slip.' },
  { code:'take_out_trash', name:'Take Out the Trash', category:'common_areas', icon:'🗑️', min_age:9, max_age:18, default_points:2, default_duration_minutes:5, frequency:'daily', difficulty:1,
    steps:['Tie bag securely','Wipe inside of bin if dirty','Fix new nylon liner','Drop bag in outside refuse spot','Wash hands afterwards'] },
  { code:'sweep_compound', name:'Sweep Compound / Front of House', category:'outdoor', icon:'🌳', min_age:9, max_age:18, default_points:5, default_duration_minutes:20, frequency:'weekend', suggested_day:'saturday', suggested_time:'07:00', difficulty:3,
    steps:['Sprinkle small water to settle dust','Sweep from inside compound towards the gate','Gather leaves and litter into one heap','Pack into refuse bag','Return long broom to its corner'], nigerian_context:'Early-morning compound sweep before sun gets hot.' },
  { code:'weed_garden', name:'Weed Small Garden Plot', category:'garden', icon:'🌱', min_age:10, max_age:18, default_points:6, default_duration_minutes:30, frequency:'weekly', suggested_day:'saturday', difficulty:3,
    steps:['Wear gardening gloves','Pull weeds at the root','Pile weeds to one side','Loosen soil around plants','Water lightly afterwards'], safety_notes:'Watch for snakes/scorpions in tall grass.' },
  { code:'clean_bathroom_basin', name:'Clean Bathroom Basin & Toilet Seat', category:'bathroom', icon:'🚿', min_age:9, max_age:18, default_points:4, default_duration_minutes:15, frequency:'weekly', suggested_day:'saturday', difficulty:3,
    steps:['Wear rubber gloves','Apply Harpic/cleaner to basin and toilet','Scrub with toilet brush','Rinse thoroughly','Wipe taps and mirror'], supplies_needed:'Harpic, gloves, toilet brush, cloth' },
  { code:'hand_wash_undies', name:'Hand-Wash Own Underwear', category:'laundry', icon:'🩲', min_age:9, max_age:18, default_points:3, default_duration_minutes:15, frequency:'daily', difficulty:2,
    steps:['Soak in soapy water for 5 mins','Scrub gently','Rinse 2-3 times in clean water','Wring out water','Hang on private line/rack'], nigerian_context:'Personal items washed daily, never by housemaids or stored dirty.' },
  { code:'iron_school_uniform', name:'Iron School Uniform', category:'laundry', icon:'👕', min_age:11, max_age:18, default_points:5, default_duration_minutes:15, frequency:'weekly', suggested_day:'sunday', suggested_time:'18:00', difficulty:3,
    steps:['Set iron to correct heat for fabric','Lightly spray water if needed','Iron collar and cuffs first','Iron sleeves flat','Iron body — front then back','Hang immediately on hanger','Switch off and unplug iron'], safety_notes:'Always unplug. Never leave hot iron face-down.' },
  { code:'peel_yam_cassava', name:'Peel Yam / Cassava / Plantain', category:'kitchen', icon:'🥔', min_age:10, max_age:18, default_points:4, default_duration_minutes:15, frequency:'adhoc', difficulty:3,
    steps:['Wash item under running water','Cut into manageable lengths','Peel away from your body','Drop into bowl of clean water','Wash hands with soap'], safety_notes:'Use a peeler, not a sharp knife, until confident.' },
  { code:'run_local_errand', name:'Run Local Errand (Buy Bread / Pure Water)', category:'errand', icon:'🛍️', min_age:9, max_age:18, default_points:3, default_duration_minutes:15, frequency:'adhoc', difficulty:2,
    steps:['Repeat the request to confirm','Take exact money + small extra','Confirm price before paying','Collect change and the item','Hand both back on return'], nigerian_context:'Standard "send-am-go-buy-something" responsibility.' },
  { code:'polish_furniture', name:'Polish Wooden Furniture', category:'common_areas', icon:'🪑', min_age:10, max_age:18, default_points:4, default_duration_minutes:15, frequency:'monthly', difficulty:2,
    steps:['Dust the wood first','Spray Pledge / apply polish on cloth','Rub in circles along the grain','Buff dry with second cloth'] },

  // ---------- 13–15 JSS ----------
  { code:'full_laundry_cycle', name:'Full Hand-Wash Laundry Cycle', category:'laundry', icon:'🧺', min_age:13, max_age:18, default_points:10, default_duration_minutes:90, frequency:'weekend', suggested_day:'saturday', suggested_time:'07:00', difficulty:4,
    steps:['Soak whites in OMO + bleach (separately)','Wash whites first, then colours','Scrub collars and cuffs with brush','Rinse 2-3 times until water is clear','Wring or spin-dry','Hang inside-out in sun','Bring in before evening dew','Fold and store'], nigerian_context:'Saturday is laundry day for most homes.' },
  { code:'wash_school_uniform_midweek', name:'Mid-Week School Uniform Wash', category:'laundry', icon:'👔', min_age:11, max_age:18, default_points:5, default_duration_minutes:30, frequency:'weekly', suggested_day:'wednesday', suggested_time:'15:30', difficulty:3,
    steps:['Soak uniform in soapy water','Scrub collar, cuffs and armpits','Rinse thoroughly','Spin/wring well','Hang under shade if rain threatens','Iron Thursday evening'] },
  { code:'scrub_floor', name:'Scrub Floor / Bathroom Tiles with Brush', category:'bathroom', icon:'🧽', min_age:13, max_age:18, default_points:6, default_duration_minutes:30, frequency:'weekly', suggested_day:'saturday', difficulty:4,
    steps:['Pour Harpic/Vim on tiles','Scrub with long-handle brush','Pay attention to grout lines','Flush down with water','Squeegee dry'], safety_notes:'Wear slippers — tiles get slippery.' },
  { code:'cook_jollof_rice', name:'Cook Jollof Rice (Full Pot)', category:'kitchen', icon:'🍛', min_age:13, max_age:18, default_points:10, default_duration_minutes:75, frequency:'adhoc', difficulty:4,
    steps:['Wash and parboil rice; drain','Blend tomato, pepper, onion, scotch bonnet','Fry blended mix in oil with bay leaf','Add stock, seasoning, curry, thyme','Stir in rice; cover with foil + lid','Cook on low heat 25–30 mins','Stir gently from bottom; let smoky bottom form','Turn off and let it rest 5 mins'], safety_notes:'Stand back when adding water to hot oil.' },
  { code:'cook_stew', name:'Cook Tomato Stew (Family Pot)', category:'kitchen', icon:'🍲', min_age:13, max_age:18, default_points:8, default_duration_minutes:60, frequency:'weekly', difficulty:4,
    steps:['Boil meat with onion + seasoning; reserve stock','Blend tomato + pepper + onion; boil down to thicken','Heat oil; fry sliced onion','Add tomato paste; fry till oil floats','Pour in boiled blend; cook 15 mins','Add meat, stock, seasoning','Simmer 10 mins; taste and adjust salt'] },
  { code:'grind_pepper_market', name:'Grind Pepper at Market / Use Blender', category:'kitchen', icon:'🌶️', min_age:12, max_age:18, default_points:3, default_duration_minutes:20, frequency:'weekly', difficulty:2,
    steps:['Wash tomato, pepper, onion','Cut roughly to fit blender','Blend in batches with little water','Pour into clean bowl with cover','Clean blender immediately'] },
  { code:'market_run_supervised', name:'Market Run with Supervision', category:'errand', icon:'🛒', min_age:13, max_age:18, default_points:8, default_duration_minutes:90, frequency:'weekly', suggested_day:'saturday', difficulty:3,
    steps:['Take shopping list and money pouch','Greet sellers properly','Price-check before paying','Bargain politely (no shouting)','Inspect items before bagging','Count change carefully','Return list with receipts/balance'], nigerian_context:'Builds confidence in pricing and money handling.' },
  { code:'wash_siblings_clothes', name:'Wash Younger Siblings\' Clothes', category:'laundry', icon:'👶', min_age:14, max_age:18, default_points:6, default_duration_minutes:45, frequency:'weekend', suggested_day:'saturday', difficulty:3, gender:'female',
    steps:['Separate stained items for pre-soak','Use mild soap for delicates','Hand-wash carefully','Rinse thoroughly','Hang in sun'], nigerian_context:'Traditionally older sisters help with the little ones — boys can do too.' },
  { code:'clean_fridge', name:'Clean Out the Fridge', category:'kitchen', icon:'❄️', min_age:13, max_age:18, default_points:5, default_duration_minutes:30, frequency:'biweekly', difficulty:3,
    steps:['Empty all shelves','Throw out expired/spoilt items','Remove shelves; wash with warm soapy water','Wipe interior with vinegar+water','Dry completely; replace shelves','Restock neatly by category'] },
  { code:'fumigate_room', name:'Fumigate Room (Raid / Mortein)', category:'bedroom', icon:'🦟', min_age:13, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekly', suggested_day:'saturday', difficulty:2,
    steps:['Cover food and water','Close windows','Spray corners, under bed, behind wardrobe','Leave room for 30+ mins','Open windows to ventilate before sleeping'], safety_notes:'Never spray near a flame. Never inhale.' },
  { code:'wash_water_tank', name:'Help Wash Overhead Water Tank', category:'outdoor', icon:'💧', min_age:14, max_age:18, default_points:8, default_duration_minutes:60, frequency:'monthly', difficulty:4, gender:'male',
    steps:['Drain tank to empty','Scrub interior walls with long brush + Dettol','Rinse 2-3 times','Refill and check inlet/outlet'], safety_notes:'Adult must be present. Never enter the tank.' },

  // ---------- 16–18 SSS / YOUNG ADULT ----------
  { code:'wash_family_car', name:'Wash Family Car (Daddy/Mummy)', category:'outdoor', icon:'🚗', min_age:12, max_age:18, default_points:10, default_duration_minutes:60, frequency:'weekend', suggested_day:'saturday', suggested_time:'09:30', difficulty:3, gender:'male',
    steps:['Remove litter from inside the car','Vacuum mats and seats','Wipe dashboard and steering','Rinse car body with clean water','Wash with car shampoo from top down','Rinse off soap completely','Dry with microfibre cloth','Clean tyres and rims','Apply tyre shine','Return all tools to the boot'], supplies_needed:'Bucket, sponge, car shampoo, microfibre cloth, tyre shine', nigerian_context:'Weekend duty for the boys — taught from age 12 with supervision.' },
  { code:'full_kitchen_management', name:'Full Kitchen Management (Day)', category:'kitchen', icon:'👨‍🍳', min_age:16, max_age:18, default_points:15, default_duration_minutes:240, frequency:'weekend', difficulty:5,
    steps:['Plan day\'s menu (breakfast, lunch, dinner)','Take inventory; note items running low','Wash all utensils before and after each cook','Cook each meal on time','Serve family neatly','Pack leftovers properly into containers','Wipe down cooker, sink and counter'] },
  { code:'family_meal_prep', name:'Cook Family Meal Solo', category:'kitchen', icon:'🍲', min_age:15, max_age:18, default_points:12, default_duration_minutes:120, frequency:'weekly', difficulty:4,
    steps:['Confirm menu with Mum','Bring out all ingredients','Wash and prep proteins/vegetables','Cook each component in sequence','Plate and serve','Wash all pots and utensils used'] },
  { code:'weekly_market_shop', name:'Weekly Market Shopping (Solo)', category:'errand', icon:'🛒', min_age:16, max_age:18, default_points:12, default_duration_minutes:180, frequency:'weekly', suggested_day:'saturday', difficulty:4,
    steps:['Get the shopping list and budget','Go early (cooler, fresher)','Compare prices across stalls','Bargain firmly but politely','Check expiry dates','Bag perishables separately','Return change with receipts'] },
  { code:'fix_simple_plumbing', name:'Fix Simple Plumbing (Tap / Hose)', category:'maintenance', icon:'🔧', min_age:14, max_age:18, default_points:6, default_duration_minutes:30, frequency:'adhoc', difficulty:3, gender:'male',
    steps:['Turn off water supply','Identify the leak (washer, joint, hose)','Replace washer or tighten joint','Turn supply back on; check'], safety_notes:'Call adult if pipe must be cut.' },
  { code:'manage_generator', name:'Manage Generator (Fuel, Oil, Start/Stop)', category:'maintenance', icon:'⚡', min_age:14, max_age:18, default_points:6, default_duration_minutes:15, frequency:'adhoc', difficulty:3, gender:'male',
    steps:['Check fuel level — refill if low','Check engine oil dipstick monthly','Switch off mains before starting gen','Pull start cord with steady pull','Plug change-over after running 1 min','Switch off and let cool before refuelling'], safety_notes:'NEVER refuel while running or hot. Keep gen outside, never in closed room — CO kills.' },
  { code:'supervise_siblings_homework', name:'Supervise Younger Siblings\' Homework', category:'family', icon:'📚', min_age:14, max_age:18, default_points:5, default_duration_minutes:60, frequency:'daily', suggested_time:'18:00', difficulty:3,
    steps:['Sit them at the dining table','Check school diary for assignments','Help only when stuck — don\'t do it for them','Cross-check completed work','Sign or stamp their diary'] },
  { code:'deep_clean_sitting_room', name:'Deep Clean Sitting Room', category:'common_areas', icon:'🛋️', min_age:13, max_age:18, default_points:8, default_duration_minutes:45, frequency:'weekly', suggested_day:'saturday', difficulty:3,
    steps:['Take cushions outside; beat out dust','Vacuum or sweep under sofas','Wipe TV, AC, and decor','Mop floor','Spray air freshener','Arrange remote controls and magazines'] },
  { code:'hair_grooming_self', name:'Personal Hair Grooming', category:'grooming', icon:'💇', min_age:8, max_age:18, default_points:2, default_duration_minutes:10, frequency:'daily', difficulty:1,
    steps:['Comb/brush hair','Apply moisturiser or pomade','Tie / cover if female','Trim edges weekly'] },
  { code:'plait_braid_hair', name:'Plait / Braid Own Hair (Simple Style)', category:'grooming', icon:'💁‍♀️', min_age:10, max_age:18, default_points:4, default_duration_minutes:30, frequency:'weekly', suggested_day:'sunday', difficulty:3, gender:'female',
    steps:['Wash and condition hair','Apply hair cream','Section neatly','Plait/braid each section','Use clean band/clip'] },
  { code:'screen_time_log', name:'Stay Within Daily Screen-Time Limit', category:'discipline', icon:'📱', min_age:6, max_age:18, default_points:3, default_duration_minutes:5, frequency:'daily', difficulty:2,
    steps:['Note start time when picking phone/TV','Stop at the agreed limit (e.g. 1 hour)','Log usage in app','Hand device to parent at curfew'], nigerian_context:'Recommended: 30–60 min on school days, 90–120 min weekend.' },
  { code:'sunday_clothes_prep', name:'Lay Out Sunday Church Clothes', category:'laundry', icon:'⛪', min_age:7, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekly', suggested_day:'saturday', suggested_time:'20:00', difficulty:1,
    steps:['Choose outfit','Iron if needed','Polish shoes','Set out underwear, socks, accessories'] },
  { code:'pack_school_bag', name:'Pack School Bag for Next Day', category:'school', icon:'🎒', min_age:6, max_age:18, default_points:2, default_duration_minutes:10, frequency:'daily', suggested_time:'20:30', difficulty:1,
    steps:['Check timetable for tomorrow','Pack each subject\'s book + notebook','Sharpen pencils, refill biro','Pack lunch box and water bottle','Place bag at the door'] },
  { code:'morning_prayer_devotion', name:'Morning Prayer / Devotion', category:'spiritual', icon:'🙏', min_age:5, max_age:18, default_points:2, default_duration_minutes:10, frequency:'daily', suggested_time:'06:00', difficulty:1,
    steps:['Wash face','Sit quietly','Read a short Bible/Quran portion','Pray for family and day'] },
  { code:'evening_family_time', name:'Evening Family Time / Greet Elders', category:'family', icon:'👨‍👩‍👧', min_age:3, max_age:18, default_points:2, default_duration_minutes:15, frequency:'daily', suggested_time:'19:00', difficulty:1,
    steps:['Kneel/bow to greet Daddy and Mummy','Recount the day briefly','Listen to corrections respectfully'], nigerian_context:'Reinforces "Good evening Sir/Ma" culture.' },
  { code:'wash_pots_after_cooking', name:'Wash Pots & Cooking Utensils', category:'dishes', icon:'🥘', min_age:11, max_age:18, default_points:4, default_duration_minutes:20, frequency:'daily', difficulty:2,
    steps:['Scrape out leftover food into bin','Soak burnt pots in hot water + soap','Scrub with steel wool / scrubbing pad','Rinse soap off completely','Dry upside-down on rack','Wipe cooker top'] },
  { code:'clean_mortar_pestle', name:'Wash Mortar, Pestle & Blender', category:'kitchen', icon:'🥣', min_age:9, max_age:18, default_points:2, default_duration_minutes:10, frequency:'adhoc', difficulty:1,
    steps:['Rinse immediately after use','Scrub with brush + soap','Rinse and air-dry on rack'] },
  { code:'change_bedsheet', name:'Change Bedsheet & Pillowcase', category:'bedroom', icon:'🛌', min_age:9, max_age:18, default_points:3, default_duration_minutes:10, frequency:'weekly', suggested_day:'saturday', difficulty:2,
    steps:['Strip old sheet and pillowcase','Drop in laundry basket','Spread fresh sheet; tuck corners','Fix pillowcases','Replace blanket / mosquito net'] },
  { code:'clean_window_louvres', name:'Clean Window Louvres / Net', category:'common_areas', icon:'🪟', min_age:11, max_age:18, default_points:5, default_duration_minutes:25, frequency:'monthly', difficulty:3,
    steps:['Open louvres','Wipe each blade top and bottom with damp cloth','Brush mosquito net with dry brush','Wipe window frame'], safety_notes:'Mind your fingers — louvres are sharp.' },
  { code:'check_pads_supply', name:'Restock Personal Toiletry (Pads/Soap/Toothpaste)', category:'grooming', icon:'🧴', min_age:11, max_age:18, default_points:2, default_duration_minutes:5, frequency:'weekly', suggested_day:'sunday', difficulty:1,
    steps:['Check what is finishing','Log in Needs list','Restock from store cupboard','Inform Mummy of low items'] },
];

exports.seedLibrary = async (req, res) => {
  try {
    let inserted = 0, skipped = 0;
    for (const c of LIBRARY) {
      const r = await db.query(
        `INSERT INTO chore_library
         (code, name, description, category, icon, min_age, max_age, gender,
          default_points, default_duration_minutes, frequency, suggested_day,
          suggested_time, steps, supplies_needed, safety_notes, nigerian_context, difficulty)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (code) DO NOTHING RETURNING id`,
        [c.code, c.name, c.description || null, c.category, c.icon || '🧹',
         c.min_age, c.max_age, c.gender || 'any',
         c.default_points, c.default_duration_minutes, c.frequency,
         c.suggested_day || null, c.suggested_time || null,
         c.steps || null, c.supplies_needed || null, c.safety_notes || null,
         c.nigerian_context || null, c.difficulty || 2]
      );
      if (r.rowCount) inserted++; else skipped++;
    }
    res.json({ ok: true, inserted, skipped, total: LIBRARY.length });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

exports.listLibrary = async (req, res) => {
  try {
    const { age, gender, category, frequency, child_id } = req.query;
    const conds = []; const params = [];
    let actualAge = age, actualGender = gender;
    if (child_id) {
      const c = await db.query('SELECT date_of_birth, gender FROM children WHERE id=$1', [child_id]);
      if (c.rows[0]) {
        if (c.rows[0].date_of_birth) {
          const dob = new Date(c.rows[0].date_of_birth);
          actualAge = Math.floor((Date.now() - dob.getTime()) / (365.25*24*60*60*1000));
        }
        if (!actualGender) actualGender = c.rows[0].gender;
      }
    }
    if (actualAge) { params.push(actualAge); conds.push(`min_age <= $${params.length}`);
      params.push(actualAge); conds.push(`max_age >= $${params.length}`); }
    if (actualGender && actualGender !== 'any') { params.push(actualGender); conds.push(`(gender = 'any' OR gender = $${params.length})`); }
    if (category) { params.push(category); conds.push(`category = $${params.length}`); }
    if (frequency) { params.push(frequency); conds.push(`frequency = $${params.length}`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const r = await db.query(`SELECT * FROM chore_library ${where} ORDER BY category, min_age, name`);
    res.json({ items: r.rows, applied_age: actualAge, applied_gender: actualGender });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

exports.categories = async (req, res) => {
  try {
    const r = await db.query('SELECT category, COUNT(*) as count FROM chore_library GROUP BY category ORDER BY category');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const DAY_TO_NUM = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };

// Assign a chore from library to a child by creating a routine + routine_event
// Body: { library_id, child_id, routine_name?, time?, day_of_week?, points?, duration_minutes?, expected_duration_minutes? }
exports.assignToChild = async (req, res) => {
  try {
    const { library_id, child_id } = req.body;
    if (!library_id || !child_id) return res.status(400).json({ error: 'library_id and child_id required' });
    const lib = await db.query('SELECT * FROM chore_library WHERE id=$1', [library_id]);
    if (!lib.rows[0]) return res.status(404).json({ error: 'chore not found' });
    const c = lib.rows[0];

    // pick routine name
    const routineName = req.body.routine_name ||
      (c.frequency === 'daily' ? 'Daily Chores' :
       c.frequency === 'weekend' ? 'Weekend Chores' :
       c.frequency === 'weekly' ? 'Weekly Chores' :
       c.frequency === 'monthly' ? 'Monthly Chores' : 'Assigned Chores');

    // ensure routine exists for this child
    let routine = await db.query(
      `SELECT * FROM routines WHERE child_id=$1 AND name=$2 LIMIT 1`,
      [child_id, routineName]
    );
    if (!routine.rows[0]) {
      // determine days_of_week
      let days = [0,1,2,3,4,5,6];
      if (c.frequency === 'weekend') days = [0, 6];
      else if (c.suggested_day && DAY_TO_NUM[c.suggested_day] !== undefined) days = [DAY_TO_NUM[c.suggested_day]];
      else if (c.frequency === 'weekly') days = [6];
      const cr = await db.query(
        `INSERT INTO routines (child_id, parent_id, name, description, days_of_week, is_active)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING *`,
        [child_id, req.user.id, routineName, `Auto-created routine for ${c.frequency} chores`, days]
      );
      routine = cr;
    }

    // create checklist from steps if provided
    let checklistId = null;
    if (c.steps && c.steps.length) {
      const cl = await db.query(
        `INSERT INTO checklists (parent_id, name, description, category)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [req.user.id, c.name, c.description, c.category]
      );
      checklistId = cl.rows[0].id;
      for (let i = 0; i < c.steps.length; i++) {
        await db.query(
          `INSERT INTO checklist_items (checklist_id, label, sort_order) VALUES ($1,$2,$3)`,
          [checklistId, c.steps[i], i + 1]
        );
      }
    }

    // create event
    const time = req.body.time || c.suggested_time || '15:00';
    const points = req.body.points || c.default_points;
    const dur = req.body.duration_minutes || c.default_duration_minutes;
    const expDur = req.body.expected_duration_minutes || c.default_duration_minutes;

    const ev = await db.query(
      `INSERT INTO routine_events
       (routine_id, name, scheduled_time, duration_minutes,
        expected_duration_minutes, icon, category, checklist_id, payout, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
         COALESCE((SELECT MAX(sort_order)+1 FROM routine_events WHERE routine_id=$1),1),
         true) RETURNING *`,
      [routine.rows[0].id, c.name, time, dur, expDur, c.icon, c.category, checklistId, points]
    );

    res.json({ ok: true, routine: routine.rows[0], event: ev.rows[0], checklist_id: checklistId });
  } catch (err) {
    console.error('assignToChild error:', err);
    res.status(500).json({ error: err.message });
  }
};
