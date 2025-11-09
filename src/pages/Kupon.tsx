import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, ArrowLeft, CheckCircle, Navigation } from "lucide-react";
import { toast } from "sonner";
import { BrowserQRCodeReader } from "@zxing/browser";

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
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const isProcessingScanRef = useRef(false); // Prevent multiple scans
  const activeStreamRef = useRef<MediaStream | null>(null);

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

        // Check if coupon is active or redeemed
        if (couponData.status !== "active" && couponData.status !== "redeemed") {
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

  const startScanning = () => {
    console.log("=== [CAMERA DEBUG] User clicked scan button ===");

    // Check if coupon is already used
    if (coupon?.status === "used") {
      console.log("[CAMERA DEBUG] Coupon already used, showing warning");
      toast.error("Ten kupon został już wykorzystany");
      return;
    }

    // Check if browser supports media devices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "Twoja przeglądarka nie obsługuje dostępu do kamery";
      console.error("[CAMERA DEBUG] ERROR: Browser doesn't support media devices");
      toast.error(errorMsg);
      setCameraError(errorMsg);
      return;
    }

    console.log("[CAMERA DEBUG] ✓ Browser supports media devices");
    console.log("[CAMERA DEBUG] Setting scanning to true (will trigger video element mount)");
    setCameraError(null);
    isProcessingScanRef.current = false; // Reset the processing flag for new scan
    setScanning(true);
    // The actual camera initialization will happen in useEffect when video element is mounted
  };

  // Effect to initialize camera when video element becomes available
  useEffect(() => {
    const initCamera = async () => {
      if (!scanning || !videoRef.current) {
        console.log("[CAMERA DEBUG] Skipping camera init - scanning:", scanning, "videoRef:", !!videoRef.current);
        return;
      }

      console.log("[CAMERA DEBUG] === Initializing camera (video element is mounted) ===");

      try {
        console.log("[CAMERA DEBUG] Step 1: Initializing BrowserQRCodeReader");

        if (!codeReaderRef.current) {
          console.log("[CAMERA DEBUG] Creating new BrowserQRCodeReader instance");
          codeReaderRef.current = new BrowserQRCodeReader();
          console.log("[CAMERA DEBUG] BrowserQRCodeReader created:", codeReaderRef.current);
        } else {
          console.log("[CAMERA DEBUG] Using existing BrowserQRCodeReader instance");
        }

        console.log("[CAMERA DEBUG] Step 2: Starting camera on video element");
        console.log("[CAMERA DEBUG] videoRef.current:", videoRef.current);

        // Use undefined for deviceId to let the browser select the best camera
        const controls = await codeReaderRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (result) {
              // Prevent processing the same scan multiple times
              if (isProcessingScanRef.current) {
                console.log("[CAMERA DEBUG] Already processing a scan, ignoring duplicate");
                return;
              }

              isProcessingScanRef.current = true;
              console.log("[CAMERA DEBUG] ✓ QR Code scanned successfully:", result.getText());
              const scannedText = result.getText();
              setScannedData(scannedText);
              stopScanning();
              toast.success("QR kod zeskanowany!");

              // Mark coupon as used in database
              markCouponAsUsed();
            }
            if (error && !(error.name === "NotFoundException")) {
              console.error("[CAMERA DEBUG] Scanning error (not NotFoundException):", error);
            }
          }
        );
        
        // Store the video stream for cleanup
        if (videoRef.current && videoRef.current.srcObject) {
          activeStreamRef.current = videoRef.current.srcObject as MediaStream;
        }
        
        console.log("[CAMERA DEBUG] ✓ Camera started successfully");
      } catch (err: any) {
        console.error("[CAMERA DEBUG] === EXCEPTION CAUGHT ===");
        console.error("[CAMERA DEBUG] Error name:", err.name);
        console.error("[CAMERA DEBUG] Error message:", err.message);
        console.error("[CAMERA DEBUG] Error stack:", err.stack);
        console.error("[CAMERA DEBUG] Full error object:", err);

        let errorMsg = "";

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg = `Dostęp do kamery został odrzucony. Zezwól na dostęp do kamery w ustawieniach przeglądarki.\n\nTyp błędu: ${err.name}\nWiadomość: ${err.message}`;
          toast.error("Dostęp do kamery został odrzucony. Zezwól na dostęp do kamery w ustawieniach przeglądarki.");
        } else if (err.name === "NotFoundError") {
          errorMsg = `Nie znaleziono kamery na tym urządzeniu.\n\nTyp błędu: ${err.name}\nWiadomość: ${err.message}`;
          toast.error("Nie znaleziono kamery na tym urządzeniu");
        } else {
          errorMsg = `Wystąpił błąd podczas uruchamiania kamery.\n\nTyp: ${err.name || 'Unknown'}\nWiadomość: ${err.message || err.toString()}\nStack: ${err.stack || 'N/A'}`;
          toast.error("Nie można uruchomić kamery. Sprawdź uprawnienia.");
        }

        setCameraError(errorMsg);
        setScanning(false);
        console.log("[CAMERA DEBUG] === Error handling complete ===");
      }
    };

    initCamera();
  }, [scanning]); // Run when scanning state changes

  const stopScanning = () => {
    console.log("[CAMERA DEBUG] Stopping camera...");
    
    // Stop all video tracks
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("[CAMERA DEBUG] Stopped track:", track.kind);
      });
      activeStreamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    console.log("[CAMERA DEBUG] ✓ Camera stopped successfully");
    setScanning(false);
    setCameraError(null); // Clear any errors
    isProcessingScanRef.current = false; // Reset processing flag
  };

  const resetAndScanAgain = () => {
    console.log("[CAMERA DEBUG] Reset and scan again clicked");

    // Check if coupon is already used
    if (coupon?.status === "used") {
      toast.error("Ten kupon został już wykorzystany i nie można go użyć ponownie");
      return;
    }

    setScannedData(null);
    setCameraError(null);
    // Automatically restart camera for next scan
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  const markCouponAsUsed = async () => {
    if (!couponId) {
      console.error("[COUPON] Cannot mark as used - no coupon ID");
      return;
    }

    console.log("[COUPON] Marking coupon as used:", couponId);

    try {
      const { error } = await supabase
        .from("coupons")
        .update({ status: "used" })
        .eq("id", couponId);

      if (error) {
        console.error("[COUPON] Error updating coupon status:", error);
        toast.error("Nie udało się zaktualizować statusu kuponu");
      } else {
        console.log("[COUPON] ✓ Coupon marked as used successfully");
        // Update local state to reflect the change
        if (coupon) {
          setCoupon({ ...coupon, status: "used" });
        }
      }
    } catch (err) {
      console.error("[COUPON] Exception while updating coupon:", err);
    }
  };

  const openGoogleMaps = () => {
    if (!coupon || !location?.street) {
      toast.error("Brak danych lokalizacji");
      return;
    }

    const query = encodeURIComponent(`${coupon.local_name}, ${location.street}, Polska`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    window.open(googleMapsUrl, '_blank');
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
      isProcessingScanRef.current = false;
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
        <div className="text-center">
          <h1 className="text-2xl font-bold">Twój kupon zniżkowy od Patrona portalu eJedzie.pl za aktywne informowanie o korkach dzięki uprzejmości:</h1>
        </div>

        {/* Coupon Image */}
        {coupon.image_link && (
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={coupon.image_link}
              alt="Kupon"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Instructions */}
        {!scannedData && (
          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            <p className="text-lg leading-relaxed">
              Zrealizuj kupon. Zeskanuj QR kod w lokalu z kartki z napisem "eJedzie.pl skanuj kod". Zobacz jaką zniżkę otrzymasz i pokaż obsłudze. Smacznego :)
            </p>
          </div>
        )}

        {/* Coupon Details */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          {coupon.status === "used" && (
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                ⚠️ Kupon został już wykorzystany
              </p>
            </div>
          )}

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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Lokal</p>
                <p className="text-lg font-semibold">{coupon.local_name}</p>
                {location?.street && (
                  <p className="text-sm text-muted-foreground">{location.street}</p>
                )}
              </div>
              {location?.street && (
                <Button
                  onClick={openGoogleMaps}
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Nawiguj
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* QR Scanner */}
        {!scannedData && (
          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            {!scanning ? (
              <>
                <Button
                  onClick={startScanning}
                  className="w-full h-16 text-lg"
                  size="lg"
                  disabled={coupon.status === "used"}
                >
                  <Camera className="mr-2 h-6 w-6" />
                  {coupon.status === "used" ? "Kupon został już wykorzystany" : "Skanuj kod QR, odbierz zniżkę"}
                </Button>

                {/* Camera Error Details */}
                {cameraError && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-semibold text-destructive mb-2">Szczegóły błędu kamery:</p>
                    <pre className="text-xs text-destructive/90 whitespace-pre-wrap break-words font-mono">
                      {cameraError}
                    </pre>
                  </div>
                )}
              </>
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

                {/* Camera Error Details during scanning */}
                {cameraError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-semibold text-destructive mb-2">Szczegóły błędu kamery:</p>
                    <pre className="text-xs text-destructive/90 whitespace-pre-wrap break-words font-mono">
                      {cameraError}
                    </pre>
                  </div>
                )}
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

            <div className="bg-card rounded-lg p-6 border-2 border-primary text-center">
              <p className="text-2xl font-bold text-primary">
                Pokaż kupon obsłudze przy zamówieniu i odbierz zniżkę
              </p>
            </div>

            {coupon.status !== "used" ? (
              <Button
                onClick={resetAndScanAgain}
                variant="outline"
                className="w-full"
              >
                Zeskanuj ponownie
              </Button>
            ) : (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-300 dark:border-orange-700 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Kupon został wykorzystany i nie można go już użyć ponownie
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
