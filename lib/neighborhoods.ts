export type Arrondissement = {
  id: number;
  name: string;
  neighborhoods: string[];
};

export const ARRONDISSEMENTS: Arrondissement[] = [
  {
    id: 1,
    name: 'Arrondissement 1',
    neighborhoods: [
      'Bilbalogo',
      'Saint Léon',
      'Zangouettin',
      'Tiedpalogo',
      'Koulouba',
      'Kamsonghin',
      'Samandin',
      'Gounghin Sud',
      'Gandin',
      'Kouritenga',
      'Mankougoudou',
    ],
  },
  {
    id: 2,
    name: 'Arrondissement 2',
    neighborhoods: [
      'Paspanga',
      'Ouidi',
      'Larlé',
      'Kologh Naba',
      'Dapoya 2',
      'Nemnin',
      'Niogsin',
      'Hamdalaye',
      'Gounghin Nord',
      'Baoghin',
    ],
  },
  {
    id: 3,
    name: 'Arrondissement 3',
    neighborhoods: [
      'Camp militaire',
      'Naababpougo',
      'Kienbaoghin',
      'Zongo',
      'Koumdayonré',
      'Nonsin',
      'Rimkièta',
      'Tampouy',
      'Kilwin',
    ],
  },
  {
    id: 4,
    name: 'Arrondissement 4',
    neighborhoods: [
      'Tanghin',
      'Sambin barrage',
      'Somgandé',
      'Zone industrielle',
      'Nioko 2',
      'Bendogo',
      'Toukin',
    ],
  },
  {
    id: 5,
    name: 'Arrondissement 5',
    neighborhoods: [
      'Zogona',
      'Wemtenga',
      'Dagnoën',
      'Ronsin',
      'Kalgondin',
    ],
  },
  {
    id: 6,
    name: 'Arrondissement 6',
    neighborhoods: [
      'Cissin',
      'Kouritenga',
      'Pissy',
    ],
  },
  {
    id: 7,
    name: 'Arrondissement 7',
    neighborhoods: [
      'Nagrin',
      'Yaoghin',
      'Sandogo',
      'Kankasin',
      'Boassa',
    ],
  },
  {
    id: 8,
    name: 'Arrondissement 8',
    neighborhoods: [
      'Zaghtouli',
      'Zongo Nabitenga',
      'Sogpèlcé',
      'Bissighin',
      'Bassinko',
      'Dar-es-Salam',
      'Silmiougou',
      'Gantin',
    ],
  },
  {
    id: 9,
    name: 'Arrondissement 9',
    neighborhoods: [
      'Bangpooré',
      'Larlé Wéogo',
      'Marcoussis',
      'Silmiyiri',
      'Wob Riguéré',
      'Ouapassi',
    ],
  },
  {
    id: 10,
    name: 'Arrondissement 10',
    neighborhoods: [
      'Kossodo',
      'Wayalghin',
      'Godin',
      'Nioko 1',
      'Dassosgho',
      'Taabtenga',
    ],
  },
  {
    id: 11,
    name: 'Arrondissement 11',
    neighborhoods: [
      'Dassasgo',
      'Yemtenga',
      'Karpala',
      'Balkuy',
      'Lanoayiri',
      'Dayongo',
      'Ouidtenga',
    ],
  },
  {
    id: 12,
    name: 'Arrondissement 12',
    neighborhoods: [
      "Patte d'oie",
      'Ouaga 2000',
      "Trame d'accueil de Ouaga 2000",
    ],
  },
];

export const ALL_NEIGHBORHOODS = ARRONDISSEMENTS.flatMap(arr =>
  arr.neighborhoods
).sort();
