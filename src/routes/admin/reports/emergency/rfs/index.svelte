<script>
	import StreetSelectInput from '$components/form/inputs/StreetSelectInput.svelte';
	import { jsPDF } from 'jspdf';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ streetList } = data);

	export let selectedStreet = '';

	/** @type {import('./$types').ActionData} */
	export let form;
	let reportStreet = form?.reportStreet ?? '';
	let streetData = form?.streetData ?? undefined;

	let classText =
		'class="border mt-3 w-full border-orange-700 rounded bg-orange-50 py-1 sm:text-lg"';
	let nameText = 'property_address_street';
	let requiredText = 'true';

	function printPDF(streetData) {
		const lineHeight = 4;
		const tab = 4;
		const startX = 20;
		const startY = 20;
		const doc = new jsPDF();
		doc.setFontSize(14);
		let title = 'RFS Emergency Report';
		let titleX = (doc.internal.pageSize.getWidth() - doc.getTextWidth(title)) / 2;
		let titleY = 40;
		doc.text(title, titleX, titleY);
		titleY += 14;
		title = 'for';
		titleX = (doc.internal.pageSize.getWidth() - doc.getTextWidth(title)) / 2;
		doc.text(title, titleX, titleY);
		titleY += 14;
		title = `${reportStreet}`;
		titleX = (doc.internal.pageSize.getWidth() - doc.getTextWidth(title)) / 2;
		doc.text(title, titleX, titleY);
		let logo = new Image();
		logo.src = '/../src/components/SOCLogo.png';
		titleY += 14;
		titleX = (doc.internal.pageSize.getWidth() - 40) / 2;
		doc.addImage(logo, 'PNG', titleX + 10, titleY, 20, 20);
		doc.addPage();
		let line = 1;
		streetData.forEach((element) => {
			if (element.property.address) {
				doc.setFontSize(12);
				doc.text('Property:-', startX, startY);
				doc.setFontSize(10);
				doc.text(element.property.address, startX + tab, startY + lineHeight);
				line += 1;
				if (element.property.property_rented) {
					doc.text(element.property.property_rented, startX + tab, startY + line * lineHeight);
					line += 1;
					doc.text(
						`Agent:- ${element.property.agent.agent_name}`,
						startX + tab,
						startY + line * lineHeight
					);
					line += 1;
					doc.text(
						`Agent Mobile:- ${element.property.agent.agent_mobile}`,
						startX + tab,
						startY + line * lineHeight
					);
					line += 1;
					doc.text(
						`Agent Phone:- ${element.property.agent.agent_phone}`,
						startX + tab,
						startY + line * lineHeight
					);
					line += 1;
				}
				doc.text(element.property.identification, startX + tab, startY + line * lineHeight);
				line += 1;
				doc.text(element.property.truck_access, startX + tab, startY + line * lineHeight);
				line += 1;
				doc.text(element.property.critical_assets, startX + tab, startY + line * lineHeight);
				line += 2;
				doc.setFontSize(12);
				doc.text('Contact:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text(
					`Contact Name:- ${element.contacts.name}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Contact Phone:- ${element.contacts.phone}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Contact Mobile:- ${element.contacts.mobile}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 2;
				doc.setFontSize(12);
				doc.text('Residency Profile:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text(`${element.residents_profile.resident}`, startX + tab, startY + line * lineHeight);
				line += 1;
				if (element.residents_profile.vulnerable === 'true') {
					doc.text(
						'There is at least one resident considered vulnerable.',
						startX + tab,
						startY + line * lineHeight
					);
				} else {
					doc.text(
						'No resident is considered vulnerable.',
						startX + tab,
						startY + line * lineHeight
					);
				}
				line += 1;
				doc.text("Resident's Age Profile.", startX + tab, startY + line * lineHeight);
				line += 1;
				doc.text(
					`0-18    ${element.residents_profile.age_profile.age0_18}`,
					startX + tab * 2,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`19-50   ${element.residents_profile.age_profile.age19_50}`,
					startX + tab * 2,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`51-70   ${element.residents_profile.age_profile.age51_70}`,
					startX + tab * 2,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`71+      ${element.residents_profile.age_profile.age71_}`,
					startX + tab * 2,
					startY + line * lineHeight
				);
				line += 1;
				if (element.residents_profile.rfs_survival_plan === 'Y') {
					doc.text(
						'There is an RFS Survival Plan in place',
						startX + tab,
						startY + line * lineHeight
					);
				} else {
					doc.text('No RFS Survival Plan in place', startX + tab, startY + line * lineHeight);
				}
				line += 1;
				doc.text('In case of Fire the residents:', startX + tab, startY + line * lineHeight);
				line += 1;
				doc.text(
					`  -${element.residents_profile.plan_to_leave}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 2;
				doc.setFontSize(12);
				doc.text('Onsite Hazards:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text(
					`Solar batteries :-  ${element.onsite_hazards.on_site_hazards.Solar_batteries}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Fuel stores :-  ${element.onsite_hazards.on_site_hazards.Fuel_stores}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Chemical stores :-  ${element.onsite_hazards.on_site_hazards.Chemical_stores}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Bottled gas :-  ${element.onsite_hazards.on_site_hazards.Bottled_gas}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Other site hazards reported :-  ${element.onsite_hazards.other_site_hazards}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 2;
				doc.setFontSize(12);
				doc.text('Adjacent Hazards:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text(
					`Land adjacent reported as Hazard :-  ${element.other_local_hazards.land_adjacent_hazard}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Other local Hazards reported :-  ${element.other_local_hazards.other_local_hazards}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 2;
				doc.setFontSize(12);
				doc.text('Fire fighting Assets:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text(
					`Static Water :-  ${element.fire_fighting_assets.static_water.replace(',', ', ')}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				if (element.fire_fighting_assets.static_water !== 'None') {
					doc.text(
						`Stortz fitting :-  ${element.fire_fighting_assets.stortz_fitting}`,
						startX + tab,
						startY + line * lineHeight
					);
					line += 1;
				}
				doc.text(
					`Fire fighting resources :-  ${element.fire_fighting_assets.equipment.replace(
						',',
						', '
					)}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Slashed areas around house/sheds :-  ${element.fire_fighting_assets['Slashed areas around house/sheds']}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`A backup pump (petrol or diesel) :-  ${element.fire_fighting_assets['A backup pump (petrol or diesel)']}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;

				doc.text(
					`Driveway 3.5m overhead clearance :-  ${element.fire_fighting_assets['Driveway 3.5m overhead clearance']}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 1;

				doc.text(
					`Truck access around the property :-  ${element.fire_fighting_assets['Truck access around the property']}`,
					startX + tab,
					startY + line * lineHeight
				);
				line += 2;
				doc.setFontSize(12);
				doc.text('Site Animals:-', startX, startY + line * lineHeight);
				line += 1;
				doc.setFontSize(10);
				doc.text('Pets :-  ', startX + tab + tab, startY + line * lineHeight);
				line += 1;
				doc.text(
					`Dogs :-  ${element.site_animals.pets.dogs}`,
					startX + tab + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Cats :-  ${element.site_animals.pets.cats}`,
					startX + tab + tab + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Birds :-  ${element.site_animals.pets.birds}`,
					startX + tab + tab + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text(
					`Other Pets :-  ${element.site_animals.pets.other_pets}`,
					startX + tab + tab + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text('Livestock :-  ', startX + tab + tab, startY + line * lineHeight);
				line += 1;
				doc.text(
					`${element.site_animals.livestock}`,
					startX + tab + tab + tab,
					startY + line * lineHeight
				);
				line += 1;
				doc.text('Livestock safe area:-  ', startX + tab + tab, startY + line * lineHeight);
				line += 1;
				if (element.site_animals.safe_area) {
					doc.text(
						`${element.site_animals.safe_area.status}`,
						startX + tab + tab + tab,
						startY + line * lineHeight
					);
					line += 1;
					if (element.site_animals.safe_area.availability) {
						let strArr = element.site_animals.safe_area.availability.split('/n');
						doc.text(strArr, startX + tab + tab + tab, startY + line * lineHeight);
						line += 1;
					}
				} else {
					doc.text(
						'No livestock safe area identified on property.',
						startX + tab + tab + tab,
						startY + line * lineHeight
					);
				}
				line += 1;
				doc.addPage();
				line = 1;
			}
			// doc.deletePage(doc.internal.getNumberOfPages());
		});

		doc.save(`SOC_RFS_Emergency_Report_${reportStreet.replace(' ', '_')}.pdf`);
	}
</script>

<form
	id="reportRFSByStreetForm"
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/admin/reports/emergency/rfs"
	method="POST"
>
	<h1 class="p-1">Property Reports</h1>
	<h2 class="mx-2 sm:text-lg">By Street</h2>
	<div class="flex flex-col basis-full mx-5">
		<p class="mb-0">
			This report lists the following information for all registered Users in a given street.
		</p>
		<!-- <label class="text-lg font-bold mb-1" for="property_address_street">Street</label> -->
		<StreetSelectInput {streetList} {nameText} {requiredText} {classText} bind:selectedStreet />
		<button
			class="w-1/4 m-3 rounded-lg text-base font-semibold bg-[#0099E8] text-stone-100 border border-purple-700"
			on:click={() => (reportStreet = selectedStreet)}
			type="submit"
			form="reportRFSByStreetForm"
			hidden={streetData !== undefined}
		>
			Generate Report
		</button>
		<button
			on:click={() => printPDF(streetData)}
			class="w-1/4 m-3 rounded-lg text-base font-semibold bg-[#0099E8] text-stone-100 border border-purple-700"
			form=""
			hidden={streetData === undefined}
		>
			Generate PDF
		</button>
	</div>
</form>
