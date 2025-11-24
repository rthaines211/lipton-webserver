/**
 * IssueCategorySection Component
 *
 * Complete issue category section with master checkbox, option checkboxes,
 * and optional metadata fields (details, dates, photos, etc.).
 *
 * This component provides identical UI for both intake and doc gen forms,
 * ensuring visual consistency and reducing maintenance burden.
 *
 * Features:
 * - Master checkbox (has issue toggle)
 * - Expandable/collapsible section
 * - Issue option checkboxes grid
 * - Optional intake-specific metadata fields
 * - Consistent styling across systems
 *
 * @module shared/components/IssueCategorySection
 */

import React, { useState } from 'react';
import { IssueCategory } from '../config/issue-categories-config';
import { IssueCheckboxGroup } from './IssueCheckboxGroup';

export interface IssueCategoryMetadata {
    /** Additional details about this issue */
    details?: string;

    /** When issue was first noticed */
    firstNoticed?: string;

    /** Repair history */
    repairHistory?: string;

    /** Photo uploads (intake-specific) */
    photos?: any[];

    /** Severity level (intake-specific) */
    severity?: 'mild' | 'moderate' | 'severe';
}

export interface IssueCategorySectionProps {
    /** Category configuration from database */
    category: IssueCategory;

    /** Whether this category has issues */
    hasIssue: boolean;

    /** Callback when master checkbox is toggled */
    onToggle: (hasIssue: boolean) => void;

    /** Array of selected option IDs */
    selectedOptions: string[];

    /** Callback when an option checkbox changes */
    onOptionChange: (optionId: string, checked: boolean) => void;

    /** Optional: Show intake-specific metadata fields */
    showIntakeExtras?: boolean;

    /** Optional: Metadata values */
    metadata?: IssueCategoryMetadata;

    /** Optional: Callback when metadata changes */
    onMetadataChange?: (field: keyof IssueCategoryMetadata, value: any) => void;

    /** Optional: Default expanded state */
    defaultExpanded?: boolean;

    /** Optional: Disable all inputs */
    disabled?: boolean;

    /** Optional: Additional CSS classes */
    className?: string;
}

/**
 * Renders a complete issue category section
 */
