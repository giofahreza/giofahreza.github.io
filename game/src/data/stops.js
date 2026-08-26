export function createStops() {
  return [
    {
      name: "Alun-Alun Situbondo",
      shortName: "Alun-Alun",
      kind: "alun",
      theta: 0,
      phi: 0,
      color: 0xd85f50,
      // Keep north/east aligned with the metric OSM footprint. Unlike the other
      // compact delivery icons, the square is drawn at its true 1:5 map scale.
      yaw: 0,
      scale: 1,
    },
    {
      name: "Gazebo Situbondo",
      shortName: "Gazebo",
      kind: "gazebo",
      // OSM building 2228: 15.4 m east and 70.5 m south of Alun-Alun.
      theta: 3.08,
      phi: 14.1,
      color: 0x8b4439,
      // Face the broad stair south toward Jalan Kartini and Pendopo Aryo.
      yaw: -Math.PI * 0.46,
      scale: 1,
    },
    {
      name: "Masjid Agung Al-Abror",
      shortName: "Al-Abror",
      kind: "mosque",
      theta: -23.71,
      phi: 4.13,
      color: 0x8aad45,
      // Match the OSM road segment immediately in front of Al-Abror. Local X
      // becomes the frontage line, so the yaw sign is opposite the road skew.
      yaw: 0.199,
      scale: 1,
    },
    {
      name: "Pendopo Kabupaten",
      shortName: "Pendopo",
      kind: "pendopo",
      // Google Maps entrance: -7.7076834, 114.0055893.
      // Google Maps frontage photo (February 2024) establishes the roof and sign.
      // The August 2022 Google 360 sphere CIHM0ogKEICAgIDu1p6LJw sits inside the
      // ceremonial gazebo south of the main facade, so its carved columns and
      // red-white canopy belong to that separate mapped landmark.
      theta: 4.1,
      phi: 20.8,
      color: 0x9f5146,
      yaw: Math.PI * 0.54,
      scale: 0.86,
    },
    {
      name: "Pasar Mimbaan",
      shortName: "Pasar Mimbaan",
      kind: "market",
      theta: 124.47,
      phi: -21.44,
      color: 0x3f8ea6,
      yaw: -Math.PI * 0.5,
      scale: 2.8,
    },
    {
      name: "Terminal Situbondo",
      shortName: "Terminal",
      kind: "station",
      theta: 151.72,
      phi: -3.12,
      color: 0x4e7d58,
      yaw: -Math.PI * 0.48,
      scale: 2.6,
    },
    {
      name: "Stadion Gelora Muhammad Saleh",
      shortName: "Stadion Gelora",
      kind: "stadium",
      theta: -181.26,
      phi: -82.2,
      color: 0x2f91a7,
      yaw: Math.PI * 0.45,
      scale: 3,
    },
  ];
}
