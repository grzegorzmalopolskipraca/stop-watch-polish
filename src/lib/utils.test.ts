import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class active-class');
    });

    it('should handle false conditional classes', () => {
      const isActive = false;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class');
    });

    it('should merge Tailwind conflicting classes correctly', () => {
      // twMerge should keep only the last padding class
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toBe('class1 class3');
    });

    it('should handle duplicate classes', () => {
      // clsx doesn't remove duplicates, just passes them through
      const result = cn('class1', 'class2', 'class1');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle empty string', () => {
      const result = cn('', 'class1');
      expect(result).toBe('class1');
    });

    it('should merge complex Tailwind utilities', () => {
      const result = cn('bg-red-500 hover:bg-blue-500', 'bg-green-500');
      // Later bg-green-500 should override bg-red-500
      expect(result).toContain('bg-green-500');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).not.toContain('bg-red-500');
    });
  });
});
