export const residencyOptions = [
	{ value: 1, lable: 'Resident at the property fulltime ' },
	{ value: 2, lable: 'Present large proportion of time' },
	{ value: 3, lable: 'Occasional short periods away' },
	{ value: 4, lable: 'At the property at least every month' },
	{ value: 5, lable: 'At the property occasionally' },
	{ value: 6, lable: 'Resident fulltime with long absences' },
	{ value: 7, lable: 'Not very often at the property' }
];
export const yesNoOptions = [
	{ value: true, lable: 'Yes' },
	{ value: false, lable: 'No' }
];

export const yesNoMaybeOptions = [
	{ value: 'Y', lable: 'Yes' },
	{ value: 'N', lable: 'No' },
	{ value: 'M', lable: 'Maybe' }
];
export const fireFightingResources = [
	{ value: 1, lable: 'Fire trailer(s)' },
	{ value: 2, lable: 'Fire fighting pump(s)' },
	{ value: 3, lable: 'Fire hose(s)' },
	{ value: 4, lable: 'Trailer(s) with spray equipment' },
	{ value: 5, lable: 'Generator' }
];
export const staticWaterOptions = [
	{ value: 1, lable: 'Tank(s)' },
	{ value: 2, lable: 'Swimming Pool(s)' },
	{ value: 3, lable: 'Dam(s)' },
	{ value: 4, lable: 'Creek(s)' },
	{ value: 5, lable: 'None' }
];

export const siteHazardsOptions = [
	{ value: 1, lable: 'Solar batteries' },
	{ value: 2, lable: 'Fuel stores' },
	{ value: 3, lable: 'Chemical stores' },
	{ value: 4, lable: 'Bottled gas' }
];
export const fireHazardReductionOptions = [
	{ value: 1, lable: 'Fire breaks' },
	{ value: 2, lable: 'Slashed areas around house/sheds' },
	{ value: 3, lable: 'A backup pump (petrol or diesel)' },
	{ value: 4, lable: 'Driveway 3.5m overhead clearance ' },
	{ value: 5, lable: 'Truck access around your property ' }
];
export const fireFightingExperienceOptions = [
	{ value: 1, lable: 'No experience' },
	{ value: 2, lable: 'Some limited experience with small fires' },
	{ value: 3, lable: 'In training RFS (relatively new)' },
	{ value: 4, lable: 'Experienced firefighting' }
];
export const yesNoSendOptions = [
	{ value: 'Y', lable: 'Yes' },
	{ value: 'N', lable: 'No' },
	{ value: 'S', lable: 'Please send one' }
];

export const stayGoOptions = [
	{ value: 'S', lable: 'Planning on staying' },
	{ value: 'G', lable: 'Leaving as early as possible' },
	{ value: 'U', lable: 'Unsure depending on severity' }
];
export const communityWorkshopOptions = [
	{ value: 1, lable: 'Completing your fire plan' },
	{ value: 2, lable: 'Using online video calls' },
	{ value: 3, lable: 'How to develop a good emergency pack and plan' },
	{ value: 4, lable: 'Making a fire trailer' },
	{ value: 5, lable: 'Bushfire safety training' },
	{ value: 6, lable: 'How to do a small pile burn safely' }
];
export const informationSheetOptions = [
	{ value: 1, lable: 'Pre fire season checklist' },
	{ value: 2, lable: 'Lighting fires - facts and responsibilities' },
	{ value: 3, lable: 'Fire ready - pets and animals' },
	{ value: 4, lable: 'Fire ready - livestock & large animals' },
	{ value: 5, lable: 'BCYCA leaflet' },
	{ value: 6, lable: 'How to be more active locally' },
	{ value: 7, lable: 'Strengthen Our Community Project Report' }
];
export const communityMeetingOptions = [
	{ value: 1, lable: 'Fire season preparation' },
	{ value: 2, lable: 'Bands - live music' },
	{ value: 3, lable: 'Monthly social events - tea and chat' },
	{ value: 4, lable: 'Indoor bowls' },
	{ value: 5, lable: 'Christmas end of year wrap' },
	{ value: 6, lable: 'Youth events' },
	{ value: 7, lable: 'Table tennis' },
	{ value: 8, lable: 'Bingo' },
	{ value: 9, lable: 'Canasta card meet' },
	{ value: 10, lable: 'Community dinners' },
	{ value: 11, lable: 'Book Club' }
];

