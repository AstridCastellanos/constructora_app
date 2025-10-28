// Solo letras (incluye acentos y espacios)
export const onlyLetters = (value) => /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(value);

// Solo números
export const onlyNumbers = (value) => /^[0-9]+$/.test(value);

// Letras y números
export const lettersAndNumbers = (value) => /^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s]+$/.test(value);

// Letras, números y signos básicos permitidos (.,-_)
export const lettersNumbersAndSigns = (value) =>
  /^[A-Za-z0-9!@#$%^&*.,_\-]+$/.test(value);

// Solo letras sin acento y guion medio (sin espacios)
export const onlyLettersAndUnderscore = (value) => /^[A-Za-z_]+$/.test(value);

// Solo letras (con acentos), números y guiones medios
export const lettersNumbersAndHyphen = (value) =>
  /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9-\s]+$/.test(value); 

// Solo letras, números y espacios (para nombre del proyecto)
export const onlyLettersNumbersSpaces = (value) => {
  return /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 ]*$/.test(value);
};

// Evitar caracteres peligrosos en texto libre (como ;, ', --, <, >)
export const sanitizeText = (value) => {
  return value.replace(/['";<>]/g, "");
};

// Solo números positivos con opcional decimal
export const onlyPositiveNumbers = (value) => {
  return /^[0-9]*[.]?[0-9]*$/.test(value);
};
