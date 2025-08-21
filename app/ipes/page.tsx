"use client";
import { useState, useRef, useEffect } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, CheckCircle } from "lucide-react";
import { reverseGeocode, type LocationInfo } from "@/lib/geocoding";
import { useRouter } from "next/navigation";

interface IpeTree {
  id: string;
  imageUrl: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    locationInfo?: LocationInfo;
  };
  timestamp: Date;
  personName?: string;
  color?: "pink" | "white" | "yellow";
}

export default function IpesPage() {
  const [filteredTrees, setFilteredTrees] = useState<IpeTree[]>([]);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [personName, setPersonName] = useState("");
  const [ipeColor, setIpeColor] = useState<"pink" | "white" | "yellow">(
    "yellow",
  );
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const loadTreesAndLocation = async () => {
      const existingTrees = JSON.parse(
        localStorage.getItem("ipe-trees") || "[]",
      ) as IpeTree[];
      const treesWithDates = existingTrees.map((tree) => ({
        ...tree,
        timestamp: new Date(tree.timestamp),
      }));

      await getCurrentLocationAndFilter(treesWithDates);
    };

    loadTreesAndLocation();

    const locationUpdateInterval = setInterval(async () => {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 30000,
            });
          },
        );

        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Only update if location has changed significantly (more than ~10 meters)
        if (
          !userLocation ||
          Math.abs(userLocation.lat - newLocation.lat) > 0.0001 ||
          Math.abs(userLocation.lng - newLocation.lng) > 0.0001
        ) {
          console.log("Location changed, updating map...");
          setUserLocation(newLocation);

          // Update map center if map exists
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(
              [newLocation.lat, newLocation.lng],
              mapInstanceRef.current.getZoom(),
            );

            // Update user location marker
            mapInstanceRef.current.eachLayer((layer: any) => {
              if (
                layer.options &&
                layer.options.icon &&
                layer.options.icon.options.className === "user-location-icon"
              ) {
                mapInstanceRef.current?.removeLayer(layer);
              }
            });

            const L = await import("leaflet");
            const userIcon = L.default.divIcon({
              html: '<div style="background: #3B82F6; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
              className: "user-location-icon",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });

            L.default
              .marker([newLocation.lat, newLocation.lng], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup("Sua localização atual");
          }
        }
      } catch (error) {
        console.log("Periodic location update failed:", error);
      }
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(locationUpdateInterval);
    };
  }, []);

  useEffect(() => {
    if (!isLoadingLocation && mapRef.current) {
      loadMap();
    }
  }, [filteredTrees, userLocation, isLoadingLocation]);

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingPhoto(file);
    setShowNameDialog(true);
  };

  const handlePhotoWithName = async () => {
    if (!pendingPhoto) return;

    setIsCapturing(true);
    setShowNameDialog(false);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        },
      );

      const locationInfo = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );

      const imageUrl = URL.createObjectURL(pendingPhoto);

      const newTree: IpeTree = {
        id: Date.now().toString(),
        imageUrl,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address:
            locationInfo?.fullAddress ||
            `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          city: locationInfo?.city,
          state: locationInfo?.state,
          locationInfo,
        },
        timestamp: new Date(),
        personName: personName.trim() || undefined,
        color: ipeColor,
      };

      const existingTrees = JSON.parse(
        localStorage.getItem("ipe-trees") || "[]",
      ) as IpeTree[];
      const updatedTrees = [newTree, ...existingTrees];
      localStorage.setItem("ipe-trees", JSON.stringify(updatedTrees));

      const treesWithDates = updatedTrees.map((tree) => ({
        ...tree,
        timestamp: new Date(tree.timestamp),
      }));

      if (currentCity) {
        const cityTrees = treesWithDates.filter(
          (tree) =>
            tree.location.city === currentCity ||
            tree.location.locationInfo?.city === currentCity,
        );
        setFilteredTrees(cityTrees);
      } else {
        setFilteredTrees(treesWithDates);
      }

      const cityText = locationInfo?.city ? ` em ${locationInfo.city}` : "";
      setSuccessMessage(`Ipê fotografado com sucesso${cityText}!`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error capturing photo or location:", error);
      setSuccessMessage(
        "Erro ao capturar foto ou localização. Tente novamente.",
      );
      setShowSuccessDialog(true);
    } finally {
      setIsCapturing(false);
      setPendingPhoto(null);
      setPersonName("");
      setIpeColor("yellow");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancelPhoto = () => {
    setShowNameDialog(false);
    setPendingPhoto(null);
    setPersonName("");
    setIpeColor("yellow");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getCurrentLocationAndFilter = async (allTrees: IpeTree[]) => {
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          });
        },
      );

      const locationInfo = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      if (locationInfo?.city) {
        setCurrentCity(locationInfo.city);
        const cityTrees = allTrees.filter(
          (tree) =>
            tree.location.city === locationInfo.city ||
            tree.location.locationInfo?.city === locationInfo.city,
        );
        setFilteredTrees(cityTrees);
      } else {
        setFilteredTrees(allTrees);
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      setFilteredTrees(allTrees);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const loadMap = async () => {
    if (typeof window === "undefined" || !mapRef.current) return;

    try {
      const L = (await import("leaflet")).default;

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const center =
        userLocation ||
        (filteredTrees.length > 0
          ? {
              lat: filteredTrees[0].location.latitude,
              lng: filteredTrees[0].location.longitude,
            }
          : { lat: -15.7942, lng: -47.8822 });

      const map = L.map(mapRef.current).setView([center.lat, center.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const getColorForIpe = (color?: "pink" | "white" | "yellow") => {
        switch (color) {
          case "pink":
            return "#EC4899";
          case "white":
            return "#F3F4F6";
          case "yellow":
            return "#F59E0B";
          default:
            return "#F59E0B";
        }
      };

      filteredTrees.forEach((tree) => {
        const ipeIcon = L.divIcon({
          html: `<div style="background: ${getColorForIpe(tree.color)}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🌳</div>`,
          className: "custom-div-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(
          [tree.location.latitude, tree.location.longitude],
          { icon: ipeIcon },
        ).addTo(map);

        const formatDate = (date: Date) => {
          return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        };

        const popupContent = `
          <div style="text-align: center; min-width: 200px;cursor: pointer;" onclick="window.navigateToIpe('${tree.id}')">
            <img src="${tree.imageUrl}" alt="Ipê" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${formatDate(tree.timestamp)}</div>
            ${tree.location.address ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${getSimplifiedAddress(tree.location.address)}</div>` : ""}
            ${tree.personName ? `<div style="font-size: 11px; color: #888; font-style: italic; margin-bottom: 8px;">por ${tree.personName}</div>` : ""}
