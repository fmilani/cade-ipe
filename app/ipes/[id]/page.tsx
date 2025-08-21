"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationInfo } from "@/lib/geocoding";

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

export default function IpeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tree, setTree] = useState<IpeTree | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTree = () => {
      try {
        const existingTrees = JSON.parse(
          localStorage.getItem("ipe-trees") || "[]",
        ) as IpeTree[];
        const treesWithDates = existingTrees.map((tree) => ({
          ...tree,
          timestamp: new Date(tree.timestamp),
        }));

        const foundTree = treesWithDates.find(
          (t: IpeTree) => t.id === params.id,
        );
        setTree(foundTree || null);
      } catch (error) {
        console.error("Error loading tree:", error);
        setTree(null);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadTree();
    }
  }, [params.id]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSimplifiedAddress = (fullAddress: string) => {
    const parts = fullAddress.split(",").map((part) => part.trim());
    return parts.slice(0, 2).join(", ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ipê não encontrado</p>
        <Button onClick={() => router.push("/ipes")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao mapa
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold">Ipê</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Fullscreen image */}
      <div className="pt-16 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-black">
          <img
            src={tree.imageUrl || "/placeholder.svg"}
            alt="Ipê"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Tree details */}
        <div className="bg-background p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {formatDate(tree.timestamp)}
            </p>

            {tree.location.address && (
              <p className="text-sm text-muted-foreground mb-2">
                {getSimplifiedAddress(tree.location.address)}
              </p>
            )}

            {tree.personName && (
              <p className="text-sm text-muted-foreground italic mb-4">
                por {tree.personName}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Cor:</span>
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{
                  backgroundColor:
                    tree.color === "pink"
                      ? "#EC4899"
                      : tree.color === "white"
                        ? "#F3F4F6"
                        : "#F59E0B",
                }}
              />
              <span className="text-sm capitalize">
                {tree.color === "pink"
                  ? "Rosa"
                  : tree.color === "white"
                    ? "Branco"
                    : "Amarelo"}
              </span>
            </div>

            <Button
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${tree.location.latitude},${tree.location.longitude}`,
                  "_blank",
                )
              }
              className="w-full"
            >
              📍 Como chegar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
