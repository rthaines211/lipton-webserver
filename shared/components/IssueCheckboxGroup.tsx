/**
 * IssueCheckboxGroup Component
 *
 * Reusable component for rendering a grid of checkboxes for a specific issue category.
 * Used by both client intake forms and doc gen forms to ensure visual consistency.
 *
 * Features:
 * - Compact grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
 * - Individual checkbox selection
 * - Consistent styling across both systems
 * - Type-safe with generated config
 *
 * @module shared/components/IssueCheckboxGroup
 */

import React from 'react';
import { IssueOption } from '../config/issue-categories-config';

export interface IssueCheckboxGroupProps {
    /** Category code (e.g., 'vermin', 'insects') */
    categoryCode: string;

    /** Array of available options for this category */
    options: IssueOption[];

    /** Array of selected option IDs */
    selectedOptions: string[];

    /** Callback when an option is checked/unchecked */
    onOptionChange: (optionId: string, checked: boolean) => void;

    /** Optional: Additional CSS classes */
    className?: string;

    /** Optional: Disable all checkboxes */
    disabled?: boolean;

    /** Optional: Show option codes for debugging */
    showCodes?: boolean;
}

/**
 * Renders a grid of checkboxes for issue options
 */
export function IssueCheckboxGroup({
    categoryCode,
    options,
    selectedOptions,
    onOptionChange,
    className = '',
    disabled = false,
    showCodes = false
}: IssueCheckboxGroupProps) {

    const handleCheckboxChange = (optionId: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        onOptionChange(optionId, e.target.checked);
    };

    return (
        <div
            className={`issue-checkbox-group ${className}`}
            data-category={categoryCode}
        >
            <div className="checkbox-grid">
                {options.map((option) => {
                    const isChecked = selectedOptions.includes(option.id);
                    const checkboxId = `${categoryCode}-${option.code}`;

                    return (
                        <label
                            key={option.id}
                            htmlFor={checkboxId}
                            className={`checkbox-label ${isChecked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                        >
                            <input
                                type="checkbox"
                                id={checkboxId}
                                name={checkboxId}
                                value={option.id}
                                checked={isChecked}
                                onChange={handleCheckboxChange(option.id)}
                                disabled={disabled}
                                className="checkbox-input"
                                data-option-code={option.code}
                            />
                            <span className="checkbox-text">
                                {option.name}
                                {showCodes && (
                                    <span className="option-code">
                                        {' '}({option.code})
                                    </span>
                                )}
                            </span>
                        </label>
                    );
                })}
            </div>

            <style jsx>{`
                .issue-checkbox-group {
                    width: 100%;
                }

                .checkbox-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                /* Tablet: 2 columns */
                @media (max-width: 1024px) {
                    .checkbox-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                /* Mobile: 1 column */
                @media (max-width: 640px) {
                    .checkbox-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .checkbox-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background-color: white;
                }

                .checkbox-label:hover:not(.disabled) {
                    background-color: #f9fafb;
                    border-color: #d1d5db;
                }

                .checkbox-label.checked {
                    background-color: #eff6ff;
                    border-color: #3b82f6;
                }

                .checkbox-label.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .checkbox-input {
                    margin-top: 0.125rem;
                    width: 1rem;
                    height: 1rem;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .checkbox-input:disabled {
                    cursor: not-allowed;
                }

                .checkbox-text {
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    color: #374151;
                    flex: 1;
                }

                .checkbox-label.checked .checkbox-text {
                    color: #1e40af;
                    font-weight: 500;
                }

                .option-code {
                    font-size: 0.75rem;
                    color: #9ca3af;
                    font-family: monospace;
                }
            `}</style>
        </div>
    );
}

export default IssueCheckboxGroup;
