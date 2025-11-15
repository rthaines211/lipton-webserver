"""
Phase 4.5: Profile Consolidation

This phase creates master JSON files for each document profile type (SROGs, PODs, Admissions)
by consolidating all datasets of that type into a single comprehensive document.

This makes it easy to:
1. View all interrogatories for a document type in one place
2. Validate that profiles are applied correctly across all plaintiff-defendant pairs
3. Review the complete scope of discovery for each document type
4. Debug template rendering issues by comparing expected vs. actual interrogatories

Output:
- master_srogs.json: All SROGs datasets and interrogatories
- master_pods.json: All PODs datasets and interrogatories
- master_admissions.json: All Admissions datasets and interrogatories
"""

from .consolidator import consolidate_profiles

__all__ = ['consolidate_profiles']
