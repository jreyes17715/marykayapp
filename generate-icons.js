const fs = require("fs");
const sharp = require("sharp");

async function generateIcons() {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#D11E51" rx="200"/>
    <text x="512" y="460" font-family="Arial" font-size="400" font-weight="bold" fill="white" text-anchor="middle">AR</text>
    <text x="512" y="660" font-family="Arial" font-size="100" fill="white" text-anchor="middle">AROMA DEL ROSAL</text>
  </svg>`;

  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778">
    <rect width="1284" height="2778" fill="#D11E51"/>
    <text x="642" y="1050" font-family="Arial" font-size="120" font-weight="bold" fill="white" text-anchor="middle">AROMA</text>
    <text x="642" y="1220" font-family="Arial" font-size="120" font-weight="bold" fill="white" text-anchor="middle">DEL ROSAL</text>
    <text x="642" y="1420" font-family="Arial" font-size="50" fill="white" text-anchor="middle" opacity="0.8">Mary Kay</text>
  </svg>`;

  await sharp(Buffer.from(icon)).png().toFile("assets/icon.png");
  console.log("icon.png creado");

  await sharp(Buffer.from(icon)).png().toFile("assets/adaptive-icon.png");
  console.log("adaptive-icon.png creado");

  await sharp(Buffer.from(splash)).png().toFile("assets/splash.png");
  console.log("splash.png creado");

  console.log("Listo!");
}

generateIcons();
