import "server-only";
import { alleControles } from "./controles";
import { haalDiensten, haalGoedgekeurdVerlof, haalZorgverleners } from "./data";
import { eersteDag, laatsteDag, plusDagen } from "./datum";

export async function haalControles(maand: string) {
  const van = plusDagen(eersteDag(maand), -1);
  const tot = plusDagen(laatsteDag(maand), 1);
  const [diensten, verlof, zorgverleners] = await Promise.all([
    haalDiensten(van, tot),
    haalGoedgekeurdVerlof(van, tot),
    haalZorgverleners(),
  ]);
  return alleControles({ maand, diensten, verlof, zorgverleners });
}
