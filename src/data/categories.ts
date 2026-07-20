import melImg from "../assets/category-mel.jpg";
import bebidasImg from "../assets/category-bebidas.jpg";
import cogumelosImg from "../assets/category-cogumelos.jpg";
import conservasImg from "../assets/category-conservas.jpg";
import ervasImg from "../assets/category-ervas.jpg";
import leguminosasImg from "../assets/category-leguminosas.jpg";

import { categoryList, type CategoryBase } from "./category-list";

export interface Category extends CategoryBase {
  image: string;
}

const imagesBySlug: Record<string, string> = {
  bebidas: bebidasImg,
  cogumelos: cogumelosImg,
  conservas: conservasImg,
  "ervas-aromaticas": ervasImg,
  leguminosas: leguminosasImg,
  mel: melImg,
};

const defaultImagesBySlug: Record<string, string> = {
  carne: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop",
  cereais: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop",
  charcutaria: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
  flores: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&h=400&fit=crop",
  fruta: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&h=400&fit=crop",
  "frutos-secos": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&h=400&fit=crop",
  gorduras: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&h=400&fit=crop",
  halofitas: "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=600&h=400&fit=crop",
  horticolas: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop",
  laticinios: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&h=400&fit=crop",
  "oleos-essenciais": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=400&fit=crop",
  "outros-produtos": "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&h=400&fit=crop",
  ovos: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&h=400&fit=crop",
  "pao-artesanal": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop",
  salgados: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&h=400&fit=crop",
  "temperos-e-especiarias": "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&h=400&fit=crop",
};

export const categories: Category[] = categoryList.map((c) => ({
  ...c,
  image: imagesBySlug[c.slug] ?? defaultImagesBySlug[c.slug] ?? "",
}));

export const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);

export const getCategoryByName = (name: string) =>
  categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
