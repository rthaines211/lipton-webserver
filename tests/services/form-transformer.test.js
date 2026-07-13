const { transformFormData, revertToOriginalFormat } = require('../../services/form-transformer');

describe('form-transformer case number & filing date', () => {
  test('transformFormData maps case-number and filing-date', () => {
    const out = transformFormData({ 'case-number': 'BC123456', 'filing-date': '2026-01-15' });
    expect(out.CaseNumber).toBe('BC123456');
    expect(out.FilingDate).toBe('2026-01-15');
  });

  test('transformFormData defaults missing case fields to null', () => {
    const out = transformFormData({});
    expect(out.CaseNumber).toBeNull();
    expect(out.FilingDate).toBeNull();
  });

  test('revertToOriginalFormat maps CaseNumber/FilingDate to human-readable keys', () => {
    const out = revertToOriginalFormat({ CaseNumber: 'BC123456', FilingDate: '2026-01-15' });
    expect(out['Case number']).toBe('BC123456');
    expect(out['Filing date']).toBe('2026-01-15');
  });
});
