import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <h1 className="font-bold text-foreground text-4xl">Cadê Ipê</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Descubra e mapeie a beleza dos ipês na sua cidade
        </p>

        <Link
          href="/ipes"
          className="inline-flex items-center text-primary hover:text-primary/80 font-medium mt-8 text-2xl"
        >
          Explorar
          <ArrowRight className="h-5 w-5 ml-2" />
        </Link>
      </div>
    </div>
  );
}
