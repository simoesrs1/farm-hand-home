import { afterEach, describe, expect, it } from "vitest";
import { MUNICIPALITIES } from "@/data/municipios";
import {
  clearSearchLocation,
  findMunicipalities,
  getSearchLocation,
  setSearchLocation,
} from "@/lib/search-location";
import { directionsUrl } from "@/lib/geo";

describe("localização de pesquisa", () => {
  afterEach(() => clearSearchLocation());

  it("tem os 308 concelhos, todos em Portugal", () => {
    expect(MUNICIPALITIES).toHaveLength(308);
    for (const m of MUNICIPALITIES) {
      expect(m.lat).toBeGreaterThan(30);
      expect(m.lat).toBeLessThan(43);
      expect(m.lng).toBeGreaterThan(-32);
      expect(m.lng).toBeLessThan(-6);
    }
  });

  it("pesquisa concelhos sem acentos nem maiúsculas, primeiro os que começam pelo texto", () => {
    expect(findMunicipalities("fundao")[0].name).toBe("Fundão");
    expect(findMunicipalities("EVORA")[0].name).toBe("Évora");
    const vila = findMunicipalities("vila");
    expect(vila.length).toBeGreaterThan(0);
    expect(vila.length).toBeLessThanOrEqual(8);
    expect(vila.every((m) => m.name.toLowerCase().startsWith("vila"))).toBe(true);
    expect(findMunicipalities("f")).toEqual([]);
    expect(findMunicipalities("xyzxyz")).toEqual([]);
  });

  it("guarda, avisa e limpa a localização escolhida", () => {
    expect(getSearchLocation()).toBeNull();
    setSearchLocation({ lat: 40.12, lng: -7.53, label: "Fundão", source: "municipality" });
    expect(getSearchLocation()?.label).toBe("Fundão");
    clearSearchLocation();
    expect(getSearchLocation()).toBeNull();
  });

  it("ligação de direções para a quinta", () => {
    expect(directionsUrl({ lat: 40.2, lng: -8.4 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=40.2,-8.4",
    );
  });
});