export const stayInTouchOptions = [
	{ value: 1, lable: 'Landline' },
	{ value: 2, lable: 'Mobile' },
	{ value: 3, lable: 'E-mail' },
	{ value: 4, lable: 'In person' },
	{ value: 5, lable: 'Via post' }
];

export const accessOptions = [
	{ value: 'All', lable: 'All gates are more than 2.5 metres wide' },
	{ value: 'Most', lable: 'Most gates are more than 2.5 metres wide' },
	{ value: 'No', lable: 'No' },
	{ value: 'Other', lable: 'Other' }
];

export let surveyData = {
	first_name: '',
	family_name: '',
	property_address: '',
	home_address: '',
	contact_address: '',
	residency_profile: '',
	sign_posted: true,
	truck_access: '',
	truck_access_other: '',
	mobile: '',
	phone: '',
	mobile_reception: '',
	residents0_18: '',
	residents19_50: '',
	residents51_70: '',
	residents71_: '',
	vulnerable_residents: false,
	number_dogs: '',
	number_cats: '',
	number_birds: '',
	number_other_pets: '',
	live_stock_present: false,
	live_stock_safe_area: '',
	share_livestock_safe_area: '',
	other_essential_assets: '',
	static_water_available: [],
	have_stortz: '',
	stortz_size: '',
	fire_fighting_resources: [],
	site_hazards: [],
	other_site_hazards: '',
	fire_hazard_reduction: [],
	land_adjacent_hazard: '',
	other_hazards: '',
	rfs_survival_plan: '',
	fire_fighting_experience: '',
	fire_trauma: false,
	plan_to_leave_before_fire: '',
	plan_to_leave_before_flood: '',
	community_workshop_choices: [],
	other_community_workshop: '',
	will_run_community_workshops: '',
	information_sheet_choices: [],
	other_information_sheet: '',
	community_meeting_choices: [],
	other_community_meeting: '',
	stay_in_touch_choices: [],
	other_comments: ''
};

export let property_address = '';
export let residency_profile = '';
export let sign_posted = true;
export let truck_access = '';
export let truck_access_other = '';
export let mobile = '';
export let phone = '';
export let mobile_reception = '';
export let residents0_18 = '';
export let residents19_50 = '';
export let residents51_70 = '';
export let residents71_ = '';
export let vulnerable_residents = false;
export let number_dogs = '';
export let number_cats = '';
export let number_birds = '';
export let number_other_pets = '';
export let live_stock_present = false;
export let live_stock_safe_area = '';
export let share_livestock_safe_area = '';
export let other_essential_assets = '';
export let static_water_available = [];
export let have_stortz = '';
export let stortz_size = '';
export let fire_fighting_resources = [];
export let site_hazards = [];
export let other_site_hazards = '';
export let fire_hazard_reduction = [];
export let land_adjacent_hazard = '';
export let other_hazards = '';
export let rfs_survival_plan = '';
export let send_rfs_survival_plan = '';
export let fire_fighting_experience = '';
export let fire_trauma = false;
export let plan_to_leave_before_fire = '';
export let plan_to_leave_before_flood = '';
export let community_workshop_choices = [];
export let other_community_workshop = '';
export let will_run_community_workshops = '';
export let information_sheet_choices = [];
export let other_information_sheet = '';
export let community_meeting_choices = [];
export let other_community_meeting = '';
export let stay_in_touch_choices = [];
export let other_comments = '';
