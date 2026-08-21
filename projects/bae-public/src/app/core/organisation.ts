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
  email: 'bureau.alternants@enseirb-matmeca.fr',
} as const;

export const HOSTING_PROVIDER = {
  name: 'EirbWare',
  legalForm: 'association déclarée régie par la loi du 1er juillet 1901',
  rna: 'W332007985',
  address: 'ENSEIRB-MATMECA, 1 rue du Docteur Albert Schweitzer, 33400 Talence',
} as const;

export const PAYMENT_PROVIDER = {
  name: 'Lydia',
  legalName: 'Lydia Solutions',
} as const;

export const SITE = {
  domain: 'order.bae.eirb.fr',
  url: 'https://order.bae.eirb.fr',
  codeLicense: 'PolyForm Noncommercial 1.0.0',
} as const;

export const LEGAL_UPDATED_AT = '21 août 2026';
export const ORGANISATION_FULL_ADDRESS = `${ORGANISATION.streetComplement}, ${ORGANISATION.street}, ${ORGANISATION.postalCode} ${ORGANISATION.city}`;
