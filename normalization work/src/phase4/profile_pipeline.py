"""
Profile Pipeline

Applies document profiles (SROGs, PODs, Admissions) to datasets from Phase 3
to create profile-specific datasets.

PHASE 2.3 UPDATE:
- Now supports filtering by document_types to only generate selected profiles
- Defaults to all three document types if not specified (backwards compatible)
- Updated metadata to track which profiles were applied
"""

from typing import Dict, List, Any
from .profiles import SROGsProfile, PODsProfile, AdmissionsProfile


class ProfilePipeline:
    """
    Applies document profiles to datasets.

    PHASE 2.3: Supports selective profile generation based on document_types parameter.
    """

    def __init__(self):
        """Initialize the profile pipeline with all three profiles."""
        self.profiles = [
            SROGsProfile(),
            PODsProfile(),
            AdmissionsProfile()
        ]

    def apply_profiles(self, enriched_dataset: dict, document_types: list = None) -> dict:
        """
        Apply selected profiles to a single dataset.

        Args:
            enriched_dataset: Dataset from Phase 3 with flags
            document_types: List of document types to generate (PHASE 2.3)
                           Valid values: 'srogs', 'pods', 'admissions'
                           Defaults to all three if not provided

        Returns:
            Dictionary with selected profile datasets
        """
        # PHASE 2.3: Default to all document types if not specified
        if document_types is None:
            document_types = ['srogs', 'pods', 'admissions']

        # PHASE 2.3: Only apply selected profiles
        result = {}
        if 'srogs' in document_types:
            result['srogs'] = self.profiles[0].apply_profile(enriched_dataset)
        if 'pods' in document_types:
            result['pods'] = self.profiles[1].apply_profile(enriched_dataset)
        if 'admissions' in document_types:
            result['admissions'] = self.profiles[2].apply_profile(enriched_dataset)

        return result

    def apply_profiles_to_collection(self, dataset_collection: dict, document_types: list = None) -> dict:
        """
        Apply selected profiles to all datasets in collection.

        Args:
            dataset_collection: Collection from Phase 3
            document_types: List of document types to generate (PHASE 2.3)
                           Valid values: 'srogs', 'pods', 'admissions'
                           Defaults to all three if not provided

        Returns:
            Collection with profile datasets
        """
        # PHASE 2.3: Default to all document types if not specified
        if document_types is None:
            document_types = ['srogs', 'pods', 'admissions']

        profiled_datasets = []

        for dataset in dataset_collection['datasets']:
            # PHASE 2.3: Pass document_types to filter profiles
            profiles = self.apply_profiles(dataset, document_types)
            profiled_datasets.append(profiles)

        # PHASE 2.3: Calculate correct counts based on selected document types
        num_profiles = len(document_types)
        total_profile_datasets = len(profiled_datasets) * num_profiles

        return {
            'datasets': profiled_datasets,
            'metadata': {
                **dataset_collection['metadata'],
                'profiles_applied': num_profiles,
                'total_profile_datasets': total_profile_datasets,
                'document_types': document_types  # Track which types were generated
            }
        }

    def apply_single_profile(self, enriched_dataset: dict, profile_type: str) -> dict:
        """
        Apply a single profile to a dataset.

        Args:
            enriched_dataset: Dataset from Phase 3 with flags
            profile_type: Type of profile ('srogs', 'pods', 'admissions')

        Returns:
            Single profile dataset

        Raises:
            ValueError: If profile_type is not recognized
        """
        profile_map = {
            'srogs': self.profiles[0],
            'pods': self.profiles[1],
            'admissions': self.profiles[2]
        }

        if profile_type not in profile_map:
            raise ValueError(f"Unknown profile type: {profile_type}. "
                           f"Must be one of: {list(profile_map.keys())}")

        return profile_map[profile_type].apply_profile(enriched_dataset)

    def get_profile_info(self) -> Dict[str, Dict[str, Any]]:
        """
        Get information about all profiles.

        Returns:
            Dictionary with profile information
        """
        return {
            'srogs': {
                'doc_type': self.profiles[0].doc_type,
                'template': self.profiles[0].template_name,
                'filename_suffix': self.profiles[0].filename_suffix,
                'first_set_only_flags': self.profiles[0].first_set_only_flags,
                'total_interrogatory_mappings': len(self.profiles[0].interrogatory_counts)
            },
            'pods': {
                'doc_type': self.profiles[1].doc_type,
                'template': self.profiles[1].template_name,
                'filename_suffix': self.profiles[1].filename_suffix,
                'first_set_only_flags': self.profiles[1].first_set_only_flags,
                'total_interrogatory_mappings': len(self.profiles[1].interrogatory_counts)
            },
            'admissions': {
                'doc_type': self.profiles[2].doc_type,
                'template': self.profiles[2].template_name,
                'filename_suffix': self.profiles[2].filename_suffix,
                'first_set_only_flags': self.profiles[2].first_set_only_flags,
                'total_interrogatory_mappings': len(self.profiles[2].interrogatory_counts)
            }
        }

    def validate_profile_datasets(self, profiled_datasets: dict) -> Dict[str, List[str]]:
        """
        Validate that profile datasets have required fields.

        Args:
            profiled_datasets: Dictionary with three profile datasets

        Returns:
            Dictionary with validation results for each profile
        """
        required_fields = [
            'dataset_id', 'doc_type', 'template', 'filename_suffix',
            'flags', 'interrogatory_counts', 'first_set_only_flags'
        ]

        validation_results = {}

        for profile_name, dataset in profiled_datasets.items():
            missing_fields = []
            for field in required_fields:
                if field not in dataset:
                    missing_fields.append(field)

            validation_results[profile_name] = missing_fields

        return validation_results
