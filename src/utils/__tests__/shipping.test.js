import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '../shipping';

describe('calculateShipping', () => {
  describe('province-based rates', () => {
    it('returns RD$350 for Santo Domingo', () => {
      const result = calculateShipping('Santo Domingo', 1000);
      expect(result.cost).toBe(350);
      expect(result.isFree).toBe(false);
    });

    it('returns RD$350 for Distrito Nacional', () => {
      const result = calculateShipping('Distrito Nacional', 1000);
      expect(result.cost).toBe(350);
      expect(result.isFree).toBe(false);
    });

    it('returns RD$450 for Santiago', () => {
      const result = calculateShipping('Santiago', 1000);
      expect(result.cost).toBe(450);
      expect(result.isFree).toBe(false);
    });

    it('returns RD$550 for any other province', () => {
      const result = calculateShipping('La Vega', 1000);
      expect(result.cost).toBe(550);
      expect(result.isFree).toBe(false);
    });
  });

  describe('free shipping threshold', () => {
    it('is free when cart total is exactly 60,000', () => {
      const result = calculateShipping('Santiago', FREE_SHIPPING_THRESHOLD);
      expect(result.cost).toBe(0);
      expect(result.isFree).toBe(true);
      expect(result.label).toBe('Gratis');
    });

    it('is free when cart total exceeds 60,000', () => {
      const result = calculateShipping('La Vega', 70000);
      expect(result.cost).toBe(0);
      expect(result.isFree).toBe(true);
    });

    it('is not free when cart total is just below 60,000', () => {
      const result = calculateShipping('Santiago', 59999);
      expect(result.isFree).toBe(false);
      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('no province selected', () => {
    it('returns Por calcular label when province is null', () => {
      const result = calculateShipping(null, 1000);
      expect(result.label).toBe('Por calcular');
      expect(result.isFree).toBe(false);
      expect(result.cost).toBe(0);
    });

    it('returns Por calcular label when province is an empty string', () => {
      const result = calculateShipping('', 1000);
      expect(result.label).toBe('Por calcular');
    });

    it('returns Por calcular label when province is whitespace', () => {
      const result = calculateShipping('   ', 1000);
      expect(result.label).toBe('Por calcular');
    });
  });

  describe('hasFreeShipping flag', () => {
    it('returns free shipping regardless of cart total when hasFreeShipping is true', () => {
      const result = calculateShipping('Santiago', 1000, true);
      expect(result.cost).toBe(0);
      expect(result.isFree).toBe(true);
      expect(result.label).toBe('Gratis (promocion)');
    });

    it('returns free shipping even for a low total with hasFreeShipping=true', () => {
      const result = calculateShipping('La Vega', 0, true);
      expect(result.cost).toBe(0);
      expect(result.isFree).toBe(true);
    });
  });
});
