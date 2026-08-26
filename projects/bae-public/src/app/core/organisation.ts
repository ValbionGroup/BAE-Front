export const ORGANISATION = {
  name: "Bureau des Alternants de l'ENSEIRB-MATMECA",
  registeredName: "BUREAU DES ALTERNANTS DE L'ENSEIRB-MATMECA",
  acronym: 'BAE',
  legalForm: 'Association déclarée régie par la loi du 1er juillet 1901',
  rna: 'W332002284',
  siren: '911 557 783',
  siret: '911 557 783 00014',
  apeCode: '94.99Z',
  apeLabel: 'Autres organisations fonctionnant par adhésion volontaire',
  street: '1 avenue du Docteur Albert Schweitzer',
  streetComplement: 'ENSEIRB-MATMECA',
  postalCode: '33400',
  city: 'Talence',
  declaredOn: '12 août 2003',
  publisher: 'Pierre-Emmanuel Legoueix',
  email: 'bae.enseirb@gmail.com',
} as const;

export const HOSTING_PROVIDER = {
  name: 'Dyjix',
  legalName: 'Dyjix SAS',
  legalForm: 'société par actions simplifiée',
  siren: '909 519 191',
  siret: '909 519 191 00011',
  rcs: 'Paris',
  vat: 'FR62909519191',
  address: '149 avenue du Maine, 75014 Paris',
  phone: '+33 1 89 16 28 08',
  site: 'dyjix.eu',
  dataCentres: 'Paris, Tours et Marseille',
} as const;

export const IDENTITY_PROVIDER = {
  name: 'EirbWare',
  service: 'EirbConnect',
  legalForm: 'association déclarée régie par la loi du 1er juillet 1901',
  rna: 'W332007985',
  address: 'ENSEIRB-MATMECA, 1 rue du Docteur Albert Schweitzer, 33400 Talence',
} as const;

export const PAYMENT_PROVIDER = {
  name: 'Lydia',
  legalName: 'Lydia Solutions',
} as const;

export const SITE = {
  domain: 'bae.valbion.com',
  url: 'https://bae.valbion.com',
  codeLicense: 'PolyForm Noncommercial 1.0.0',
} as const;

export const LEGAL_UPDATED_AT = '26 août 2026';
export const ORGANISATION_FULL_ADDRESS = `${ORGANISATION.streetComplement}, ${ORGANISATION.street}, ${ORGANISATION.postalCode} ${ORGANISATION.city}`;
