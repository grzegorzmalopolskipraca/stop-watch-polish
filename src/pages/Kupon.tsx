import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface Coupon {
  id: string;
  local_id: string;
  local_name: string;
  discount: number;
  status: string;
  time_from: string;
  time_to: string | null;
  image_link: string | null;
}

interface Location {
  street: string | null;
}

export default function Kupon() {
  const [searchParams] = useSearchParams();
  const couponId = searchParams.get("id");

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const fetchCoupon = async () => {
      if (!couponId) {
        setError("no-id");
        setLoading(false);
        return;
      }

      try {
        // Fetch coupon data
        const { data: couponData, error: couponError } = await supabase
          .from("coupons")
          .select("*")
          .eq("id", couponId)
          .single();

        if (couponError || !couponData) {
          setError("invalid");
          setLoading(false);
          return;
        }

        setCoupon(couponData);

        // Fetch location data
        const { data: locationData } = await supabase
          .from("locations")
          .select("street")
          .eq("id", couponData.local_id)
          .single();

        if (locationData) {
          setLocation(locationData);
        }

        // Check if coupon is active
        if (couponData.status !== "active") {
          setError("inactive");
        }
      } catch (err) {
        console.error("Error fetching coupon:", err);
        setError("invalid");
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [couponId]);

  const startScanning = async () => {
    setScanning(true);

    try {
      // First, explicitly request camera permission
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Twoja przeglądarka nie obsługuje dostępu do kamery");
        setScanning(false);
        return;
      }

      // Request camera permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" } // Prefer back camera on mobile
        });
        // Stop the stream immediately - we just needed to get permission
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError: any) {
        console.error("Permission error:", permissionError);
        if (permissionError.name === "NotAllowedError" || permissionError.name === "PermissionDeniedError") {
          toast.error("Dostęp do kamery został odrzucony. Zezwól na dostęp do kamery w ustawieniach przeglądarki.");
        } else if (permissionError.name === "NotFoundError") {
          toast.error("Nie znaleziono kamery na tym urządzeniu");
        } else {
          toast.error("Nie można uzyskać dostępu do kamery. Sprawdź uprawnienia.");
        }
        setScanning(false);
        return;
      }

      // Now initialize the QR scanner
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        toast.error("Nie znaleziono kamery");
        setScanning(false);
        return;
      }

      // Use the back camera if available (usually the last one on mobile)
      const selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;

      if (videoRef.current) {
        codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const scannedText = result.getText();
              setScannedData(scannedText);
              stopScanning();
              toast.success("QR kod zeskanowany!");
            }
            if (error && !(error.name === "NotFoundException")) {
              console.error("Scanning error:", error);
            }
          }
        );
      }
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Wystąpił błąd podczas uruchamiania kamery");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (error === "no-id" || error === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-2xl font-bold text-destructive">
            Kupon nie istnieje lub nie jest już ważny
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do strony głównej
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error === "inactive") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-2xl font-bold text-destructive">
            Niestety kupon stracił ważność lub został już wykorzystany
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do strony głównej
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!coupon) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Kupon zniżkowy</h1>
        </div>

        {/* Instructions */}
        {!scannedData && (
          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            <p className="text-lg leading-relaxed">
              Możesz teraz zrealizować kupon. Pozwól na dostęp do kamery i zeskanuj QR Code widoczny na przyklejonej kartce w lokalu z logiem 'eJedzie.pl'. Po zeskanowaniu dowiesz się jaką masz zniżkę.
            </p>
          </div>
        )}

        {/* Coupon Details */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ID kuponu</p>
            <p className="text-xl font-mono font-bold">{coupon.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ważny do</p>
            <p className="text-lg font-semibold">
              {coupon.time_to ? new Date(coupon.time_to).toLocaleString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : "Bez limitu czasu"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Lokal</p>
            <p className="text-lg font-semibold">{coupon.local_name}</p>
            {location?.street && (
              <p className="text-sm text-muted-foreground">{location.street}</p>
            )}
          </div>
        </div>

        {/* QR Scanner */}
        {!scannedData && (
          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            {!scanning ? (
              <Button
                onClick={startScanning}
                className="w-full h-16 text-lg"
                size="lg"
              >
                <Camera className="mr-2 h-6 w-6" />
                Zeskanuj QR Code
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 border-4 border-primary/50 pointer-events-none" />
                </div>
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="w-full"
                >
                  Anuluj skanowanie
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Scanned Result */}
        {scannedData && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 border-2 border-green-500 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                <p className="text-xl font-bold text-green-900 dark:text-green-100">
                  Kod zeskanowany!
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-green-700 dark:text-green-300">Zeskanowane dane:</p>
                <p className="text-lg font-mono bg-white dark:bg-green-900/50 p-4 rounded border border-green-300 dark:border-green-700 break-all">
                  {scannedData}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 border-2 border-primary space-y-4 text-center">
              <p className="text-2xl font-bold text-primary">
                Pokaż kupon obsłudze przy zamówieniu i odbierz zniżkę
              </p>
              <p className="text-lg text-muted-foreground">
                Zniżka: <span className="font-bold text-foreground">{coupon.discount}%</span>
              </p>
            </div>

            <Button
              onClick={() => setScannedData(null)}
              variant="outline"
              className="w-full"
            >
              Zeskanuj ponownie
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