<a href="https://www.google.com/maps/dir/?api=1&destination=${tree.location.latitude},${tree.location.longitude}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #4285F4; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; margin-top: 4px;" onclick="event.stopPropagation();">
              📍 Como chegar
            </a>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 250 });
      });

      if (userLocation) {
        const userIcon = L.divIcon({
          html: '<div style="background: #3B82F6; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: "user-location-icon",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup("Sua localização atual");
      }
      (window as any).navigateToIpe = (id: string) => {
        router.push(`/ipes/${id}`);
      };
    } catch (error) {
      console.error("Error loading map:", error);
    }
  };

  const getSimplifiedAddress = (fullAddress: string) => {
    const parts = fullAddress.split(",").map((part) => part.trim());
    return parts.slice(0, 2).join(", ");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-[1001]">
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
          {isLoadingLocation ? (
            <p className="text-sm text-muted-foreground">
              Detectando localização...
            </p>
          ) : currentCity ? (
            <p className="text-sm font-medium text-foreground">{currentCity}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sua região</p>
          )}
        </div>
      </div>

      <div className="relative h-screen">
        <div ref={mapRef} className="w-full h-full" />
        {filteredTrees.length === 0 && !isLoadingLocation ? (
          <Button
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-[1000] px-6 py-3 h-auto rounded-full"
          >
            <Camera className="h-5 w-5 mr-2" />
            {isCapturing
              ? "Capturando..."
              : `Fotografar primeiro Ipê de ${currentCity || "sua região"}`}
          </Button>
        ) : (
          <Button
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 h-16 w-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-[1000]"
            size="icon"
          >
            <Camera className="!h-8 !w-8" />
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-md z-[1002]">
          <DialogHeader>
            <DialogTitle>Adicionar informações do Ipê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Seu nome (opcional)
              </label>
              <Input
                placeholder="Como você gostaria de ser identificado?"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePhotoWithName();
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Cor do Ipê
              </label>
              <div className="flex gap-3">
                {[
                  { value: "pink" as const, label: "Rosa", color: "#EC4899" },
                  {
                    value: "white" as const,
                    label: "Branco",
                    color: "#F3F4F6",
                  },
                  {
                    value: "yellow" as const,
                    label: "Amarelo",
                    color: "#F59E0B",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="ipeColor"
                      value={option.value}
                      checked={ipeColor === option.value}
                      onChange={(e) =>
                        setIpeColor(
                          e.target.value as "pink" | "white" | "yellow",
                        )
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        ipeColor === option.value
                          ? "border-primary"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: option.color }}
                    >
                      {ipeColor === option.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelPhoto}>
                Cancelar
              </Button>
              <Button onClick={handlePhotoWithName} disabled={isCapturing}>
                {isCapturing ? "Salvando..." : "Salvar Ipê"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md z-[1002]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground">{successMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
