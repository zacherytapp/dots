return {
	"xixiaofinland/sf.nvim",
	name = "sf.nvim",
	branch = "main",
	dev = false,
	lazy = true,
	event = "VeryLazy",
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
		{ "ibhagwan/fzf-lua", opts = {
			fzf_colors = true,
		} },
	},
	config = function()
		require("sf").setup({
			enable_hotkeys = false,
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
				"EmailTemplate",
				"ExperienceBundle",
				"ExternalCredential",
				"FlexiPage",
				"FlowDefinition",
				"Flow",
				"Group",
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
				"StandardValueSet",
				"StaticResource",
				"ValidationRule",
			},
			term_config = {
				dimensions = {
					height = 0.6,
					width = 0.9,
					y = 0.5,
				},
			},
		})
	end,
	commander = {
		-- Org operations (<leader>so*)
		{
			keys = { "n", "<leader>sof" },
			cmd = [[<cmd>lua require'sf'.fetch_org_list()<cr>]],
			desc = "Salesforce: Fetch Org List",
		},
		{
			keys = { "n", "<leader>sog" },
			cmd = [[<cmd>lua require'sf'.set_target_org()<cr>]],
			desc = "Salesforce: Set Target Org",
		},
		{
			keys = { "n", "<leader>soG" },
			cmd = [[<cmd>lua require'sf'.set_global_target_org()<cr>]],
			desc = "Salesforce: Set Global Target Org",
		},
		{
			keys = { "n", "<leader>soo" },
			cmd = [[<cmd>lua require'sf'.org_open()<cr>]],
			desc = "Salesforce: Open Org in Browser",
		},
		{
			keys = { "n", "<leader>soF" },
			cmd = [[<cmd>lua require'sf'.org_open_current_file()<cr>]],
			desc = "Salesforce: Open Current File in Org",
		},
		{
			keys = { "n", "<leader>sol" },
			cmd = [[<cmd>lua require'sf'.pull_log()<cr>]],
			desc = "Salesforce: Pull Apex Log",
		},

		-- Terminal (already under <leader>s*)
		{
			keys = { "n", "<leader>st" },
			cmd = [[<cmd>lua require'sf'.toggle_term()<cr>]],
			desc = "Salesforce: Toggle Terminal",
		},
		{
			keys = { "n", "<leader>sc" },
			cmd = [[<cmd>lua require'sf'.cancel()<cr>]],
			desc = "Salesforce: Cancel Running Command",
		},

		-- Deploy/Push (already under <leader>s*)
		{
			keys = { "n", "<leader>ss" },
			cmd = [[<cmd>lua require'sf'.save_and_push()<cr>]],
			desc = "Salesforce: Save and Push",
		},
		{
			keys = { "n", "<leader>sd" },
			cmd = [[<cmd>lua require'sf'.push_delta()<cr>]],
			desc = "Salesforce: Deploy Project (Delta)",
		},

		-- Retrieve (<leader>sr*)
		{
			keys = { "n", "<leader>srp" },
			cmd = [[<cmd>lua require'sf'.retrieve()<cr>]],
			desc = "Salesforce: Retrieve File",
		},
		{
			keys = { "n", "<leader>srd" },
			cmd = [[<cmd>lua require'sf'.retrieve_delta()<cr>]],
			desc = "Salesforce: Retrieve Project (Delta)",
		},
		{
			keys = { "v", "<leader>srf" },
			cmd = [[<cmd>lua require'sf'.retrieve_apex_under_cursor()<cr>]],
			desc = "Salesforce: Retrieve Apex Under Cursor",
		},
		{
			keys = { "n", "<leader>srk" },
			cmd = [[<cmd>lua require'sf'.retrieve_package()<cr>]],
			desc = "Salesforce: Retrieve Package",
		},

		-- Diff (<leader>sd*)
		{
			keys = { "n", "<leader>sdf" },
			cmd = [[<cmd>lua require'sf'.diff_in_target_org()<cr>]],
			desc = "Salesforce: Diff File Against Target Org",
		},
		{
			keys = { "n", "<leader>sdo" },
			cmd = [[<cmd>lua require'sf'.diff_in_org()<cr>]],
			desc = "Salesforce: Diff File Against Chosen Org",
		},

		-- Run/Execute
		{
			keys = { "n", "<leader>srq" },
			cmd = [[<cmd>lua require'sf'.run_query()<cr>]],
			desc = "Salesforce: Run Query in File",
		},
		{
			keys = { "n", "<leader>stq" },
			cmd = [[<cmd>lua require'sf'.run_tooling_query()<cr>]],
			desc = "Salesforce: Run Tooling Query in File",
		},
		{
			keys = { "v", "<leader>shq" },
			cmd = [[<cmd>lua require'sf'.run_highlighted_soql()<cr>]],
			desc = "Salesforce: Run Highlighted Query",
		},
		{
			keys = { "n", "<leader>sra" },
			cmd = [[<cmd>lua require'sf'.run_anonymous()<cr>]],
			desc = "Salesforce: Run File as Anonymous Apex",
		},

		-- Metadata (<leader>sm*)
		{
			keys = { "n", "<leader>smr" },
			cmd = [[<cmd>lua require'sf'.list_md_to_retrieve()<cr>]],
			desc = "Salesforce: List Metadata to Retrieve",
		},
		{
			keys = { "n", "<leader>smp" },
			cmd = [[<cmd>lua require'sf'.pull_md_json()<cr>]],
			desc = "Salesforce: Pull Metadata Names",
		},
		{
			keys = { "n", "<leader>smt" },
			cmd = [[<cmd>lua require'sf'.list_md_type_to_retrieve()<cr>]],
			desc = "Salesforce: List Metadata Types to Retrieve",
		},
		{
			keys = { "n", "<leader>smT" },
			cmd = [[<cmd>lua require'sf'.pull_md_type_json()<cr>]],
			desc = "Salesforce: Pull Metadata Type List",
		},
		{
			keys = { "n", "<leader>smP" },
			cmd = [[<cmd>lua require'sf'.set_current_package()<cr>]],
			desc = "Salesforce: Set Current Package",
		},

		-- Create (<leader>sc*)
		{
			keys = { "n", "<leader>scc" },
			cmd = [[<cmd>lua require'sf'.create_apex_class()<cr>]],
			desc = "Salesforce: Create Apex Class",
		},
		{
			keys = { "n", "<leader>sca" },
			cmd = [[<cmd>lua require'sf'.create_aura_bundle()<cr>]],
			desc = "Salesforce: Create Aura Bundle",
		},
		{
			keys = { "n", "<leader>scw" },
			cmd = [[<cmd>lua require'sf'.create_lwc_bundle()<cr>]],
			desc = "Salesforce: Create LWC Bundle",
		},
		{
			keys = { "n", "<leader>scr" },
			cmd = [[<cmd>lua require'sf'.create_trigger()<cr>]],
			desc = "Salesforce: Create Apex Trigger",
		},
		{
			keys = { "n", "<leader>scg" },
			cmd = [[<cmd>lua require'sf'.create_ctags()<cr>]],
			desc = "Salesforce: Create Ctags",
		},
		{
			keys = { "n", "<leader>scG" },
			cmd = [[<cmd>lua require'sf'.create_and_list_ctags()<cr>]],
			desc = "Salesforce: Create and List Ctags",
		},

		-- Apex class management
		{
			keys = { "n", "<leader>scD" },
			cmd = [[<cmd>lua require'sf'.delete_current_apex_remote_and_local()<cr>]],
			desc = "Salesforce: Delete Apex (Remote + Local)",
		},
		{
			keys = { "n", "<leader>scN" },
			cmd = [[<cmd>lua require'sf'.rename_apex_class_remote_and_local()<cr>]],
			desc = "Salesforce: Rename Apex Class (Remote + Local)",
		},

		-- Tests with coverage (<leader>st*)
		{
			keys = { "n", "<leader>stm" },
			cmd = [[<cmd>lua require'sf'.run_current_test_with_coverage()<cr>]],
			desc = "Salesforce: Run Test Method (with Coverage)",
		},
		{
			keys = { "n", "<leader>stf" },
			cmd = [[<cmd>lua require'sf'.run_all_tests_in_this_file_with_coverage()<cr>]],
			desc = "Salesforce: Run Test File (with Coverage)",
		},
		-- Tests without coverage (faster)
		{
			keys = { "n", "<leader>stM" },
			cmd = [[<cmd>lua require'sf'.run_current_test()<cr>]],
			desc = "Salesforce: Run Test Method (Quick)",
		},
		{
			keys = { "n", "<leader>stF" },
			cmd = [[<cmd>lua require'sf'.run_all_tests_in_this_file()<cr>]],
			desc = "Salesforce: Run Test File (Quick)",
		},
		{
			keys = { "n", "<leader>sto" },
			cmd = [[<cmd>lua require'sf'.open_test_select()<cr>]],
			desc = "Salesforce: Open Test Select",
		},
		{
			keys = { "n", "<leader>str" },
			cmd = [[<cmd>lua require'sf'.repeat_last_tests()<cr>]],
			desc = "Salesforce: Repeat Last Test Run",
		},
		{
			keys = { "n", "<leader>stl" },
			cmd = [[<cmd>lua require'sf'.run_local_tests()<cr>]],
			desc = "Salesforce: Run All Local Tests",
		},
		-- Jest tests
		{
			keys = { "n", "<leader>stj" },
			cmd = [[<cmd>lua require'sf'.run_all_jests()<cr>]],
			desc = "Salesforce: Run All Jest Tests",
		},
		{
			keys = { "n", "<leader>stJ" },
			cmd = [[<cmd>lua require'sf'.run_jest_file()<cr>]],
			desc = "Salesforce: Run Jest Tests in File",
		},

		-- Coverage signs and navigation
		{
			keys = { "n", "<leader>sts" },
			cmd = [[<cmd>lua require'sf'.toggle_sign()<cr>]],
			desc = "Salesforce: Toggle Coverage Signs",
		},
		{
			keys = { "n", "]v" },
			cmd = [[<cmd>lua require'sf'.uncovered_jump_forward()<cr>]],
			desc = "Salesforce: Jump to Next Uncovered",
		},
		{
			keys = { "n", "[v" },
			cmd = [[<cmd>lua require'sf'.uncovered_jump_backward()<cr>]],
			desc = "Salesforce: Jump to Prev Uncovered",
		},
	},
}
