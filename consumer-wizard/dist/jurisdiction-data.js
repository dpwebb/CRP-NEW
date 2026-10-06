/* GENERATED FILE — do not edit by hand.
 * Consumer application jurisdiction and coverage data. Derived from the authoritative jurisdiction
 * enumeration and the verified PHASE5-001O coverage ledger; the only legal material it describes is
 * the material the owner already accepted.
 *
 * Rebuild:  node SOURCE_CAPTURES/PROD-002/build_prod002_jurisdiction_data.js
 * Verify:   node SOURCE_CAPTURES/PROD-002/check_prod002_jurisdiction_data.cjs
 * Test:     node SOURCE_CAPTURES/PROD-002/test_prod002_data_integrity.cjs
 *           node SOURCE_CAPTURES/PROD-002/test_prod002_jurisdiction_selection.cjs
 */
window.CRP_JURISDICTION_DATA = {
  "artifact": "jurisdiction-data.js",
  "generated_by": "PROD-002 — Consumer Application Jurisdiction Surface From the Accepted Corpus",
  "enumeration_version": "CRP-JURISDICTION-ENUM-1",
  "sources": {
    "enumeration": {
      "relative_path": "CRP_JURISDICTION_ENUMERATION.md",
      "bytes": 6912,
      "sha256": "D5EC34A52C1B14466CA601DD2BE49F74206856A9C7722B623468D84B9169EE93"
    },
    "coverage_ledger": {
      "relative_path": "SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json",
      "bytes": 2475693,
      "sha256": "99D6E37F3620C77B296488287F9F03C97B428F6D623A0F1D3CB53A691AFEC07D"
    },
    "coverage_summary": {
      "relative_path": "SOURCE_CAPTURES\\PHASE5-001O\\coverage_summary.json",
      "bytes": 19301,
      "sha256": "16B81448E73C8E526B488CDA1E3D162AAE49A698D3708BCF1620B85536AD97F6"
    },
    "gate_reassessment": {
      "relative_path": "SOURCE_CAPTURES\\PHASE5-001O\\gate_reassessment_001o.json",
      "bytes": 9819,
      "sha256": "E5FF906A3CB375EA8DDAC7D54C980F67C8B172B8C952A9A6D4129844EDB5A63F"
    }
  },
  "country_labels_basis": "Display labels declared by PROD-002. The enumeration defines country codes only; no label was taken from a source record and no label changes a canonical code.",
  "selection_basis": "A canonical country code and canonical region code from CRP-JURISDICTION-ENUM-1. Only exact listed codes are accepted: display names, aliases, free text, case variants and inferred mappings are not selectors, and a jurisdiction is never inferred from a location, a file name or report content.",
  "countries": [
    {
      "code": "CA",
      "display_name": "Canada",
      "region_count": 13
    },
    {
      "code": "US",
      "display_name": "United States",
      "region_count": 57
    },
    {
      "code": "GB",
      "display_name": "United Kingdom",
      "region_count": 4
    },
    {
      "code": "AU",
      "display_name": "Australia",
      "region_count": 8
    }
  ],
  "regions": [
    {
      "country_code": "CA",
      "region_code": "CA-AB",
      "display_name": "Alberta",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-BC",
      "display_name": "British Columbia",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-MB",
      "display_name": "Manitoba",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-NB",
      "display_name": "New Brunswick",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-NL",
      "display_name": "Newfoundland and Labrador",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-NS",
      "display_name": "Nova Scotia",
      "accepted_source_records": 15,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 14,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-NT",
      "display_name": "Northwest Territories",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-NU",
      "display_name": "Nunavut",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-ON",
      "display_name": "Ontario",
      "accepted_source_records": 15,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 14,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-PE",
      "display_name": "Prince Edward Island",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-QC",
      "display_name": "Quebec",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-SK",
      "display_name": "Saskatchewan",
      "accepted_source_records": 4,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "CA",
      "region_code": "CA-YT",
      "display_name": "Yukon",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-AK",
      "display_name": "Alaska",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-AL",
      "display_name": "Alabama",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 3,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-AR",
      "display_name": "Arkansas",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 3,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-AS",
      "display_name": "American Samoa",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-AZ",
      "display_name": "Arizona",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-CA",
      "display_name": "California",
      "accepted_source_records": 59,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 58,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-CO",
      "display_name": "Colorado",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-CT",
      "display_name": "Connecticut",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-DC",
      "display_name": "District of Columbia",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-DE",
      "display_name": "Delaware",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-FL",
      "display_name": "Florida",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-GA",
      "display_name": "Georgia",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-GU",
      "display_name": "Guam",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-HI",
      "display_name": "Hawaii",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-IA",
      "display_name": "Iowa",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-ID",
      "display_name": "Idaho",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-IL",
      "display_name": "Illinois",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-IN",
      "display_name": "Indiana",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-KS",
      "display_name": "Kansas",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-KY",
      "display_name": "Kentucky",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-LA",
      "display_name": "Louisiana",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 3,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MA",
      "display_name": "Massachusetts",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MD",
      "display_name": "Maryland",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-ME",
      "display_name": "Maine",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MI",
      "display_name": "Michigan",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MN",
      "display_name": "Minnesota",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MO",
      "display_name": "Missouri",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MP",
      "display_name": "Northern Mariana Islands",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MS",
      "display_name": "Mississippi",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-MT",
      "display_name": "Montana",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NC",
      "display_name": "North Carolina",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-ND",
      "display_name": "North Dakota",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NE",
      "display_name": "Nebraska",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NH",
      "display_name": "New Hampshire",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NJ",
      "display_name": "New Jersey",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NM",
      "display_name": "New Mexico",
      "accepted_source_records": 3,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 3,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NV",
      "display_name": "Nevada",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-NY",
      "display_name": "New York",
      "accepted_source_records": 66,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 66,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-OH",
      "display_name": "Ohio",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-OK",
      "display_name": "Oklahoma",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 2,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-OR",
      "display_name": "Oregon",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-PA",
      "display_name": "Pennsylvania",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-PR",
      "display_name": "Puerto Rico",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-RI",
      "display_name": "Rhode Island",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-SC",
      "display_name": "South Carolina",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-SD",
      "display_name": "South Dakota",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-TN",
      "display_name": "Tennessee",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-TX",
      "display_name": "Texas",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-UM",
      "display_name": "United States Minor Outlying Islands",
      "accepted_source_records": 0,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-UT",
      "display_name": "Utah",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-VA",
      "display_name": "Virginia",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-VI",
      "display_name": "Virgin Islands, U.S.",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-VT",
      "display_name": "Vermont",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-WA",
      "display_name": "Washington",
      "accepted_source_records": 25,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 25,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 1,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-WI",
      "display_name": "Wisconsin",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-WV",
      "display_name": "West Virginia",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "US",
      "region_code": "US-WY",
      "display_name": "Wyoming",
      "accepted_source_records": 2,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "GB",
      "region_code": "GB-ENG",
      "display_name": "England",
      "accepted_source_records": 0,
      "accepted_source_records_under_owner_approved_code_mapping": 2,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "GB",
      "region_code": "GB-NIR",
      "display_name": "Northern Ireland",
      "accepted_source_records": 0,
      "accepted_source_records_under_owner_approved_code_mapping": 1,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "GB",
      "region_code": "GB-SCT",
      "display_name": "Scotland",
      "accepted_source_records": 0,
      "accepted_source_records_under_owner_approved_code_mapping": 1,
      "recorded_legacy_operational_mappings": 1,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "GB",
      "region_code": "GB-WLS",
      "display_name": "Wales [Cymru GB-CYM]",
      "accepted_source_records": 0,
      "accepted_source_records_under_owner_approved_code_mapping": 2,
      "recorded_legacy_operational_mappings": 2,
      "unresolved_mapping_dependencies": 0,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-ACT",
      "display_name": "Australian Capital Territory",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-NSW",
      "display_name": "New South Wales",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-NT",
      "display_name": "Northern Territory",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-QLD",
      "display_name": "Queensland",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-SA",
      "display_name": "South Australia",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-TAS",
      "display_name": "Tasmania",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-VIC",
      "display_name": "Victoria",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    },
    {
      "country_code": "AU",
      "region_code": "AU-WA",
      "display_name": "Western Australia",
      "accepted_source_records": 1,
      "accepted_source_records_under_owner_approved_code_mapping": 0,
      "recorded_legacy_operational_mappings": 0,
      "unresolved_mapping_dependencies": 1,
      "records_not_accepted": 0,
      "records_with_unestablished_region_association": 0
    }
  ],
  "coverage_outside_the_region_list": {
    "accepted_source_records_country_wide": 95,
    "accepted_source_records_with_no_region_association": 1,
    "note": "Country-wide or unassigned accepted records are listed here and are never attributed to a region, so a region count is never inflated by them."
  },
  "totals": {
    "enumerated_regions": 82,
    "enumerated_countries": 4,
    "regions_with_accepted_records": 81,
    "regions_with_no_accepted_records": [
      "US-UM"
    ],
    "regions_with_no_ledger_row": [
      "US-UM"
    ],
    "ledger_rows": 437,
    "accepted_source_records": 410,
    "accepted_source_records_with_established_region_association": 308,
    "accepted_source_records_under_owner_approved_code_mapping": 6,
    "accepted_source_records_country_wide": 95,
    "accepted_source_records_with_no_region_association": 1,
    "records_not_accepted": 21,
    "records_accepted_as_recorded_material_not_as_a_statute": 6,
    "accepted_source_records_with_unestablished_region_association": 0
  },
  "definitions": {
    "accepted_source_records": "Accepted legal material: recorded source entries for this region that the owner accepted as legal authority. Each recorded source entry is counted once. These counts are not a count of unique statutes, admitted executable rules or available findings.",
    "accepted_source_records_under_owner_approved_code_mapping": "Accepted source records held under the owner-approved United Kingdom region-code mapping (UK-* to GB-*) rather than under the exact canonical region code.",
    "recorded_legacy_operational_mappings": "Recorded legacy operational mappings: accepted source records for this region that already carry an exact recorded link to a legacy limitation or rule row.",
    "unresolved_mapping_dependencies": "Unresolved mapping dependencies: recorded work items for this region whose legacy mapping is not established. They are tasks, not refusals.",
    "records_not_accepted": "Recorded entries for this region that are not accepted legal authority, such as recorded gaps or recorded refusals.",
    "records_with_unestablished_region_association": "Recorded entries that name this region but whose region association is not treated as established. They are reported as unresolved and are never counted as coverage.",
    "evaluation_available": "Whether a consumer report can be checked for this region. Report checking is not available yet: no supported report representation has been established and no rule has been admitted."
  },
  "consumer_language": {
    "coverage_label": "Legal coverage recorded",
    "coverage_unit": "accepted source records",
    "accepted_mapping_label": "accepted source records recorded under the owner-approved United Kingdom region-code mapping",
    "mappings_label": "Recorded legacy mappings",
    "dependencies_label": "Unresolved mapping dependencies",
    "not_accepted_label": "Recorded entries that are not accepted legal authority",
    "association_unresolved_label": "Recorded entries whose region association is not yet established",
    "evaluation_label": "Report checking not yet available.",
    "no_entries_label": "No accepted entries are recorded for this region.",
    "no_exact_entries_label": "No accepted entries are recorded under this region's exact code.",
    "country_wide_label": "accepted source records apply country-wide and are not attributed to any one region.",
    "selection_label": "Your selection is not a finding.",
    "counts_note": "These counts describe accepted source records only. They are not counts of unique statutes, executable rules or available findings."
  },
  "evaluation": {
    "available": false,
    "label": "Report checking not yet available.",
    "basis": "Report checking requires a supported consumer-report representation and at least one admitted rule. Neither is in place, so no region offers report checking."
  },
  "boundaries": [
    "This file is derived data. It admits no legal rule, creates no legal coverage and authorises no finding.",
    "Accepted source records are not counts of unique statutes, executable rules or available findings.",
    "The enumeration is unamended: country codes, region codes and display names are the recorded values.",
    "Owner acceptance of the legacy legal material is preserved; this file restates it and does not re-verify it."
  ]
};
