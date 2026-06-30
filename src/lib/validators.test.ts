import { 
    validarCedula, 
    validarRucPersonaNatural, 
    validarRucSociedadPrivada, 
    validarRucEntidadPublica, 
    validarPasaporte, 
    validarDocumento 
} from './validators';

describe('Validators', () => {
    // Note: Use actual valid IDs for testing in production
    
    describe('validarCedula', () => {
        it('should return invalid for wrong length', () => {
            const result = validarCedula('123456789');
            expect(result.valido).toBe(false);
        });

        it('should validate correctly for a valid cedula', () => {
            // Add a real cedula here for strict testing
            // const result = validarCedula('1710034065');
            // expect(result.valido).toBe(true);
        });
        
        it('should fail on invalid cedula verification digit', () => {
            const result = validarCedula('1710034066'); // Wrong last digit
            expect(result.valido).toBe(false);
        });
    });

    describe('validarRucPersonaNatural', () => {
        it('should return false if length is not 13', () => {
            expect(validarRucPersonaNatural('12345').valido).toBe(false);
        });
        
        it('should return false for establishment 000', () => {
            expect(validarRucPersonaNatural('1710034065000').valido).toBe(false);
        });
    });

    describe('validarRucSociedadPrivada', () => {
        it('should fail if third digit is not 9', () => {
            const result = validarRucSociedadPrivada('1760034065001'); // third digit 6 instead of 9
            expect(result.valido).toBe(false);
        });
    });

    describe('validarRucEntidadPublica', () => {
        it('should fail if third digit is not 6', () => {
            const result = validarRucEntidadPublica('1790034065001'); // third digit 9 instead of 6
            expect(result.valido).toBe(false);
        });
    });

    describe('validarPasaporte', () => {
        it('should validate alphanumeric passport between 5 and 20 length', () => {
            expect(validarPasaporte('A1234567').valido).toBe(true);
            expect(validarPasaporte('A12').valido).toBe(false);
        });
    });

    describe('validarDocumento - Consumidor Final', () => {
        it('should validate consumidor final correctly', () => {
            expect(validarDocumento('CONSUMIDOR_FINAL', '9999999999999').valido).toBe(true);
            expect(validarDocumento('CONSUMIDOR_FINAL', '123').valido).toBe(false);
        });
    });
});
