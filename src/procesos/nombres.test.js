import { describe, it, expect } from 'vitest';
import { sugerirNombreDestino } from './nombres';

describe('nombre sugerido para el destino', () => {
  it('incrementa el número del origen conservando lo que lo rodea', () => {
    expect(sugerirNombreDestino(['1'], ['1'])).toBe('2');
    expect(sugerirNombreDestino(['3a'], ['3a'])).toBe('4a');
    expect(sugerirNombreDestino(['Fluido 1'], ['Fluido 1'])).toBe('Fluido 2');
  });

  it('salta los nombres ya usados', () => {
    expect(sugerirNombreDestino(['1'], ['1', '2', '3'])).toBe('4');
  });

  it('en la mezcla sigue al mayor de los orígenes', () => {
    expect(sugerirNombreDestino(['1', '3'], ['1', '3'])).toBe('4');
  });

  it('sin número, marca el origen con una prima libre', () => {
    expect(sugerirNombreDestino(['A'], ['A'])).toBe("A'");
    expect(sugerirNombreDestino(['A'], ['A', "A'"])).toBe("A''");
  });

  it('sin orígenes no sugiere nada', () => {
    expect(sugerirNombreDestino([undefined], [])).toBeNull();
  });
});
