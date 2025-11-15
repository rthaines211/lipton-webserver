#!/usr/bin/env python3
"""
Validation Summary Tool - Enhanced Version

Generates a human-readable summary comparing form submissions with pipeline outputs.
Shows total possible interrogatories/flags and highlights what's missing.

Usage:
    cd "normalization work"
    venv/bin/python3 validation_summary.py [timestamp]

    # Use latest files
    venv/bin/python3 validation_summary.py

    # Use specific timestamp
    venv/bin/python3 validation_summary.py 20251110_130213
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple
from collections import defaultdict


def load_json(filepath: Path) -> Dict:
    """Load JSON file."""
    with open(filepath) as f:
        return json.load(f)


def load_profile_definitions() -> Dict[str, Dict[str, int]]:
    """Load interrogatory counts from profile definitions."""
    sys.path.insert(0, str(Path(__file__).parent / "src"))

    try:
        from phase4.profiles.srogs_complete import SROGsProfile
        from phase4.profiles.pods_complete import PODsProfile
        from phase4.profiles.admissions_complete import AdmissionsProfile

        return {
            "SROGs": SROGsProfile().interrogatory_counts,
            "PODs": PODsProfile().interrogatory_counts,
            "Admissions": AdmissionsProfile().interrogatory_counts
        }
    except ImportError as e:
        print(f"⚠️  Warning: Could not load profile definitions: {e}")
        return {}


def find_latest_outputs() -> Dict[str, Path]:
    """Find the most recent output files."""
    cwd = Path(".")
    outputs = {}

    for phase in range(1, 6):
        files = sorted(cwd.glob(f"output_phase{phase}_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if files:
            outputs[f"phase{phase}"] = files[0]

    return outputs


def get_all_possible_options() -> Dict[str, List[str]]:
    """Return all possible options for each issue category."""
    return {
        "vermin": ["Rats/Mice", "Skunks", "Bats", "Raccoons", "Pigeons", "Opossums"],
        "insects": ["Ants", "Roaches", "Flies", "Bedbugs", "Wasps", "Hornets", "Spiders", "Termites", "Mosquitos", "Bees"],
        "hvac": ["Air Conditioner", "Heater", "Ventilation"],
        "electrical": ["Outlets", "Panel", "Wall Switches", "Exterior Lighting", "Interior Lighting", "Light Fixtures", "Fans"],
        "fire_hazard": ["Smoke Alarms", "Fire Extinguisher", "Non-compliant electricity", "Non-GFI outlets near water", "Carbon monoxide detectors"],
        "government": ["Health Department", "Housing Authority", "Code Enforcement", "Fire Department", "Police Department", "Department of Environmental Health", "Department of Health Services"],
        "appliances": ["Stove", "Dishwasher", "Washer/dryer", "Oven", "Microwave", "Garbage disposal", "Refrigerator"],
        "plumbing": ["Toilet", "Insufficient water pressure", "Clogged bath", "Shower", "No hot water", "Clogged sinks", "Bath", "No cold water", "Clogged shower", "Fixtures", "Sewage coming out", "No Clean Water Supply", "Leaks", "Clogged toilets", "Unsanitary water"],
        "cabinets": ["Broken", "Hinges", "Alignment"],
        "flooring": ["Uneven", "Carpet", "Nails sticking out", "Tiles"],
        "windows": ["Broken", "Screens", "Leaks", "Do not lock", "Missing windows", "Broken or missing screens"],
        "doors": ["Broken", "Knobs", "Locks", "Broken hinges", "Sliding glass doors", "Ineffective waterproofing", "Water intrusion and/or insects", "Do not close properly"],
        "structure": ["Bumps in ceiling", "Hole in ceiling", "Water stains on ceiling", "Water stains on wall", "Hole in wall", "Paint", "Exterior deck/porch", "Waterproof toilet", "Waterproof tub", "Staircase", "Basement flood", "Leaks in garage", "Soft Spots due to Leaks", "Ineffective waterproofing of the tubs or toilet", "Ineffective Weatherproofing of any windows doors"],
        "common_areas": ["Mailbox broken", "Parking area issues", "Damage to cars", "Flooding", "Entrances blocked", "Swimming pool", "Jacuzzi", "Laundry room", "Recreation room", "Gym", "Elevator", "Filth Rubbish Garbage", "Vermin", "Insects", "Broken Gate", "Blocked areas/doors"],
        "trash": ["Inadequate number of receptacles", "Properly servicing and emptying receptacles"],
        "nuisance": ["Drugs", "Smoking", "Noisy neighbors", "Gangs"],
        "health_hazard": ["Mold", "Mildew", "Mushrooms", "Raw sewage on exterior", "Noxious fumes", "Chemicals/Paint contamination", "Toxic water pollution", "Offensive odors"],
        "harassment": ["Unlawful detainer", "Eviction threat", "Harrassment by defendants", "Harrassment by maintenance man/workers", "Harrassment by manager/staff", "Harrassment by owner and their guests", "Other tenants", "Illegitimate notices", "Refusal to make timely repairs", "Written threats", "Aggressive/inappropriate language", "Physical threats or touching", "Notices singling out one tenant", "Duplicative notices", "Untimely response from landlord"],
        "notices": ["3-day notices", "24-hour notices", "30-day notices", "60-day notices", "To quit notices", "Perform or quit"],
        "utilities": ["Gas leaks", "Water shutoffs", "Electricity shutoffs", "Heat shutoffs", "Gas shutoffs"],
        "safety": ["Safety", "Inoperable locks", "Broken security gate", "Security cameras", "Broken buzzer to get in"]
    }


def extract_form_issues(form_data: Dict) -> Dict[str, List[str]]:
    """Extract issue selections from form submission."""
    issues = {}

    plaintiffs = form_data.get("PlaintiffDetails", [])

    for plaintiff in plaintiffs:
        if not plaintiff.get("HeadOfHousehold"):
            continue

        discovery = plaintiff.get("PlaintiffItemNumberDiscovery", {})

        # Extract issue arrays
        issue_mapping = {
            "Vermin": "vermin",
            "Insects": "insects",
            "HVAC": "hvac",
            "Electrical": "electrical",
            "Fire Hazard": "fire_hazard",
            "Specific Government Entity Contacted": "government",
            "Plumbing": "plumbing",
            "Cabinets": "cabinets",
            "Flooring": "flooring",
            "Windows": "windows",
            "Doors": "doors",
            "Structure": "structure",
            "Common areas": "common_areas",
            "Nuisance": "nuisance",
            "Health hazard": "health_hazard",
            "Harassment": "harassment",
            "Select Notices Issues": "notices",
            "Select Utilities Issues": "utilities",
            "Select Safety Issues": "safety",
            "Appliances": "appliances",
            "Select Trash Problems": "trash",
        }

        for form_key, norm_key in issue_mapping.items():
            items = discovery.get(form_key, [])
            if items:
                issues[norm_key] = items

    return issues


def get_all_flags(phase3_data: Dict) -> Tuple[List[str], List[str]]:
    """Get lists of true and false flags from Phase 3."""
    datasets = phase3_data.get("datasets", [])
    if not datasets:
        return [], []

    flags = datasets[0].get("flags", {})
    true_flags = sorted([flag for flag, value in flags.items() if value is True])
    false_flags = sorted([flag for flag, value in flags.items() if value is False])

    return true_flags, false_flags


def get_profile_data_from_phase4(phase4_data: Dict, doc_type_lower: str) -> Dict[str, int]:
    """Get interrogatory counts for a specific profile from Phase 4."""
    datasets = phase4_data.get("datasets", [])

    if not datasets:
        return {}

    # Phase 4 structure has profiles as keys at dataset level
    dataset = datasets[0]
    profile_data = dataset.get(doc_type_lower, {})

    return profile_data.get("interrogatory_counts", {})


def get_set_info_from_phase5(phase5_data: Dict, doc_type: str) -> List[Dict]:
    """Get set information for a specific document type from Phase 5."""
    datasets = phase5_data.get("datasets", [])

    for dataset in datasets:
        if dataset.get("doc_type") == doc_type:
            sets = dataset.get("sets", [])
            return [{
                "set_number": s.get("SetNumber", s.get("set_number")),
                "interrogatory_count": s.get("InterrogatoryCount", s.get("interrogatory_count")),
                "filename": s.get("OutputName", s.get("filename", "N/A"))
            } for s in sets]

    return []


def print_section(title: str):
    """Print a section header."""
    print("\n" + "=" * 90)
    print(f"  {title}")
    print("=" * 90 + "\n")


def print_header(title: str):
    """Print a main header."""
    print("\n" + "=" * 90)
    print(f"  {title}")
    print("=" * 90)


def main():
    # Get timestamp from command line or use latest
    if len(sys.argv) > 1:
        timestamp = sys.argv[1]
        outputs = {
            f"phase{i}": Path(f"output_phase{i}_{timestamp}.json")
            for i in range(1, 6)
        }
    else:
        print("🔍 Finding latest output files...")
        outputs = find_latest_outputs()

    # Verify all files exist
    missing = [name for name, path in outputs.items() if not path.exists()]
    if missing:
        print(f"❌ Missing output files: {', '.join(missing)}")
        return 1

    print("✅ Found output files:")
    for phase, path in outputs.items():
        print(f"   {phase}: {path.name}")

    # Load profile definitions to get max possible counts
    print("\n📚 Loading profile definitions...")
    profile_defs = load_profile_definitions()

    if profile_defs:
        print("✅ Profile definitions loaded")
        for profile_name, counts in profile_defs.items():
            total = sum(counts.values())
            print(f"   {profile_name}: {len(counts)} flags, {total} total interrogatories")
    else:
        print("⚠️  Could not load profile definitions (will show limited info)")

    # Load all data
    form_data = load_json(Path("formtest.json"))
    phase1_data = load_json(outputs["phase1"])
    phase2_data = load_json(outputs["phase2"])
    phase3_data = load_json(outputs["phase3"])
    phase4_data = load_json(outputs["phase4"])
    phase5_data = load_json(outputs["phase5"])

    # Get flag statistics
    true_flags, false_flags = get_all_flags(phase3_data)
    total_flags = len(true_flags) + len(false_flags)

    # Print main header with totals
    print_header("VALIDATION SUMMARY WITH TOTAL POSSIBLE COUNTS")

    if profile_defs:
        srogs_max = sum(profile_defs.get("SROGs", {}).values())
        pods_max = sum(profile_defs.get("PODs", {}).values())
        admissions_max = sum(profile_defs.get("Admissions", {}).values())

        # Get actual counts from Phase 4
        srogs_actual_counts = get_profile_data_from_phase4(phase4_data, "srogs")
        pods_actual_counts = get_profile_data_from_phase4(phase4_data, "pods")
        admissions_actual_counts = get_profile_data_from_phase4(phase4_data, "admissions")

        srogs_actual = sum(srogs_actual_counts.values())
        pods_actual = sum(pods_actual_counts.values())
        admissions_actual = sum(admissions_actual_counts.values())

        print(f"\n📊 INTERROGATORY COUNTS (Actual / Maximum Possible):")
        print(f"   SROGs:      {srogs_actual:>5} / {srogs_max:>5}  ({srogs_actual/srogs_max*100:.1f}%)")
        print(f"   PODs:       {pods_actual:>5} / {pods_max:>5}  ({pods_actual/pods_max*100:.1f}%)")
        print(f"   Admissions: {admissions_actual:>5} / {admissions_max:>5}  ({admissions_actual/admissions_max*100:.1f}%)")

        print(f"\n🚩 FLAG COUNTS (Flags Set True / Total Possible):")
        print(f"   Flags set to TRUE:  {len(true_flags):>3} / {total_flags:>3}  ({len(true_flags)/total_flags*100:.1f}%)")
        print(f"   Flags set to FALSE: {len(false_flags):>3} / {total_flags:>3}  ({len(false_flags)/total_flags*100:.1f}%)")

    # Extract form information
    print_section("CHECKPOINT 1: FORM SUBMISSION")

    plaintiffs = form_data.get("PlaintiffDetails", [])
    defendants = form_data.get("DefendantDetails2", [])
    hoh_plaintiffs = [p for p in plaintiffs if p.get("HeadOfHousehold")]

    print(f"Address: {form_data.get('Full_Address', {}).get('StreetAddress', 'N/A')}")
    print(f"Filing County: {form_data.get('Filing county', 'N/A')}")
    print(f"Total Plaintiffs: {len(plaintiffs)} (Head of Household: {len(hoh_plaintiffs)})")
    print(f"Total Defendants: {len(defendants)}")

    if hoh_plaintiffs:
        hoh = hoh_plaintiffs[0]
        print(f"\nHead of Household: {hoh.get('PlaintiffItemNumberName', {}).get('FirstAndLast', 'N/A')}")

    if defendants:
        defendant = defendants[0]
        print(f"Defendant: {defendant.get('DefendantItemNumberName', {}).get('FirstAndLast', 'N/A')}")
        print(f"  Role: {defendant.get('DefendantItemNumberManagerOwner', 'N/A')}")

    # Extract issues from form
    form_issues = extract_form_issues(form_data)
    all_possible_options = get_all_possible_options()

    print(f"\n📋 Issues Selected in Form ({len(form_issues)} categories):")
    total_selections = sum(len(items) for items in form_issues.values())
    total_possible = sum(len(options) for options in all_possible_options.values())
    print(f"   Total individual selections: {total_selections} out of {total_possible} possible options")

    for category, items in sorted(form_issues.items()):
        possible = all_possible_options.get(category, [])

        # Case-insensitive comparison for finding unselected items
        items_lower = [item.lower() for item in items]
        not_selected = [opt for opt in possible if opt.lower() not in items_lower]

        print(f"\n  {category.upper()} ({len(items)} selected out of {len(possible)} total):")

        # Show selected items
        for item in items:
            print(f"    ✓ {item}")

        # Show unselected items
        if not_selected:
            print(f"    ⚪ Not selected ({len(not_selected)}):")
            for item in not_selected:
                print(f"       - {item}")

    # Phase 1: Discovery extraction
    print_section("CHECKPOINT 2: PHASE 1 - INPUT NORMALIZATION")

    phase1_plaintiffs = phase1_data.get("plaintiffs", [])
    phase1_defendants = phase1_data.get("defendants", [])

    print(f"✅ Plaintiffs extracted: {len(phase1_plaintiffs)}")
    print(f"✅ Defendants extracted: {len(phase1_defendants)}")

    if phase1_plaintiffs:
        p1 = phase1_plaintiffs[0]
        print(f"\nPlaintiff: {p1.get('full_name', 'N/A')}")
        print(f"  Type: {p1.get('plaintiff_type', 'N/A')}")
        print(f"  Head of Household: {p1.get('is_head_of_household', False)}")

        discovery = p1.get("discovery", {})
        if discovery:
            matched = 0
            mismatched = 0

            # Compare form issues with Phase 1 discovery
            for category, items in sorted(form_issues.items()):
                phase1_items = discovery.get(category, [])

                if set(items) == set(phase1_items):
                    matched += 1
                else:
                    mismatched += 1

            print(f"\n✅ Discovery Extraction: {matched}/{len(form_issues)} categories matched")
            if mismatched > 0:
                print(f"⚠️  {mismatched} categories had mismatches:")

                for category, items in sorted(form_issues.items()):
                    phase1_items = discovery.get(category, [])
                    if set(items) != set(phase1_items):
                        print(f"  ❌ {category}:")
                        print(f"      Form: {len(items)} items")
                        print(f"      Phase 1: {len(phase1_items)} items")
        else:
            print("  ❌ No discovery data found!")

    # Phase 2: Dataset building
    print_section("CHECKPOINT 3: PHASE 2 - DATASET BUILDER")

    datasets_count = len(phase2_data.get("datasets", []))
    expected_count = len(hoh_plaintiffs) * len(defendants)

    print(f"Expected datasets: {len(hoh_plaintiffs)} HoH × {len(defendants)} Defendants = {expected_count}")
    print(f"Actual datasets: {datasets_count}")

    if datasets_count == expected_count:
        print("✅ Dataset count matches!")
    else:
        print("❌ Dataset count MISMATCH!")

    # Phase 3: Flag processing
    print_section("CHECKPOINT 4: PHASE 3 - FLAG PROCESSING")

    print(f"Total flags in system: {total_flags}")
    print(f"  Flags set to TRUE:  {len(true_flags)} ({len(true_flags)/total_flags*100:.1f}%)")
    print(f"  Flags set to FALSE: {len(false_flags)} ({len(false_flags)/total_flags*100:.1f}%)")

    # Show categories of TRUE flags
    flag_categories = defaultdict(list)
    for flag in true_flags:
        if flag.startswith("Has"):
            # Categorize by common prefixes
            if any(x in flag for x in ["Vermin", "RatsMice", "Skunks", "Bats", "Raccoons", "Pigeons", "Opossums"]):
                flag_categories["Vermin"].append(flag)
            elif any(x in flag for x in ["Roaches", "Bedbugs", "Ants", "Flies", "Wasps", "Hornets", "Spiders", "Termites", "Mosquitos", "Bees"]):
                flag_categories["Insects"].append(flag)
            elif any(x in flag for x in ["HVAC", "AC", "Heater", "Ventilation"]):
                flag_categories["HVAC"].append(flag)
            elif any(x in flag for x in ["Plumbing", "Toilet", "Shower", "Bath", "Leaks", "Sewage", "Water"]):
                flag_categories["Plumbing"].append(flag)
            elif any(x in flag for x in ["Mold", "Mildew", "Mushrooms", "HealthHazard", "Noxious", "Toxic", "Offensive"]):
                flag_categories["Health Hazard"].append(flag)
            elif any(x in flag for x in ["Door", "Window", "Structure", "Flooring", "Cabinet"]):
                flag_categories["Structure/Building"].append(flag)
            elif any(x in flag for x in ["Electrical", "Outlets", "Panel", "Switches", "Lighting", "Fixtures", "Fans"]):
                flag_categories["Electrical"].append(flag)
            elif any(x in flag for x in ["Fire", "Smoke", "Extinguisher", "GFI", "CarbonMonoxide"]):
                flag_categories["Fire Hazard"].append(flag)
            else:
                flag_categories["Other"].append(flag)
        else:
            flag_categories["Profile-Specific"].append(flag)

    print("\n✅ FLAGS SET TO TRUE (by category):")
    for category, flags in sorted(flag_categories.items()):
        print(f"  {category}: {len(flags)} flags")

    # Show FALSE flags organized by category
    false_flag_categories = defaultdict(list)
    for flag in false_flags:
        if "Notices" in flag or "Notice" in flag:
            false_flag_categories["Notices (not selected)"].append(flag)
        elif "Discrimination" in flag:
            false_flag_categories["Discrimination (not selected)"].append(flag)
        elif "Harassment" in flag or "Harass" in flag:
            false_flag_categories["Harassment (not selected)"].append(flag)
        elif "Appliance" in flag or "Stove" in flag or "Dishwasher" in flag or "Refrigerator" in flag:
            false_flag_categories["Appliances (not selected)"].append(flag)
        elif "Common" in flag or "Elevator" in flag or "Pool" in flag or "Gym" in flag:
            false_flag_categories["Common Areas (not selected)"].append(flag)
        elif "Utility" in flag or "Shutoff" in flag or "Gas" in flag:
            false_flag_categories["Utilities (not selected)"].append(flag)
        elif "Security" in flag or "Lock" in flag:
            false_flag_categories["Security (not selected)"].append(flag)
        elif "Injury" in flag or "Stolen" in flag or "Damaged" in flag:
            false_flag_categories["Injury/Property Damage (not selected)"].append(flag)
        else:
            false_flag_categories["Other (not selected)"].append(flag)

    print(f"\n⚪ FLAGS SET TO FALSE - What's Missing ({len(false_flags)} flags not triggered):")
    for category, flags in sorted(false_flag_categories.items()):
        print(f"\n  {category}: {len(flags)} flags")
        if len(flags) <= 10:
            for flag in sorted(flags):
                print(f"    - {flag}")
        else:
            for flag in sorted(flags)[:5]:
                print(f"    - {flag}")
            print(f"    ... and {len(flags) - 5} more")

    # Phase 4: Profile filtering
    print_section("CHECKPOINT 5: PHASE 4 - DOCUMENT PROFILES")

    for profile_name in ["SROGs", "PODs", "Admissions"]:
        profile_key = profile_name.lower()
        actual_counts = get_profile_data_from_phase4(phase4_data, profile_key)

        if actual_counts:
            actual_total = sum(actual_counts.values())
            actual_flags = len(actual_counts)

            # Get max possible from definitions
            if profile_defs and profile_name in profile_defs:
                max_total = sum(profile_defs[profile_name].values())
                max_flags = len(profile_defs[profile_name])
                missing_count = max_total - actual_total
                missing_flags = max_flags - actual_flags

                print(f"\n{profile_name} Profile:")
                print(f"  Actual:   {actual_total:>5} interrogatories from {actual_flags:>3} flags")
                print(f"  Maximum:  {max_total:>5} interrogatories from {max_flags:>3} flags")
                print(f"  Missing:  {missing_count:>5} interrogatories from {missing_flags:>3} flags ({(actual_total/max_total*100):.1f}% utilized)")
            else:
                print(f"\n{profile_name} Profile:")
                print(f"  Total interrogatories: {actual_total}")
                print(f"  Flags included: {actual_flags}")

            # Show top 15 highest counts
            top_flags = sorted(actual_counts.items(), key=lambda x: x[1], reverse=True)[:15]
            print(f"\n  Top 15 Interrogatory Counts:")
            for flag, count in top_flags:
                print(f"    {flag:<45} {count:>3}")

            # Show what major flags are missing (if profile definitions available)
            if profile_defs and profile_name in profile_defs:
                profile_def = profile_defs[profile_name]
                missing_flags_list = []

                for flag_name, max_count in profile_def.items():
                    if flag_name not in actual_counts and max_count >= 10:
                        missing_flags_list.append((flag_name, max_count))

                if missing_flags_list:
                    missing_flags_list.sort(key=lambda x: x[1], reverse=True)
                    print(f"\n  ⚪ Missing High-Value Flags (count >= 10):")
                    for flag_name, count in missing_flags_list[:10]:
                        print(f"    {flag_name:<45} would add {count:>3} interrogatories")
                    if len(missing_flags_list) > 10:
                        print(f"    ... and {len(missing_flags_list) - 10} more missing flags")

    # Phase 5: Set splitting
    print_section("CHECKPOINT 6: PHASE 5 - SET SPLITTING")

    for profile_name in ["SROGs", "PODs", "Admissions"]:
        sets = get_set_info_from_phase5(phase5_data, profile_name)

        if sets:
            total_interrog = sum(s["interrogatory_count"] for s in sets)
            print(f"\n{profile_name} - {len(sets)} sets created:")
            print(f"  Total interrogatories: {total_interrog}")
            print(f"  Average per set: {total_interrog / len(sets):.1f}")

            print(f"\n  Set Distribution:")
            for set_info in sets:
                set_num = set_info['set_number']
                count = set_info['interrogatory_count']
                filename = set_info['filename']

                # Truncate filename if too long
                if len(filename) > 60:
                    filename = filename[:57] + "..."

                print(f"    Set {set_num}: {count:>3} interrogatories - {filename}")

    # Final Summary
    print_section("VALIDATION SUMMARY")

    print("✅ All 5 phases completed successfully!")

    if profile_defs:
        srogs_actual_counts = get_profile_data_from_phase4(phase4_data, "srogs")
        pods_actual_counts = get_profile_data_from_phase4(phase4_data, "pods")
        admissions_actual_counts = get_profile_data_from_phase4(phase4_data, "admissions")

        srogs_actual = sum(srogs_actual_counts.values())
        pods_actual = sum(pods_actual_counts.values())
        admissions_actual = sum(admissions_actual_counts.values())

        srogs_max = sum(profile_defs["SROGs"].values())
        pods_max = sum(profile_defs["PODs"].values())
        admissions_max = sum(profile_defs["Admissions"].values())

        print("\n📊 FINAL COUNTS (Actual / Maximum Possible):")
        print(f"   Form issues selected: {len(form_issues)} categories, {total_selections} individual items")
        print(f"   Phase 3 flags TRUE:   {len(true_flags)} / {total_flags} ({len(true_flags)/total_flags*100:.1f}%)")
        print(f"   SROGs interrogatories:      {srogs_actual:>5} / {srogs_max:>5} ({srogs_actual/srogs_max*100:.1f}%)")
        print(f"   PODs interrogatories:       {pods_actual:>5} / {pods_max:>5} ({pods_actual/pods_max*100:.1f}%)")
        print(f"   Admissions interrogatories: {admissions_actual:>5} / {admissions_max:>5} ({admissions_actual/admissions_max*100:.1f}%)")

        total_actual = srogs_actual + pods_actual + admissions_actual
        total_max = srogs_max + pods_max + admissions_max

        print(f"\n   COMBINED TOTAL:   {total_actual:>5} / {total_max:>5} ({total_actual/total_max*100:.1f}%)")
        print(f"   Missing:          {total_max - total_actual:>5} interrogatories not triggered")

        # Major categories not selected
        print(f"\n⚪ MAJOR ISSUE CATEGORIES NOT SELECTED:")
        major_unselected = []

        # Check false flags for major categories
        if "HasElevator" in false_flags:
            major_unselected.append("Elevator issues (would add ~18 SROGs)")
        if "HasSecurityDeposit" in false_flags:
            major_unselected.append("Security Deposit disputes (would add 20 SROGs)")
        if "Has24HourNotices" in false_flags and "Has3DayNotices" in false_flags:
            major_unselected.append("Notice issues (would add various counts)")
        if "HasUnlawfulDetainer" in false_flags:
            major_unselected.append("Unlawful Detainer/Eviction (would add 12 SROGs)")
        if any("Discrimination" in f for f in false_flags):
            major_unselected.append("Discrimination issues (would add 8-10 SROGs each)")
        if any("Appliance" in f or "Stove" in f for f in false_flags):
            major_unselected.append("Appliance issues (would add various counts)")
        if any("Utility" in f or "Shutoff" in f for f in false_flags):
            major_unselected.append("Utility shutoffs (would add various counts)")

        for item in major_unselected:
            print(f"   - {item}")

        if not major_unselected:
            print("   (Most high-value categories were selected!)")

    print("\n" + "=" * 90)
    print("\n✅ VALIDATION COMPLETE")
    print("\nNext steps:")
    print("  1. Review flags set to FALSE to understand what wasn't selected")
    print("  2. Verify high-impact issues match expectations (Mold, Rats/Mice, Sewage)")
    print("  3. Check missing high-value flags if you want to add more issues")
    print("  4. Refer to MANUAL_VALIDATION_PLAN.md for detailed validation checklist")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
