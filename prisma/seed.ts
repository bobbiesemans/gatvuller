import { PrismaClient, Category, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function atHour(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const salonsSeed: {
  name: string;
  city: string;
  category: Category;
  address: string;
  description: string;
  rating: number;
  lat: number;
  lng: number;
  slots: { title: string; day: number; hour: number; minute?: number; dur: number; orig: number; disc: number }[];
}[] = [
  {
    name: "Kapper Noorderlicht",
    city: "Antwerpen",
    category: "KAPPER",
    address: "Kloosterstraat 12, 2000 Antwerpen",
    description: "Moderne knipbeurten & baard in het centrum van Antwerpen.",
    rating: 4.8,
    lat: 51.21655,
    lng: 4.39648,
    slots: [
      { title: "Damesknipbeurt", day: 0, hour: 17, dur: 45, orig: 4500, disc: 2900 },
      { title: "Herenknip + baard", day: 0, hour: 18, dur: 40, orig: 4000, disc: 2500 },
      { title: "Wash & blowdry", day: 1, hour: 11, dur: 30, orig: 3500, disc: 2200 },
    ],
  },
  {
    name: "AutoCare Antwerpen",
    city: "Antwerpen",
    category: "AUTODIENST",
    address: "Noorderlaan 200, 2030 Antwerpen",
    description: "Snelle onderhoudsbeurten zonder wachtrij.",
    rating: 4.4,
    lat: 51.26312,
    lng: 4.41085,
    slots: [
      { title: "Olie + filter", day: 1, hour: 8, dur: 60, orig: 12000, disc: 8900 },
      { title: "Bandenwissel", day: 0, hour: 15, dur: 45, orig: 8000, disc: 5500 },
    ],
  },
  {
    name: "Studio Haarlijn Zuid",
    city: "Antwerpen",
    category: "KAPPER",
    address: "Nationalestraat 88, 2000 Antwerpen",
    description: "Kleur & cuts in Antwerpen-Zuid.",
    rating: 4.7,
    lat: 51.2142,
    lng: 4.3989,
    slots: [
      { title: "Balayage touch-up", day: 0, hour: 16, minute: 30, dur: 90, orig: 11000, disc: 6900 },
      { title: "Kinderknip", day: 1, hour: 15, dur: 25, orig: 2500, disc: 1500 },
    ],
  },
  {
    name: "Fysio Scheldekaai",
    city: "Antwerpen",
    category: "FYSIO",
    address: "Ernest Van Dijckkaai 8, 2000 Antwerpen",
    description: "Sportfysio aan de Schelde.",
    rating: 4.6,
    lat: 51.2218,
    lng: 4.3972,
    slots: [
      { title: "Sportmassage 30'", day: 0, hour: 19, dur: 30, orig: 4500, disc: 2900 },
      { title: "Manuele therapie", day: 1, hour: 9, dur: 45, orig: 6500, disc: 4200 },
    ],
  },
  {
    name: "Nail Atelier Meir",
    city: "Antwerpen",
    category: "NAGELS",
    address: "Meir 48, 2000 Antwerpen",
    description: "Gel & nail art op de Meir.",
    rating: 4.9,
    lat: 51.2183,
    lng: 4.4056,
    slots: [
      { title: "Gel manicure", day: 0, hour: 17, minute: 30, dur: 50, orig: 4800, disc: 3100 },
      { title: "BIAB refill", day: 1, hour: 12, dur: 60, orig: 5500, disc: 3600 },
    ],
  },
  {
    name: "Smile Dental Brussel",
    city: "Brussel",
    category: "TANDARTS",
    address: "Wetstraat 88, 1000 Brussel",
    description: "Tandzorg met last-minute spoedcontroles.",
    rating: 4.6,
    lat: 50.84505,
    lng: 4.37215,
    slots: [
      { title: "Controle + poets", day: 0, hour: 16, dur: 30, orig: 7500, disc: 4900 },
      { title: "Spoedconsult", day: 1, hour: 9, dur: 20, orig: 6000, disc: 3900 },
    ],
  },
  {
    name: "Nail Bar Louise",
    city: "Brussel",
    category: "NAGELS",
    address: "Louizalaan 250, 1050 Brussel",
    description: "Manicure & gel in Etterbeek/Louise.",
    rating: 4.8,
    lat: 50.82655,
    lng: 4.36512,
    slots: [
      { title: "Gel manicure", day: 0, hour: 18, dur: 50, orig: 5000, disc: 3200 },
      { title: "Pedicure express", day: 1, hour: 13, dur: 40, orig: 4500, disc: 2800 },
    ],
  },
  {
    name: "Glow Studio Ixelles",
    city: "Brussel",
    category: "SCHOONHEID",
    address: "Chaussée d'Ixelles 180, 1050 Brussel",
    description: "Facials & brow bars in Elsene.",
    rating: 4.7,
    lat: 50.8338,
    lng: 4.3689,
    slots: [
      { title: "Express facial", day: 0, hour: 18, minute: 30, dur: 40, orig: 7000, disc: 4500 },
      { title: "Lash lift", day: 1, hour: 11, dur: 45, orig: 5500, disc: 3500 },
    ],
  },
  {
    name: "Barber Dansaert",
    city: "Brussel",
    category: "KAPPER",
    address: "Rue Antoine Dansaert 70, 1000 Brussel",
    description: "Classic cuts & hot towel shave.",
    rating: 4.5,
    lat: 50.8509,
    lng: 4.3442,
    slots: [
      { title: "Herenknip + fade", day: 0, hour: 17, dur: 35, orig: 3800, disc: 2400 },
      { title: "Hot towel shave", day: 1, hour: 10, dur: 30, orig: 3200, disc: 2000 },
    ],
  },
  {
    name: "Fysio Cinquantenaire",
    city: "Brussel",
    category: "FYSIO",
    address: "Avenue de Tervueren 12, 1040 Brussel",
    description: "Rehab & preventie nabij het Jubelpark.",
    rating: 4.6,
    lat: 50.8402,
    lng: 4.3915,
    slots: [
      { title: "Intake 45'", day: 0, hour: 16, dur: 45, orig: 7000, disc: 4800 },
      { title: "Follow-up", day: 1, hour: 14, dur: 30, orig: 5000, disc: 3400 },
    ],
  },
  {
    name: "Glow Beauty Gent",
    city: "Gent",
    category: "SCHOONHEID",
    address: "Veldstraat 45, 9000 Gent",
    description: "Gezichtsbehandelingen & brow styling.",
    rating: 4.9,
    lat: 51.05205,
    lng: 3.72215,
    slots: [
      { title: "Hydra facial", day: 0, hour: 19, dur: 50, orig: 8500, disc: 5500 },
      { title: "Brow lift", day: 1, hour: 14, dur: 40, orig: 4500, disc: 2900 },
    ],
  },
  {
    name: "Zen Massage Gent",
    city: "Gent",
    category: "MASSAGE",
    address: "Kraanlei 37, 9000 Gent",
    description: "Ontspannings- en deep tissue massage in Patershol.",
    rating: 4.8,
    lat: 51.05745,
    lng: 3.72355,
    slots: [
      { title: "Deep tissue 60'", day: 0, hour: 18, dur: 60, orig: 7500, disc: 4900 },
      { title: "Relax 45'", day: 1, hour: 16, dur: 45, orig: 6000, disc: 3900 },
    ],
  },
  {
    name: "Kapper Graslei",
    city: "Gent",
    category: "KAPPER",
    address: "Graslei 10, 9000 Gent",
    description: "Cuts met uitzicht op de Leie.",
    rating: 4.7,
    lat: 51.0547,
    lng: 3.7211,
    slots: [
      { title: "Damesknip + styling", day: 0, hour: 17, minute: 15, dur: 50, orig: 5200, disc: 3300 },
      { title: "Baard trim", day: 1, hour: 12, dur: 20, orig: 2200, disc: 1400 },
    ],
  },
  {
    name: "Dental Centre Gent",
    city: "Gent",
    category: "TANDARTS",
    address: "Kouter 28, 9000 Gent",
    description: "Preventieve tandzorg & spoed.",
    rating: 4.5,
    lat: 51.0498,
    lng: 3.7248,
    slots: [
      { title: "Controle", day: 0, hour: 15, dur: 25, orig: 6500, disc: 4200 },
      { title: "Reiniging", day: 1, hour: 10, dur: 40, orig: 8000, disc: 5500 },
    ],
  },
  {
    name: "Fysio Jordaan",
    city: "Amsterdam",
    category: "FYSIO",
    address: "Rozengracht 120, 1016 LV Amsterdam",
    description: "Sportfysio & manuele therapie.",
    rating: 4.7,
    lat: 52.37385,
    lng: 4.88015,
    slots: [
      { title: "Intake + behandeling", day: 0, hour: 17, dur: 45, orig: 7000, disc: 4500 },
      { title: "Follow-up sessie", day: 1, hour: 10, dur: 30, orig: 5500, disc: 3500 },
    ],
  },
  {
    name: "Barber De Pijp",
    city: "Amsterdam",
    category: "KAPPER",
    address: "Albert Cuypstraat 88, 1072 CX Amsterdam",
    description: "Fades & classic cuts in De Pijp.",
    rating: 4.8,
    lat: 52.3559,
    lng: 4.8924,
    slots: [
      { title: "Fade + baard", day: 0, hour: 18, dur: 40, orig: 4200, disc: 2700 },
      { title: "Knipbeurt", day: 1, hour: 11, dur: 30, orig: 3500, disc: 2200 },
    ],
  },
  {
    name: "Spa Nine Streets",
    city: "Amsterdam",
    category: "MASSAGE",
    address: "Huidenstraat 12, 1016 DK Amsterdam",
    description: "Urban spa in de Negen Straatjes.",
    rating: 4.9,
    lat: 52.3692,
    lng: 4.8841,
    slots: [
      { title: "Hot stone 60'", day: 0, hour: 19, dur: 60, orig: 9500, disc: 6200 },
      { title: "Head & shoulders", day: 1, hour: 15, dur: 30, orig: 4500, disc: 2900 },
    ],
  },
  {
    name: "Beauty Studio Oost",
    city: "Amsterdam",
    category: "SCHOONHEID",
    address: "Javastraat 45, 1094 GZ Amsterdam",
    description: "Skin & brows in Amsterdam-Oost.",
    rating: 4.6,
    lat: 52.3635,
    lng: 4.9298,
    slots: [
      { title: "Hydrafacial", day: 0, hour: 16, dur: 50, orig: 8900, disc: 5900 },
      { title: "Brow shape", day: 1, hour: 13, dur: 25, orig: 3000, disc: 1900 },
    ],
  },
  {
    name: "AutoSpot West",
    city: "Amsterdam",
    category: "AUTODIENST",
    address: "Transformatorweg 50, 1014 AK Amsterdam",
    description: "Snelle APK & onderhoud in West.",
    rating: 4.3,
    lat: 52.3912,
    lng: 4.8505,
    slots: [
      { title: "APK keuring", day: 1, hour: 8, dur: 60, orig: 7500, disc: 5500 },
      { title: "Wintercheck", day: 0, hour: 14, dur: 45, orig: 6500, disc: 4200 },
    ],
  },
  {
    name: "Dental Canal Belt",
    city: "Amsterdam",
    category: "TANDARTS",
    address: "Prinsengracht 512, 1017 KH Amsterdam",
    description: "Tandarts aan de gracht.",
    rating: 4.7,
    lat: 52.3648,
    lng: 4.8862,
    slots: [
      { title: "Controle + foto", day: 0, hour: 15, minute: 30, dur: 30, orig: 8500, disc: 5500 },
      { title: "Spoed pijn", day: 1, hour: 9, dur: 20, orig: 7000, disc: 4500 },
    ],
  },
];

async function main() {
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.user.deleteMany();

  const pw = await hash("demo1234", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@gatvuller.be",
      name: "GatVuller Admin",
      role: Role.ADMIN,
      passwordHash: pw,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "klant@gatvuller.be",
      name: "Demo Klant",
      role: Role.CUSTOMER,
      passwordHash: pw,
      phone: "+32 470 00 00 00",
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: "salon@gatvuller.be",
      name: "Demo Salon Owner",
      role: Role.SALON_OWNER,
      passwordHash: pw,
    },
  });

  const owners = [owner];
  for (let i = 1; i < salonsSeed.length; i++) {
    const u = await prisma.user.create({
      data: {
        email: `salon${i}@gatvuller.be`,
        name: `${salonsSeed[i].name} Owner`,
        role: Role.SALON_OWNER,
        passwordHash: pw,
      },
    });
    owners.push(u);
  }

  let slotCount = 0;
  for (let i = 0; i < salonsSeed.length; i++) {
    const s = salonsSeed[i];
    const salon = await prisma.salon.create({
      data: {
        ownerId: owners[i].id,
        name: s.name,
        slug: slugify(s.name),
        city: s.city,
        category: s.category,
        description: s.description,
        address: s.address,
        rating: s.rating,
        lat: s.lat,
        lng: s.lng,
        phone: "+32 3 000 00 00",
      },
    });

    for (const sl of s.slots) {
      const startsAt = atHour(sl.day, sl.hour, sl.minute ?? 0);
      const endsAt = new Date(startsAt.getTime() + sl.dur * 60 * 1000);
      if (endsAt <= new Date()) {
        startsAt.setDate(startsAt.getDate() + 1);
        endsAt.setDate(endsAt.getDate() + 1);
      }
      await prisma.slot.create({
        data: {
          salonId: salon.id,
          title: sl.title,
          description: `Surprise slot bij ${s.name} — last-minute met korting.`,
          startsAt,
          endsAt,
          originalPrice: sl.orig,
          discountPrice: sl.disc,
          spotsLeft: 1,
          status: "OPEN",
        },
      });
      slotCount++;
    }
  }

  console.log({
    admin: admin.email,
    customer: customer.email,
    owner: owner.email,
    salons: salonsSeed.length,
    slots: slotCount,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
