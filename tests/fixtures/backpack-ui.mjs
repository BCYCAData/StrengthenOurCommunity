export const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
export function createBackpackFixture() {
	const members = [
		{
			user_id: uuid(1),
			household_id: uuid(101),
			email: 'alice@example.test',
			first_name: 'Alice',
			family_name: 'Lane',
			street: '12 Creek Road',
			suburb: 'Burrell Creek',
			postcode: '2429',
			current_property_id: '123',
			property_id: '123',
			membership_status: 'pending',
			household_status: 'pending',
			is_contact: false,
			outcome: 'incomplete',
			missing_required: ['Q1'],
			household_qualified: false,
			award_recorded: false
		},
		{
			user_id: uuid(2),
			household_id: uuid(102),
			email: 'bob@example.test',
			first_name: 'Bob',
			family_name: 'Lane',
			street: '12 Creek Road',
			suburb: 'Burrell Creek',
			postcode: '2429',
			current_property_id: '123',
			property_id: '123',
			membership_status: 'pending',
			household_status: 'pending',
			is_contact: false,
			outcome: 'incomplete',
			missing_required: ['Q1'],
			household_qualified: false,
			award_recorded: false
		},
		{
			user_id: uuid(3),
			household_id: uuid(103),
			email: 'charlie@example.test',
			first_name: 'Charlie',
			family_name: 'Reed',
			street: '8 Valley Lane',
			suburb: 'Burrell Creek',
			postcode: '2429',
			current_property_id: '456',
			property_id: '456',
			membership_status: 'confirmed',
			household_status: 'confirmed',
			is_contact: true,
			outcome: 'special_case',
			missing_required: [],
			household_qualified: false,
			award_recorded: true,
			special_case_decision: 'pending'
		}
	];
	const awards = [
		{
			id: uuid(201),
			household_id: uuid(103),
			external_reference: 'legacy-001',
			historical: true,
			awarded_at: null,
			delivered_at: null,
			contact_name: 'Charlie Reed',
			contact_email: 'charlie@example.test',
			members: [members[2]]
		}
	];
	const policy = {
		id: 1,
		version: 1,
		programme: 'backpack',
		enabled: true,
		email_enabled: false,
		baseline_completed_at: null,
		cutoff_at: '2026-05-01T00:00:00Z',
		scope_question_ids: ['Q1'],
		excluded_question_ids: []
	};
	const runs = [];
	const calls = [];
	let staleHousehold = true;
	let staleBaseline = true;
	const clone = (x) => JSON.parse(JSON.stringify(x));
	const readiness = () => ({
		policy_id: 1,
		rule_version: 1,
		configured: true,
		assessable_accounts: 3,
		unassessed_accounts: 0,
		unresolved_memberships: members.filter((m) => m.membership_status !== 'confirmed').length,
		missing_contacts: [
			...new Set(
				members
					.filter((m) => !members.some((p) => p.household_id === m.household_id && p.is_contact))
					.map((m) => m.household_id)
			)
		].length,
		pending_special_cases: members.filter(
			(m) => m.outcome === 'special_case' && m.special_case_decision === 'pending'
		).length,
		processing_jobs: 0
	});
	function execute(action, args = {}) {
		calls.push(clone({ action, arguments: args }));
		let result;
		if (action === 'snapshot') {
			const query = (args.search || '').toLowerCase();
			const filtered = members
				.filter((m) => Object.values(m).join(' ').toLowerCase().includes(query))
				.filter(
					(m) =>
						!args.filter ||
						args.filter === 'all' ||
						(args.filter === 'special_case' &&
							(m.outcome === 'special_case' || m.special_case_decision)) ||
						(args.filter === 'pending' && m.membership_status !== 'confirmed') ||
						(args.filter === 'awarded' && m.award_recorded) ||
						(args.filter === 'qualified' && m.household_qualified) ||
						(args.filter === 'incomplete' && m.outcome === 'incomplete')
				);
			result = {
				members: filtered.slice(args.offset || 0, (args.offset || 0) + (args.limit || 25)),
				total_members: filtered.length,
				readiness: readiness(),
				policy,
				recent_baselines: runs,
				notification_counts: {}
			};
		} else if (action === 'list_awards') {
			const filtered = awards.filter((a) =>
				JSON.stringify(a)
					.toLowerCase()
					.includes((args.search || '').toLowerCase())
			);
			result = {
				awards: filtered.slice(args.offset || 0, (args.offset || 0) + (args.limit || 20)),
				total_awards: filtered.length
			};
		} else if (action === 'household_details') {
			const group = members.filter((m) => m.household_id === args.household_id);
			result = {
				household: {
					id: args.household_id,
					property_id: group[0]?.property_id,
					contact_user_id: group.find((m) => m.is_contact)?.user_id
				},
				members: group
			};
		} else if (action === 'preview_household') {
			result = {
				household_id: args.household_id,
				revision: 'a'.repeat(32),
				members: args.member_ids.map((id) => {
					const m = members.find((m) => m.user_id === id);
					return {
						...m,
						property_address_street: m.street,
						property_address_suburb: m.suburb,
						membership: { household_id: m.household_id }
					};
				}),
				related_households: [
					{
						household: { id: args.household_id },
						members: members
							.filter((m) => m.household_id === args.household_id)
							.map((m) => ({ user_id: m.user_id })),
						awards: [],
						status: [],
						notifications: []
					}
				]
			};
		} else if (action === 'confirm_household') {
			if (staleHousehold) {
				staleHousehold = false;
				return {
					status: 409,
					body: { error: 'The preview has changed; refresh and review it again' }
				};
			}
			for (const m of members.filter((m) => args.member_ids.includes(m.user_id)))
				Object.assign(m, {
					household_id: args.household_id,
					membership_status: 'confirmed',
					household_status: 'confirmed',
					is_contact: m.user_id === args.contact_user_id
				});
			result = { revision: 'b'.repeat(32) };
		} else if (action === 'decide_special_case') {
			Object.assign(
				members.find((m) => m.user_id === args.user_id),
				{ special_case_decision: args.decision, special_case_reason: args.note }
			);
			result = { outcome: 'qualified' };
		} else if (action === 'record_award') {
			const existing = awards.find((a) => a.external_reference === args.reference);
			if (existing) result = { award: existing, already_recorded: true };
			else {
				const group = members.filter((m) => m.household_id === args.household_id);
				const contact = group.find((m) => m.is_contact) || group[0];
				const award = {
					id: uuid(awards.length + 201),
					...args,
					external_reference: args.reference,
					contact_name: contact.first_name + ' ' + contact.family_name,
					contact_email: contact.email,
					members: clone(group)
				};
				awards.push(award);
				for (const m of group) m.award_recorded = true;
				result = { award, already_recorded: false };
			}
		} else if (action === 'record_delivery') {
			const award = awards.find((a) => a.id === args.award_id);
			award.delivered_at = args.delivered_at;
			result = award;
		} else if (action === 'run_baseline') {
			const run = {
				id: uuid(301 + runs.length),
				policy_id: 1,
				completed_at: new Date().toISOString(),
				note: args.note,
				summary: readiness(),
				reviewed_at: null
			};
			runs.unshift(run);
			result = run;
		} else if (action === 'review_baseline') {
			if (staleBaseline) {
				staleBaseline = false;
				return {
					status: 409,
					body: { error: 'The baseline has changed; rerun and review it again' }
				};
			}
			const run = runs.find((r) => r.id === args.run_id);
			run.reviewed_at = new Date().toISOString();
			policy.baseline_completed_at = run.reviewed_at;
			result = run;
		} else return { status: 400, body: { error: `Unexpected fixture action ${action}` } };
		return { status: 200, body: { result: clone(result) } };
	}
	return {
		execute,
		calls,
		members,
		awards,
		policy,
		initial: () => execute('snapshot', { limit: 25, offset: 0 }).body.result
	};
}
