export interface LocationInfo {
  city: string;
  state: string;
  country: string;
  fullAddress: string;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<LocationInfo | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`,
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const data = await response.json();

    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.municipality ||
      "Cidade não identificada";

    const state = data.address?.state || "Estado não identificado";
    const country = data.address?.country || "Brasil";

    return {
      city,
      state,
      country,
      fullAddress:
        data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    return null;
  }
}