export function IssueCategorySection({
    category,
    hasIssue,
    onToggle,
    selectedOptions,
    onOptionChange,
    showIntakeExtras = false,
    metadata = {},
    onMetadataChange,
    defaultExpanded = false,
    disabled = false,
    className = ''
}: IssueCategorySectionProps) {

    // Expand when hasIssue is true or defaultExpanded is true
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || hasIssue);

    // Expand when master checkbox is checked
    React.useEffect(() => {
        if (hasIssue && !isExpanded) {
            setIsExpanded(true);
        }
    }, [hasIssue]);

    const handleMasterCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        onToggle(checked);

        // If unchecking, collapse the section
        if (!checked) {
            setIsExpanded(false);
        }
    };

    const handleToggleExpand = () => {
        if (hasIssue) {
            setIsExpanded(!isExpanded);
        }
    };

    const handleMetadataChange = (field: keyof IssueCategoryMetadata) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        if (onMetadataChange) {
            onMetadataChange(field, e.target.value);
        }
    };

    return (
        <div
            className={`issue-category-section ${hasIssue ? 'has-issue' : ''} ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}
            data-category={category.code}
        >
            {/* Master Checkbox Header */}
            <div className="category-header">
                <label className="master-checkbox-label">
                    <input
                        type="checkbox"
                        checked={hasIssue}
                        onChange={handleMasterCheckboxChange}
                        disabled={disabled}
                        className="master-checkbox"
                        data-category={category.code}
                    />
                    <span className="category-title">{category.name}</span>
                    {hasIssue && selectedOptions.length > 0 && (
                        <span className="selection-count">
                            ({selectedOptions.length} selected)
                        </span>
                    )}
                </label>

                {hasIssue && (
                    <button
                        type="button"
                        onClick={handleToggleExpand}
                        className="expand-toggle"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        aria-expanded={isExpanded}
                    >
                        <svg
                            className={`expand-icon ${isExpanded ? 'rotated' : ''}`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Expandable Content */}
            {hasIssue && isExpanded && (
                <div className="category-content">
                    {/* Issue Options Checkboxes */}
                    <div className="options-section">
                        <IssueCheckboxGroup
                            categoryCode={category.code}
                            options={category.options}
                            selectedOptions={selectedOptions}
                            onOptionChange={onOptionChange}
                            disabled={disabled}
                        />
                    </div>

                    {/* Intake-Specific Metadata Fields */}
                    {showIntakeExtras && (
                        <div className="metadata-section">
                            {/* Details Textarea */}
                            <div className="form-field">
                                <label htmlFor={`${category.code}-details`} className="field-label">
                                    Additional Details
                                </label>
                                <textarea
                                    id={`${category.code}-details`}
                                    name={`${category.code}-details`}
                                    value={metadata.details || ''}
                                    onChange={handleMetadataChange('details')}
                                    disabled={disabled}
                                    rows={3}
                                    className="field-input"
                                    placeholder="Describe the issue in detail..."
                                />
                            </div>

                            {/* Date Fields */}
                            <div className="date-fields">
                                <div className="form-field">
                                    <label htmlFor={`${category.code}-firstNoticed`} className="field-label">
                                        First Noticed
                                    </label>
                                    <input
                                        type="date"
                                        id={`${category.code}-firstNoticed`}
                                        name={`${category.code}-firstNoticed`}
                                        value={metadata.firstNoticed || ''}
                                        onChange={handleMetadataChange('firstNoticed')}
                                        disabled={disabled}
                                        className="field-input"
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor={`${category.code}-severity`} className="field-label">
                                        Severity
                                    </label>
                                    <select
                                        id={`${category.code}-severity`}
                                        name={`${category.code}-severity`}
                                        value={metadata.severity || ''}
                                        onChange={handleMetadataChange('severity')}
                                        disabled={disabled}
                                        className="field-input"
                                    >
                                        <option value="">Select severity...</option>
                                        <option value="mild">Mild</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="severe">Severe</option>
                                    </select>
                                </div>
                            </div>

                            {/* Repair History */}
                            <div className="form-field">
                                <label htmlFor={`${category.code}-repairHistory`} className="field-label">
                                    Repair History
                                </label>
                                <textarea
                                    id={`${category.code}-repairHistory`}
                                    name={`${category.code}-repairHistory`}
                                    value={metadata.repairHistory || ''}
                                    onChange={handleMetadataChange('repairHistory')}
                                    disabled={disabled}
                                    rows={2}
                                    className="field-input"
                                    placeholder="Has the landlord attempted repairs?"
                                />
                            </div>

                            {/* Photo Upload Placeholder */}
                            {metadata.photos && metadata.photos.length > 0 && (
                                <div className="photos-section">
                                    <p className="field-label">Uploaded Photos</p>
                                    <div className="photo-count">
                                        {metadata.photos.length} photo{metadata.photos.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .issue-category-section {
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    background-color: white;
                    margin-bottom: 1rem;
                    transition: all 0.2s ease;
                }

                .issue-category-section.has-issue {
                    border-color: #3b82f6;
                    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
                }

                .category-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    cursor: pointer;
                }

                .master-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex: 1;
                    cursor: pointer;
                }

                .master-checkbox {
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .category-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #111827;
                }

                .selection-count {
                    font-size: 0.875rem;
                    color: #3b82f6;
                    font-weight: 500;
                }

                .expand-toggle {
                    padding: 0.25rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                    transition: color 0.2s ease;
                }

                .expand-toggle:hover {
                    color: #3b82f6;
                }

                .expand-icon {
                    transition: transform 0.2s ease;
                }

                .expand-icon.rotated {
                    transform: rotate(180deg);
                }

                .category-content {
                    padding: 0 1rem 1rem 1rem;
                    border-top: 1px solid #e5e7eb;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                    }
                    to {
                        opacity: 1;
                        max-height: 2000px;
                    }
                }

                .options-section {
                    padding-top: 1rem;
                }

                .metadata-section {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                }

                .form-field {
                    margin-bottom: 1rem;
                }

                .field-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 0.5rem;
                }

                .field-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    transition: border-color 0.2s ease;
                }

                .field-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .field-input:disabled {
                    background-color: #f9fafb;
                    cursor: not-allowed;
                }

                .date-fields {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                @media (max-width: 640px) {
                    .date-fields {
                        grid-template-columns: 1fr;
                    }
                }

                .photos-section {
                    padding: 0.75rem;
                    background-color: #f9fafb;
                    border-radius: 0.375rem;
                    border: 1px solid #e5e7eb;
                }

                .photo-count {
                    font-size: 0.875rem;
                    color: #6b7280;
                }
            `}</style>
        </div>
    );
}

export default IssueCategorySection;
