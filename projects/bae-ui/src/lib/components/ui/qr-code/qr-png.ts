import { create, toDataURL } from 'qrcode';

const MARGIN = 2;
const MIN_SIZE = 1024;

/**
 * Rend le jeton en PNG d'au moins `MIN_SIZE` pixels de côté et le fait
 * enregistrer par le navigateur. Pendant de `QrCode`, qui reste en SVG à
 * l'écran : ici la cible est un fichier, à imprimer ou à envoyer.
 *
 * L'échelle est un entier déduit du nombre de modules. Passer `width` à
 * `qrcode` donnerait une échelle fractionnaire, et les modules d'un QR de
 * version élevée s'en trouveraient inégaux d'un pixel — illisible à la douchette
 * une fois imprimé.
 */
export async function downloadQrPng(value: string, filename: string): Promise<void> {
  const modules = create(value).modules.size;
  const scale = Math.max(1, Math.ceil(MIN_SIZE / (modules + MARGIN * 2)));
  const dataUrl = await toDataURL(value, { margin: MARGIN, scale });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
