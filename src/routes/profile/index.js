// @ts-nocheck
import { supabaseServerClient, withApiAuth } from '@supabase/auth-helpers-sveltekit';

export const GET = async ({ locals, request }) =>
	withApiAuth(
		{
			redirectTo: '/auth/signin',
			user: locals.user
		},
		async () => {
			const { data: survey, error: errorSurvey } = await supabaseServerClient(request)
				.from('survey_responses')
				.select('*')
				.eq('email_address', locals.user.email)
				.is('invited', null);
			if (errorSurvey) {
				console.log('error Get Survey:', errorSurvey.message);
				let message = errorSurvey.message;
				return {
					status: 400,
					body: { message }
				};
			}
			if (survey[0]) {
				let surveyData = survey[0];
				await resetProfile(survey[0], locals, request);
			}
			const { data: profileComments, error: errorComments } = await supabaseServerClient(request)
				.from('profile')
				.select('other_comments')
				.eq('id', locals.user.id);
			if (errorComments) {
				console.log('error Get Other Comments:', errorComments);
				return {
					status: 400,
					body: { errorComments }
				};
			}
			return {
				body: { profileComments }
			};
		}
	);

async function resetProfile(survey, locals, request) {
	withApiAuth(
		{
			user: locals.user
		},
		async () => {
			const { error: errorProfileUpdate } = await supabaseServerClient(request)
				.from('profile')
				.update({
					property_address_street: survey.property_address,
					property_address_suburb: survey.suburb,
					residency_profile: survey.residencyProfile,
					sign_posted: survey.signPosted,
					truck_access: survey.truckAccess,
					truck_access_other_information: survey.truckAccessOther,
					mobile: survey.mobile,
					phone: survey.phone,
					mobile_reception: survey.mobileReception,
					residents0_18: survey.residents0_18,
					residents19_50: survey.residents19_50,
					residents51_70: survey.residents51_70,
					residents71_: survey.residents71_,
					vulnerable_residents: survey.vulnerableResidents,
					number_dogs: survey.numberDogs,
					number_cats: survey.numberCats,
					number_birds: survey.numberBirds,
					number_other_pets: survey.numberOtherPets,
					live_stock_present: survey.liveStockPresent,
					live_stock_safe_area: survey.liveStockSafeArea,
					share_livestock_safe_area: survey.shareLiveStockSafeArea,
					static_water_available: setArray(survey.staticWaterAvailable),
					have_stortz: survey.haveStortz,
					stortz_size: survey.stortzSize,
					fire_fighting_resources: setArray(survey.fireFightingResources),
					site_hazards: setArray(survey.explosiveHazards),
					other_site_hazards: survey.otherSiteHazards,
					fire_hazard_reduction: setArray(survey.fireHazardReduction),
					land_adjacent_hazard: survey.landAdjacentHazard,
					other_hazards: survey.otherHazards,
					rfs_survival_plan: survey.rfsSurvivalPlan,
					fire_fighting_experience: survey.fireFightingExperience,
					plan_to_leave_before_fire: survey.planToLeaveBeforeFire,
					plan_to_leave_before_flood: survey.planToLeaveBeforeFlood,
					community_workshop_choices: setArray(survey.communityWorkshopChoices),
					other_community_workshop: survey.otherCommunityWorkshop,
					will_run_community_workshops: survey.willRunCommunityWorkshops,
					information_sheet_choices: setArray(survey.informationSheetChoices),
					other_information_sheet: survey.otherInformationSheet,
					community_meeting_choices: setArray(survey.communityMeetingChoices),
					other_community_meeting: survey.communityMeeting,
					stay_in_touch_choices: setArray(survey.stayInTouchChoices),
					other_comments: survey.otherComments
				})
				.eq('id', locals.user.id);
			if (errorProfileUpdate) {
				let message = errorProfileUpdate.message;
				console.log('error Update Profile from Survey:', message);
				return {
					status: 400,
					body: { message }
				};
			}
			const { error: errorSurveyUpdate } = await supabaseServerClient(request)
				.from('survey_responses')
				.update({
					invited: locals.user.id
				})
				.eq('email_address', locals.user.email);

			// const { data: surveyCheck, error: errorSurveyCheck } = await supabaseServerClient(request)
			// 	.from('survey_responses')
			// 	.select('invited')
			// 	.eq('email_address', locals.user.email);
			if (errorSurveyUpdate) {
				let messageSurveyUpdate = errorSurveyUpdate.message;
				console.log('error Update Survey Responses:', messageSurveyUpdate);
				return {
					status: 400,
					body: { messageSurveyUpdate }
				};
			}
		}
	);
}

function setArray(value) {
	if (value == null) {
		return [];
	} else if (Array.isArray(value)) {
		return value;
	}
	let result = new Array();
	result[0] = value;
	return result;
}
