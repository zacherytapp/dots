local commander = require("commander")
return {
	"xixiaofinland/sf.nvim",
	name = "sf.nvim",
	branch = "main",
	dev = false,
	lazy = true,
	event = "VeryLazy",
	-- cond = function()
	-- 	local ok, _ = pcall(require("sf.util").get_sf_root)
	-- 	return ok
	-- end,
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
		{ "ibhagwan/fzf-lua", opts = {
			fzf_colors = true,
		} },
	},
	config = function()
		require("sf").setup({
			enable_hotkeys = false,
		})
	end,
	opts = {
		types_to_retrieve = {
			"ApexClass",
			"ApexTrigger",
			"AuraDefinitionBundle",
			"ConnectedApp",
			"CustomApplication",
			"CustomField",
			"CustomMetadata",
			"CustomObject",
			"CustomPermission",
			"CustomTab",
			"ExperienceBundle",
			"ExternalCredential",
			"FlexiPage",
			"FlowDefinition",
			"Flow",
			"Layout",
			"LightningComponentBundle",
			"LightningMessageChannel",
			"NamedCredential",
			"OmniDataTransform",
			"OmniIntegrationProcedure",
			"PermissionSetGroup",
			"PermissionSet",
			"Profile",
			"QuickAction",
			"RecordType",
			"Role",
			"Settings",
			"SharingCriteriaRule",
			"SharingOwnerRule",
			"StaticResource",
		},
		term_config = {
			dimensions = {
				height = 0.6,
				width = 0.9,
				y = 0.5,
			},
		},
		plugin_folder_name = "/.sf/sf_cache/",
	},

	commander.add({
		{
			keys = { "n", "<leader>og" },
			cmd = [[<cmd>lua require'sf'.fetch_org_list()<cr>]],
			desc = "Salesforce: Get Orgs",
		},
		{
			keys = { "n", "<leader>st" },
			cmd = [[<cmd>lua require'sf'.toggle_term()<cr>]],
			desc = "Salesforce: Toggle Terminal",
		},
		{
			keys = { "n", "<leader>og" },
			cmd = [[<cmd>lua require'sf'.set_target_org()<cr>]],
			desc = "Salesforce: Set Target Org",
		},
		{
			keys = { "n", "<leader>df" },
			cmd = [[<cmd>lua require'sf'.diff_in_target_org()<cr>]],
			desc = "Salesforce: Diff file against org",
		},
		{
			keys = { "n", "<leader>ss" },
			cmd = [[<cmd>lua require'sf'.save_and_push()<cr>]],
			desc = "Salesforce: Save and push",
		},
		{
			keys = { "n", "<leader>rp" },
			cmd = [[<cmd>lua require'sf'.retrieve()<cr>]],
			desc = "Salesforce: Retrieve file",
		},
		{
			keys = { "v", "<leader>rf" },
			cmd = [[<cmd>lua require'sf'.retrieve_apex_under_cursor()<cr>]],
			desc = "Salesforce: Retrieve file",
		},
		{
			keys = { "n", "<leader>rq" },
			cmd = [[<cmd>lua require'sf'.run_query()<cr>]],
			desc = "Salesforce: Run Query in File",
		},
		{
			keys = { "n", "<leader>tq" },
			cmd = [[<cmd>lua require'sf'.run_tooling_query()<cr>]],
			desc = "Salesforce: Run Tooling Query in File",
		},
		{
			keys = { "n", "<leader>ra" },
			cmd = [[<cmd>lua require'sf'.run_anonymous()<cr>]],
			desc = "Salesforce: Run file as Anononymous Apex",
		},
		{
			keys = { "n", "<leader>rk" },
			cmd = [[<cmd>lua require'sf'.retrieve_package()<cr>]],
			desc = "Salesforce: Retrieve package",
		},
		{
			keys = { "n", "<leader>mr" },
			cmd = [[<cmd>lua require'sf'.list_md_to_retrieve()<cr>]],
			desc = "Salesforce: Retrieve Metadata",
		},
		{
			keys = { "n", "<leader>cc" },
			cmd = [[<cmd>lua require'sf'.create_apex_class()<cr>]],
			desc = "Salesforce: Create Apex Class",
		},
		{
			keys = { "n", "<leader>ca" },
			cmd = [[<cmd>lua require'sf'.create_aura_bundle()<cr>]],
			desc = "Salesforce: Create Aura Bundle",
		},
		{
			keys = { "n", "<leader>cl" },
			cmd = [[<cmd>lua require'sf'.create_lwc_bundle()<cr>]],
			desc = "Salesforce: Create LWC Bundle",
		},
		{
			keys = { "n", "<leader>tm" },
			cmd = [[<cmd>lua require'sf'.run_current_test_with_coverage()<cr>]],
			desc = "Salesforce: Run Test Method",
		},
		{
			keys = { "n", "<leader>tf" },
			cmd = [[<cmd>lua require'sf'.run_all_tests_in_this_file_with_coverage()<cr>]],
			desc = "Salesforce: Run Test File",
		},
		{
			keys = { "n", "<leader>tr" },
			cmd = [[<cmd>lua require'sf'.repeat_last_tests()<cr>]],
			desc = "Salesforce: Repeat last test run",
		},
		{
			keys = { "n", "<leader>tl" },
			cmd = [[<cmd>lua require'sf'.run_local_tests()<cr>]],
			desc = "Salesforce: Run all Local Tests",
		},
		{
			keys = { "v", "<leader>hq" },
			cmd = [[<cmd>lua require'sf'.run_highlighted_soql()<cr>]],
			desc = "Salesforce: Run Highlighted Query",
		},
	}),
}
