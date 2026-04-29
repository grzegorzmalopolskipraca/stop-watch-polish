import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Send, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleViewer } from "@/components/ConsoleViewer";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import Seo from "@/components/Seo";

const Push = () => {
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState("To jest testowe powiadomienie push!");
  const [pushTag, setPushTag] = useState("test_device");
  const [isSending, setIsSending] = useState(false);
  const [receivedNotifications, setReceivedNotifications] = useState<Array<{
    timestamp: Date;
    title: string;
    body: string;
    data?: any;
  }>>([]);

  useEffect(() => {
    if (isAdmin) {
      console.log("🚀 [COMPONENT] Component mounted - Initializing OneSignal");
      initializeOneSignal();
    }
  }, [isAdmin]);

  const initializeOneSignal = async () => {
    try {
      console.log("📱 [COMPONENT] Starting OneSignal component initialization...");
      
      // Ensure window.OneSignalDeferred exists
      if (!window.OneSignalDeferred) {
        console.error("❌ [COMPONENT] OneSignalDeferred not found on window");
        throw new Error("OneSignal SDK not loaded");
      }

      console.log("✅ [COMPONENT] OneSignalDeferred found, pushing callback...");
      
      // Wait for OneSignal to be available
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        console.log("✅ [COMPONENT] OneSignal callback executed");
        console.log("[COMPONENT] OneSignal object:", OneSignal);
        
        try {
          // Check if push is supported
          const isPushSupported = OneSignal.Notifications.isPushSupported();
          console.log("[COMPONENT] Push notifications supported:", isPushSupported);

          if (!isPushSupported) {
            console.warn("⚠️ [COMPONENT] Push notifications not supported on this browser");
            toast.error("Powiadomienia push nie są wspierane w tej przeglądarce");
            return;
          }

          // Get current permission
          const permission = OneSignal.Notifications.permissionNative;
          console.log("🔔 [COMPONENT] Current permission:", permission);

          // Get subscription status
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          console.log("✅ [COMPONENT] User opted in:", optedIn);
          setIsSubscribed(optedIn);

          // Get user ID and token if available
          const id = OneSignal.User.PushSubscription.id;
          const token = OneSignal.User.PushSubscription.token;

          // Try to get external ID, but don't fail if it doesn't exist
          let extId = null;
          try {
            if (typeof OneSignal.User.getExternalId === 'function') {
              extId = await OneSignal.User.getExternalId();
            }
          } catch (extIdError) {
            console.warn("⚠️ [COMPONENT] Could not get external ID:", extIdError);
          }

          console.log("🆔 [COMPONENT] Subscription Details:", {
            id: id || null,
            token: token ? token.substring(0, 50) + '...' : null,
            externalId: extId || null,
            optedIn
          });

          setUserId(id || null);
          setPushToken(token || null);
          setExternalId(extId || null);

          // Listen for subscription changes
          OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
            console.log("🔄 [COMPONENT] Subscription changed:", {
              previous: event.previous,
              current: event.current
            });
            setIsSubscribed(event.current.optedIn);
            setUserId(event.current.id);
            setPushToken(event.current.token);
          });

          // Add notification event listeners
          OneSignal.Notifications.addEventListener("foregroundWillDisplay", async (event: any) => {
            console.log("🔔 [NOTIFICATION] Notification will display:", event);
            const notifData = {
              title: event.notification?.title || "No title",
              body: event.notification?.body || "No body",
              data: event.notification?.data,
              url: event.notification?.launchURL
            };
            console.log("📄 [NOTIFICATION] Notification data:", notifData);
            
            // Add to received notifications list
            setReceivedNotifications(prev => [{
              timestamp: new Date(),
              title: notifData.title,
              body: notifData.body,
              data: notifData.data
            }, ...prev.slice(0, 9)]); // Keep last 10
            
            // Prevent default to manually control display
            event.preventDefault();
            
            // Manually display the notification using Service Worker (same as test button)
            try {
              if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                  console.log("📱 [NOTIFICATION] Displaying via Service Worker...");
                  await registration.showNotification(notifData.title, {
                    body: notifData.body,
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                    tag: event.notification?.notificationId || "onesignal-notification",
                    requireInteraction: false,
                    data: notifData.data || {}
                  });
                  console.log("✅ [NOTIFICATION] Displayed successfully via Service Worker");
                }
              }
            } catch (displayError) {
              console.error("❌ [NOTIFICATION] Error displaying notification:", displayError);
              // Fallback: let OneSignal display it
              event.notification?.display?.();
            }
            
            // Show toast
            toast.success(`📬 Otrzymano: ${notifData.title}`, { 
              description: notifData.body,
              duration: 5000 
            });
          });

          OneSignal.Notifications.addEventListener("click", (event: any) => {
            console.log("👆 [NOTIFICATION] Notification clicked:", event);
            console.log("📄 [NOTIFICATION] Click data:", {
              title: event.notification?.title,
              body: event.notification?.body,
              data: event.notification?.data,
              url: event.notification?.launchURL
            });
            toast.success("Kliknięto powiadomienie: " + event.notification?.title);
          });

          OneSignal.Notifications.addEventListener("dismiss", (event: any) => {
            console.log("❌ [NOTIFICATION] Notification dismissed:", event);
          });

          OneSignal.Notifications.addEventListener("permissionChange", (permission: boolean) => {
            console.log("🔐 [NOTIFICATION] Permission changed:", permission);
            if (permission) {
              toast.success("Uprawnienia do powiadomień przyznane!");
            } else {
              toast.warning("Uprawnienia do powiadomień odrzucone");
            }
          });

          console.log("✅ [COMPONENT] Component initialization complete");
        } catch (innerError) {
          console.error("❌ [COMPONENT] Error in OneSignal callback:", innerError);
          // Don't throw - we still want to mark as initialized if OneSignal is available
          toast.warning("OneSignal załadowany z ostrzeżeniami. Sprawdź console.");
        } finally {
          // Always mark as initialized if we got this far (OneSignal is available)
          setIsInitialized(true);
        }
      });
    } catch (error) {
      console.error("❌ [COMPONENT] OneSignal initialization error:", error);
      toast.error(`Błąd inicjalizacji: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleRegister = async () => {
    try {
      console.log("🔔 [REGISTER] Starting registration...");
      
      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("[REGISTER] Requesting notification permission...");
          const permission = await OneSignal.Notifications.requestPermission();
          console.log("[REGISTER] Permission result:", permission);

          console.log("[REGISTER] Opting in to push notifications...");
          await OneSignal.User.PushSubscription.optIn();

          // Wait a bit for the subscription to be fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));

          const newId = OneSignal.User.PushSubscription.id;
          const newToken = OneSignal.User.PushSubscription.token;

          console.log("[REGISTER] Registration details:", {
            id: newId,
            token: newToken,
            userAgent: navigator.userAgent,
            platform: navigator.platform
          });

          // Update local state immediately
          setIsSubscribed(true);
          setUserId(newId);
          setPushToken(newToken);

          // Add tags to help identify test device subscriptions
          // IMPORTANT: We add "street_test_device" to match what the backend sends to
          const tags = {
            test_device: "true",
            street_test_device: "true",
            registered_from: window.location.pathname,
            device_type: navigator.platform,
            browser: navigator.userAgent.includes('Android') ? 'Android Chrome' : 'Desktop Chrome'
          };

          // Add tags with retry logic
          let tagsAdded = false;
          let retryCount = 0;
          const maxRetries = 3;

          while (!tagsAdded && retryCount < maxRetries) {
            try {
              console.log(`[REGISTER] Adding tags (attempt ${retryCount + 1}/${maxRetries})...`);
              await OneSignal.User.addTags(tags);
              console.log("[REGISTER] ✅ Tags added successfully:", tags);

              // Wait a bit for server sync
              await new Promise(resolve => setTimeout(resolve, 1500));

              // Verify tags were synced - check multiple times if needed
              let verifyAttempt = 0;
              const maxVerifyAttempts = 3;
              let verifyTags = null;

              while (verifyAttempt < maxVerifyAttempts) {
                verifyTags = await OneSignal.User.getTags();
                console.log(`[REGISTER] Tags verification (attempt ${verifyAttempt + 1}/${maxVerifyAttempts}):`, verifyTags);

                // Check if the critical tag is present
                if (verifyTags && verifyTags.street_test_device === "true") {
                  console.log("[REGISTER] ✅ street_test_device tag confirmed on server!");
                  tagsAdded = true;
                  break;
                }

                console.warn(`[REGISTER] ⚠️ street_test_device tag not yet visible (attempt ${verifyAttempt + 1}/${maxVerifyAttempts})`);
                verifyAttempt++;

                if (verifyAttempt < maxVerifyAttempts) {
                  // Wait before next verification
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }

              if (!tagsAdded) {
                throw new Error("Tag verification failed - street_test_device not found on server");
              }

            } catch (tagError) {
              retryCount++;
              console.error(`❌ [REGISTER] Tag operation failed (attempt ${retryCount}/${maxRetries}):`, tagError);

              if (retryCount >= maxRetries) {
                console.error("❌ [REGISTER] Tag sync failed after all retries!");
                console.error("[REGISTER] This means push notifications may not work correctly.");
                console.error("[REGISTER] Try the following:");
                console.error("  1. Click 'Wyłącz powiadomienia'");
                console.error("  2. Wait 10 seconds");
                console.error("  3. Click 'Włącz powiadomienia' again");

                toast.error(
                  `⚠️ Ostrzeżenie: Tag street_test_device nie został zsynchronizowany.\n\nPowiadomienia mogą nie działać poprawnie.\n\nSpróbuj wyłączyć i ponownie włączyć powiadomienia.`,
                  { duration: 10000 }
                );
              } else {
                // Wait before retry with exponential backoff
                const waitTime = 1000 * Math.pow(2, retryCount - 1); // 1s, 2s, 4s
                console.log(`[REGISTER] Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }

          if (tagsAdded) {
            console.log("✅ [REGISTER] All tags successfully synced to server!");
          }

          console.log("✅ [REGISTER] Successfully registered for push notifications");

          toast.success("Powiadomienia push włączone! ID: " + (newId || "pending..."));
        } catch (innerError) {
          console.error("❌ [REGISTER] Inner registration error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [REGISTER] Registration error:", error);
      toast.error(`Błąd rejestracji: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleUnregister = async () => {
    try {
      console.log("🔕 [UNREGISTER] Starting unregistration...");
      console.log("[UNREGISTER] Current state - isSubscribed:", isSubscribed, "userId:", userId);

      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("[UNREGISTER] Opting out of push notifications...");
          await OneSignal.User.PushSubscription.optOut();

          // Wait a bit for the state to update
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check the new state
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          console.log("[UNREGISTER] After opt-out, optedIn status:", optedIn);

          // Manually update state to ensure button re-enables
          setIsSubscribed(false);

          console.log("✅ [UNREGISTER] Successfully unregistered from push notifications");
          toast.success("Powiadomienia push wyłączone");
        } catch (innerError) {
          console.error("❌ [UNREGISTER] Inner unregistration error:", innerError);
          toast.error("Błąd podczas wyłączania powiadomień");
        }
      });
    } catch (error) {
      console.error("❌ [UNREGISTER] Unregistration error:", error);
      toast.error(`Błąd wyrejestrowania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleDiagnoseSubscription = async () => {
    try {
      console.log("");
      console.log("🔍🔍🔍 [DIAGNOSE] ==================== SUBSCRIPTION DIAGNOSIS ====================");
      console.log("[DIAGNOSE] Timestamp:", new Date().toISOString());

      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          // Get all subscription details
          const details = {
            // Permission
            permissionNative: OneSignal.Notifications.permissionNative,
            isPushSupported: OneSignal.Notifications.isPushSupported(),

            // Subscription state
            optedIn: OneSignal.User.PushSubscription.optedIn,
            id: OneSignal.User.PushSubscription.id,
            token: OneSignal.User.PushSubscription.token,

            // User
            onesignalId: OneSignal.User.onesignalId,
            externalId: OneSignal.User.externalId,

            // Tags
            tags: await OneSignal.User.getTags(),

            // Platform
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isAndroid: navigator.userAgent.includes('Android'),
            isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
          };

          console.log("[DIAGNOSE] Complete Subscription Details:", details);
          console.log("");
          console.log("[DIAGNOSE] ==================== DIAGNOSIS SUMMARY ====================");
          console.log("[DIAGNOSE] Permission:", details.permissionNative);
          console.log("[DIAGNOSE] Push Supported:", details.isPushSupported);
          console.log("[DIAGNOSE] Opted In:", details.optedIn);
          console.log("[DIAGNOSE] Has ID:", !!details.id);
          console.log("[DIAGNOSE] Has Token:", !!details.token);
          console.log("[DIAGNOSE] Has street_test_device tag:", !!details.tags?.street_test_device);
          console.log("");

          // Diagnose issues
          const issues = [];
          const fixes = [];

          if (details.permissionNative !== 'granted') {
            issues.push("Permission not granted");
            fixes.push("Click 'Włącz powiadomienia' to request permission");
          }

          if (!details.optedIn) {
            issues.push("NOT OPTED IN - This is the problem!");
            fixes.push("User needs to call OneSignal.User.PushSubscription.optIn()");
            fixes.push("Try clicking 'Włącz powiadomienia' button");
          }

          if (!details.token) {
            issues.push("No push token");
            fixes.push("Token should be generated after permission granted");
          }

          if (!details.tags?.street_test_device) {
            issues.push("Missing street_test_device tag");
            fixes.push("Will attempt to auto-add tag now...");
          }

          if (issues.length > 0) {
            console.error("[DIAGNOSE] ⚠️ ISSUES FOUND:");
            issues.forEach((issue, i) => {
              console.error(`  ${i + 1}. ${issue}`);
            });
            console.log("");
            console.log("[DIAGNOSE] 🔧 SUGGESTED FIXES:");
            fixes.forEach((fix, i) => {
              console.log(`  ${i + 1}. ${fix}`);
            });
          } else {
            console.log("[DIAGNOSE] ✅ No issues found - subscription looks good!");
          }

          // Auto-fix: Add missing street_test_device tag if user is opted in
          if (details.optedIn && !details.tags?.street_test_device) {
            console.log("");
            console.log("[DIAGNOSE] 🔧 AUTO-FIX: Attempting to add missing street_test_device tag...");

            let tagAdded = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!tagAdded && retryCount < maxRetries) {
              try {
                console.log(`[DIAGNOSE] Adding tag (attempt ${retryCount + 1}/${maxRetries})...`);
                await OneSignal.User.addTag("street_test_device", "true");

                // Wait for sync
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Verify
                const verifyTags = await OneSignal.User.getTags();
                if (verifyTags && verifyTags.street_test_device === "true") {
                  console.log("[DIAGNOSE] ✅ AUTO-FIX: street_test_device tag successfully added!");
                  tagAdded = true;

                  // Remove the tag issue from the issues array
                  const tagIssueIndex = issues.findIndex(i => i.includes("street_test_device"));
                  if (tagIssueIndex !== -1) {
                    issues.splice(tagIssueIndex, 1);
                  }
                } else {
                  throw new Error("Tag not verified after adding");
                }
              } catch (tagError) {
                retryCount++;
                console.error(`[DIAGNOSE] ❌ AUTO-FIX failed (attempt ${retryCount}/${maxRetries}):`, tagError);

                if (retryCount < maxRetries) {
                  const waitTime = 1000 * Math.pow(2, retryCount - 1);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }
            }

            if (!tagAdded) {
              console.error("[DIAGNOSE] ❌ AUTO-FIX: Failed to add tag after all retries");
              fixes.push("Manual fix needed: Click 'Wyłącz powiadomienia' then 'Włącz powiadomienia'");
            }
          }

          console.log("[DIAGNOSE] ================================================================");
          console.log("");

          // Show toast with diagnosis
          if (issues.length > 0) {
            toast.error(
              `Znaleziono ${issues.length} problem(ów):\n${issues.join('\n')}\n\nSzczegóły w konsoli`,
              { duration: 8000 }
            );
          } else {
            toast.success("Subskrypcja wygląda poprawnie!\nSzczegóły w konsoli", { duration: 5000 });
          }

        } catch (innerError) {
          console.error("❌ [DIAGNOSE] Inner error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [DIAGNOSE] Error:", error);
      toast.error("Nie udało się zdiagnozować subskrypcji");
    }
  };

  const handleCheckStatus = async () => {
    try {
      console.log("🔍 [CHECK-STATUS] Checking subscription status...");

      // Check service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        console.log("📋 [CHECK-STATUS] Service Worker registration:", {
          found: !!registration,
          scope: registration?.scope,
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting,
          updateViaCache: registration?.updateViaCache
        });

        if (registration?.active) {
          console.log("✅ [CHECK-STATUS] Active Service Worker state:", registration.active.state);
          console.log("✅ [CHECK-STATUS] Active Service Worker URL:", registration.active.scriptURL);
        }
      } else {
        console.warn("⚠️ [CHECK-STATUS] Service Workers not supported in this browser");
      }

      // Check notification permission at browser level
      const browserPermission = await navigator.permissions.query({ name: 'notifications' });
      console.log("🔐 [CHECK-STATUS] Browser notification permission:", browserPermission.state);

      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const isPushSupported = OneSignal.Notifications.isPushSupported();
          const permission = OneSignal.Notifications.permissionNative;
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          const id = OneSignal.User.PushSubscription.id;
          const token = OneSignal.User.PushSubscription.token;
          const tags = await OneSignal.User.getTags();

          const status = {
            isPushSupported,
            permission,
            optedIn,
            id,
            token: token ? token.substring(0, 50) + '...' : null,
            tags,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href
          };

          console.log("📊 [CHECK-STATUS] Full Status:", status);

          // Check if required tag is missing and add it with retry logic
          if (optedIn && !tags.street_test_device) {
            let tagAdded = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!tagAdded && retryCount < maxRetries) {
              try {
                console.log(`⚠️ [CHECK-STATUS] Missing street_test_device tag, adding it now (attempt ${retryCount + 1}/${maxRetries})...`);
                await OneSignal.User.addTag("street_test_device", "true");

                // Wait for server sync
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Verify tag was added
                const verifyTags = await OneSignal.User.getTags();
                if (verifyTags && verifyTags.street_test_device === "true") {
                  console.log("✅ [CHECK-STATUS] street_test_device tag successfully added and verified!");
                  tagAdded = true;
                  toast.success(
                    `Status: Subscribed ✅\nBrakujący tag został dodany i potwierdzony!\nID: ${id || 'None'}`,
                    { duration: 5000 }
                  );
                } else {
                  throw new Error("Tag not found after adding");
                }
              } catch (tagError) {
                retryCount++;
                console.error(`❌ [CHECK-STATUS] Failed to add tag (attempt ${retryCount}/${maxRetries}):`, tagError);

                if (retryCount >= maxRetries) {
                  console.error("❌ [CHECK-STATUS] Tag sync failed after all retries!");
                  toast.error(
                    `⚠️ Nie udało się dodać tagu street_test_device.\nPowiadomienia mogą nie działać.\n\nSpróbuj wyłączyć i ponownie włączyć powiadomienia.`,
                    { duration: 8000 }
                  );
                } else {
                  // Exponential backoff
                  const waitTime = 1000 * Math.pow(2, retryCount - 1);
                  console.log(`[CHECK-STATUS] Waiting ${waitTime}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }
            }
          } else {
            const statusMessage = optedIn
              ? `Status: Subscribed ✅\nPermission: ${permission}\nID: ${id || 'None'}\nCheck console for details`
              : `Status: Not Subscribed ❌\nPermission: ${permission}\nID: ${id || 'None'}\n${permission === 'default' ? 'Click "Włącz powiadomienia" to subscribe' : 'Check console for details'}`;

            toast.success(statusMessage, { duration: 6000 });
          }
        } catch (innerError) {
          console.error("❌ [CHECK-STATUS] Inner error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [CHECK-STATUS] Error:", error);
      toast.error("Nie udało się sprawdzić statusu");
    }
  };

  const handleActivateServiceWorker = async () => {
    try {
      console.log("");
      console.log("🔄 [ACTIVATE-SW] ==================== ACTIVATING SERVICE WORKER ====================");
      console.log("[ACTIVATE-SW] Timestamp:", new Date().toISOString());

      if (!('serviceWorker' in navigator)) {
        toast.error("Service Worker nie jest wspierany");
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast.error("Brak zarejestrowanego Service Worker");
        return;
      }

      console.log("[ACTIVATE-SW] Current registration state:", {
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      });

      if (registration.waiting) {
        console.log("[ACTIVATE-SW] ⚠️ There is a service worker WAITING to activate!");
        console.log("[ACTIVATE-SW] This means an update is pending");
        console.log("[ACTIVATE-SW] Sending skipWaiting message...");

        // Tell the waiting service worker to skip waiting and activate
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Wait for the new service worker to take control
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[ACTIVATE-SW] ✅ Controller changed - new service worker activated!");
            resolve(true);
          }, { once: true });

          // Timeout after 5 seconds
          setTimeout(() => {
            console.log("[ACTIVATE-SW] ⏱️ Timeout waiting for controller change");
            resolve(false);
          }, 5000);
        });

        console.log("[ACTIVATE-SW] ✅ Service Worker update complete!");
        console.log("[ACTIVATE-SW] Reloading page to use new service worker...");
        toast.success("Service Worker zaktualizowany! Odświeżam stronę...", { duration: 2000 });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.log("[ACTIVATE-SW] ✅ No service worker waiting - already using latest version");
        toast.info("Service Worker już jest w najnowszej wersji");
      }

      console.log("[ACTIVATE-SW] ================================================================");
      console.log("");
    } catch (error) {
      console.error("❌ [ACTIVATE-SW] Error:", error);
      toast.error(`Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const handlePingServiceWorker = async () => {
    try {
      console.log("");
      console.log("🏓 [PING-SW] ==================== PINGING SERVICE WORKER ====================");
      console.log("[PING-SW] Timestamp:", new Date().toISOString());

      if (!('serviceWorker' in navigator)) {
        toast.error("Service Worker nie jest wspierany");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("[PING-SW] Service worker ready");

      if (!registration.active) {
        toast.error("Service Worker nie jest aktywny");
        console.error("[PING-SW] No active service worker");
        return;
      }

      console.log("[PING-SW] Sending PING message to service worker...");

      // Create a message channel for response
      const messageChannel = new MessageChannel();

      // Listen for response
      const responsePromise = new Promise((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          console.log("[PING-SW] Received response:", event.data);
          resolve(event.data);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          reject(new Error("Service Worker nie odpowiedział w ciągu 5 sekund"));
        }, 5000);
      });

      // Send message
      registration.active.postMessage(
        { type: 'PING', timestamp: new Date().toISOString() },
        [messageChannel.port2]
      );

      console.log("[PING-SW] Waiting for response...");

      try {
        const response = await responsePromise;
        console.log("✅ [PING-SW] PONG received!");
        console.log("[PING-SW] Response data:", response);
        console.log("[PING-SW] Service Worker is ALIVE and RESPONDING");
        console.log("[PING-SW] ================================================================");
        console.log("");

        const typedResponse = response as { scope?: string; timestamp?: string };
        toast.success(
          `Service Worker odpowiada! ✅\nScope: ${typedResponse.scope}\nCzas: ${typedResponse.timestamp}`,
          { duration: 5000 }
        );
      } catch (error) {
        console.error("❌ [PING-SW] No response from service worker:", error);
        console.log("[PING-SW] ================================================================");
        toast.error("Service Worker nie odpowiada!");
      }
    } catch (error) {
      console.error("❌ [PING-SW] Error:", error);
      toast.error(`Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const handleTestServiceWorkerPush = async () => {
    try {
      console.log("");
      console.log("🧪🧪🧪 [TEST-SW-PUSH] ==================== TESTING SERVICE WORKER PUSH ====================");
      console.log("[TEST-SW-PUSH] Timestamp:", new Date().toISOString());
      console.log("[TEST-SW-PUSH] This simulates a push notification going through the service worker");

      if (!('serviceWorker' in navigator)) {
        toast.error("Service Worker nie jest wspierany");
        return;
      }

      // Check if we have notification permission
      if (Notification.permission !== 'granted') {
        console.log("[TEST-SW-PUSH] Requesting permission first...");
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error("Potrzebne uprawnienia do powiadomień");
          return;
        }
      }

      console.log("[TEST-SW-PUSH] Getting service worker registration...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[TEST-SW-PUSH] Service worker registration:", {
        scope: registration.scope,
        active: !!registration.active,
        installing: !!registration.installing,
        waiting: !!registration.waiting,
        updateViaCache: registration.updateViaCache
      });

      if (!registration.active) {
        toast.error("Service Worker nie jest aktywny");
        return;
      }

      console.log("[TEST-SW-PUSH] Service worker state:", registration.active.state);
      console.log("[TEST-SW-PUSH] Service worker script URL:", registration.active.scriptURL);

      // Show notification via service worker
      console.log("[TEST-SW-PUSH] Showing notification via service worker...");
      await registration.showNotification("🧪 Test Service Worker Push", {
        body: "To powiadomienie przeszło przez Service Worker\nSprawdź console czy widzisz logi [SW-Show]",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "sw-push-test-" + Date.now(),
        requireInteraction: false,
        data: {
          test: true,
          timestamp: new Date().toISOString(),
          type: "service-worker-test"
        }
      });

      console.log("✅ [TEST-SW-PUSH] Notification shown via service worker");
      console.log("[TEST-SW-PUSH] Check console for [SW-Show] logs from service worker");
      console.log("[TEST-SW-PUSH] ================================================================");
      console.log("");

      toast.success("Test powiadomienia wysłany!\nSprawdź czy widzisz logi [SW-Show] w konsoli");
    } catch (error) {
      console.error("❌ [TEST-SW-PUSH] Error:", error);
      toast.error(`Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const handleTestBrowserNotification = async () => {
    try {
      console.log("🧪 [TEST-BROWSER] Testing browser notification...");

      // Check if notifications are supported
      if (!("Notification" in window)) {
        toast.error("Ten browser nie wspiera powiadomień");
        console.error("❌ [TEST-BROWSER] Notifications not supported");
        return;
      }

      // Check current permission
      console.log("[TEST-BROWSER] Current permission:", Notification.permission);

      // Request permission if needed
      if (Notification.permission === "default") {
        console.log("[TEST-BROWSER] Requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("[TEST-BROWSER] Permission result:", permission);

        if (permission !== "granted") {
          toast.error("Odmowa zezwolenia na powiadomienia");
          return;
        }
      }

      if (Notification.permission === "denied") {
        toast.error("Powiadomienia są zablokowane w przeglądarce");
        console.error("❌ [TEST-BROWSER] Permission denied");
        return;
      }

      // Check if we need to use Service Worker (required on Android)
      const useServiceWorker = 'serviceWorker' in navigator;
      console.log("[TEST-BROWSER] Using Service Worker method:", useServiceWorker);

      if (useServiceWorker) {
        // Android Chrome requires Service Worker registration
        console.log("[TEST-BROWSER] Getting service worker registration...");
        const registration = await navigator.serviceWorker.ready;
        console.log("[TEST-BROWSER] Service worker ready:", !!registration);

        if (!registration) {
          throw new Error("Service Worker not available");
        }

        // Use Service Worker's showNotification (works on all platforms including Android)
        console.log("[TEST-BROWSER] Calling registration.showNotification()...");
        await registration.showNotification("🧪 Test powiadomienia", {
          body: "To jest testowe powiadomienie z Service Worker (działa na Android!)",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "test-notification",
          requireInteraction: false,
          data: { test: true, url: window.location.href }
        });

        console.log("✅ [TEST-BROWSER] Test notification sent via Service Worker");
        toast.success("Testowe powiadomienie wysłane przez Service Worker!");
      } else {
        // Desktop browsers - use direct Notification API
        console.log("[TEST-BROWSER] Creating test notification directly...");
        const notification = new Notification("🧪 Test powiadomienia", {
          body: "To jest testowe powiadomienie bezpośrednio z przeglądarki",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "test-notification",
          requireInteraction: false,
          data: { test: true }
        });

        notification.onclick = function() {
          console.log("👆 [TEST-BROWSER] Notification clicked!");
          window.focus();
          notification.close();
        };

        notification.onshow = function() {
          console.log("✅ [TEST-BROWSER] Notification shown!");
        };

        notification.onerror = function(error) {
          console.error("❌ [TEST-BROWSER] Notification error:", error);
        };

        notification.onclose = function() {
          console.log("❌ [TEST-BROWSER] Notification closed");
        };

        console.log("✅ [TEST-BROWSER] Test notification created successfully");
        toast.success("Testowe powiadomienie wysłane!");
      }
    } catch (error) {
      console.error("❌ [TEST-BROWSER] Error:", error);
      toast.error(`Błąd podczas testu powiadomienia: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const handleSendPush = async () => {
    if (!pushMessage.trim()) {
      toast.error("Wprowadź wiadomość do wysłania");
      return;
    }

    if (!isSubscribed) {
      toast.error("Najpierw włącz powiadomienia push");
      return;
    }

    setIsSending(true);
    console.log("");
    console.log("📤📤📤 [SEND-PUSH] ==================== SENDING PUSH NOTIFICATION ====================");
    console.log("[SEND-PUSH] Timestamp:", new Date().toISOString());
    console.log("[SEND-PUSH] Message:", pushMessage);
    console.log("[SEND-PUSH] Current User ID:", userId);
    console.log("[SEND-PUSH] Current Push Token:", pushToken?.substring(0, 50) + "...");
    console.log("[SEND-PUSH] Is Subscribed (local state):", isSubscribed);

    try {
      const requestBody = {
        street: pushTag,
        message: pushMessage,
      };
      console.log("[SEND-PUSH] Request body:", requestBody);
      console.log("[SEND-PUSH] Tag being used:", pushTag);
      console.log("[SEND-PUSH] This will send to users with tag: street_" + pushTag.replace(/\s+/g, '_') + " = true");
      console.log("[SEND-PUSH] Invoking Supabase function: send-push-notifications");

      const { data, error } = await supabase.functions.invoke("send-push-notifications", {
        body: requestBody,
      });

      console.log("[SEND-PUSH] ==================== RESPONSE RECEIVED ====================");
      console.log("[SEND-PUSH] Response data:", data);
      console.log("[SEND-PUSH] Response error:", error);

      if (data?.data) {
        console.log("[SEND-PUSH] OneSignal response ID:", data.data.id);
        console.log("[SEND-PUSH] OneSignal recipients:", data.data.recipients);
        console.log("[SEND-PUSH] OneSignal errors:", data.data.errors);

        if (data.data.errors && data.data.errors.length > 0) {
          console.error("⚠️ [SEND-PUSH] OneSignal reported errors:", data.data.errors);
          console.error("[SEND-PUSH] This usually means:");
          console.error("  1. No users have the tag 'street_test_device' with optedIn=true");
          console.error("  2. Or the users exist but are not properly subscribed");
          console.error("[SEND-PUSH] Check OneSignal dashboard:");
          console.error("  - Go to Audience → Subscriptions");
          console.error("  - Filter by tag: street_test_device = true");
          console.error("  - Check if any users are shown");
          console.error("  - Check if their 'Subscribed' column = Yes");
        }
      }

      if (error) {
        console.error("❌ [SEND-PUSH] Supabase error:", error);
        toast.error("Nie udało się wysłać powiadomienia");
      } else {
        console.log("✅ [SEND-PUSH] Push notification sent successfully");
        toast.success("Powiadomienie wysłane!");
      }
      console.log("[SEND-PUSH] ================================================================");
      console.log("");
    } catch (error) {
      console.error("❌ [SEND-PUSH] Exception:", error);
      toast.error("Wystąpił błąd podczas wysyłania");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AdminLoginForm title="Push Notifications" description="Zaloguj się jako administrator" />;
  }

  if (!isAdmin) {
    return <AdminAccessDenied onSignOut={signOut} userEmail={user.email} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Seo title="Powiadomienia push — eJedzie.pl" description="Zarządzanie powiadomieniami push." noindex />
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="flex justify-end">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Wyloguj
          </Button>
        </div>
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Test Push Notifications
          </h1>
          <p className="text-muted-foreground">
            Testuj powiadomienia push OneSignal
          </p>
        </header>

        <div className="space-y-4 p-6 bg-card rounded-lg border">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="flex items-center gap-2">
              {isSubscribed ? (
                <>
                  <Bell className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">Powiadomienia włączone</span>
                </>
              ) : (
                <>
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Powiadomienia wyłączone</span>
                </>
              )}
            </div>
            {(userId || isSubscribed) && (
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                {userId ? (
                  <p className="font-mono break-all">
                    <strong>User ID:</strong> {userId}
                  </p>
                ) : (
                  <p className="text-amber-600">
                    ⏳ Oczekiwanie na User ID...
                  </p>
                )}
                {pushToken && (
                  <p className="font-mono break-all">
                    <strong>Token:</strong> {pushToken.length > 50 ? pushToken.substring(0, 50) + '...' : pushToken}
                  </p>
                )}
                {externalId && (
                  <p className="font-mono break-all">
                    <strong>External ID:</strong> {externalId}
                  </p>
                )}
                {isSubscribed && (
                  <p className="text-xs text-amber-600 mt-1">
                    💡 Tip: Na Androidzie subskrypcja może pojawić się jako "Linux armv8l" w dashboardzie OneSignal
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {isSubscribed ? (
              <Button
                onClick={handleUnregister}
                variant="outline"
                className="w-full"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Wyłącz powiadomienia
              </Button>
            ) : (
              <Button
                onClick={handleRegister}
                className="w-full"
                disabled={!isInitialized}
              >
                <Bell className="w-4 h-4 mr-2" />
                Włącz powiadomienia
              </Button>
            )}

            {isInitialized && (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 mb-2">
                  <p className="text-xs text-red-800 dark:text-red-200 font-semibold mb-2">
                    ⚠️ WAŻNE: Jeśli widzisz "waiting: true" w logach, kliknij poniżej!
                  </p>
                  <Button
                    onClick={handleActivateServiceWorker}
                    variant="destructive"
                    className="w-full"
                    size="sm"
                  >
                    🔄 Aktywuj nowy Service Worker
                  </Button>
                </div>

                <Button
                  onClick={handleDiagnoseSubscription}
                  variant="destructive"
                  className="w-full"
                >
                  🩺 Diagnoza subskrypcji
                </Button>

                <Button
                  onClick={handlePingServiceWorker}
                  variant="default"
                  className="w-full"
                >
                  🏓 Ping Service Worker
                </Button>

                <Button
                  onClick={handleTestServiceWorkerPush}
                  variant="default"
                  className="w-full"
                >
                  🔧 Test SW Notification
                </Button>

                <Button
                  onClick={handleCheckStatus}
                  variant="secondary"
                  className="w-full"
                >
                  🔍 Sprawdź pełny status
                </Button>

                <Button
                  onClick={handleTestBrowserNotification}
                  variant="outline"
                  className="w-full"
                >
                  🧪 Test powiadomienia przeglądarki
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold">Wyślij testowe powiadomienie</h2>

          <div className="space-y-2">
            <Label htmlFor="pushTag">Tag (street_)</Label>
            <Input
              id="pushTag"
              value={pushTag}
              onChange={(e) => setPushTag(e.target.value)}
              placeholder="test_device"
              disabled={!isSubscribed}
            />
            <p className="text-xs text-muted-foreground">
              Wyśle do użytkowników z tagiem: <span className="font-mono">street_{pushTag.replace(/\s+/g, '_')} = true</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pushMessage">Wiadomość</Label>
            <Input
              id="pushMessage"
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              placeholder="Wprowadź wiadomość..."
              disabled={!isSubscribed}
            />
          </div>

          <Button
            onClick={handleSendPush}
            disabled={!isSubscribed || isSending || !pushMessage.trim() || !pushTag.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Wysyłanie..." : "Wyślij powiadomienie"}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h2 className="font-semibold text-foreground">Instrukcja:</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Kliknij "Włącz powiadomienia" i zezwól na powiadomienia w przeglądarce</li>
            <li>Sprawdź User ID i token (pojawi się po subskrypcji)</li>
            <li>Wprowadź wiadomość testową</li>
            <li>Kliknij "Wyślij powiadomienie"</li>
            <li>Powiadomienie powinno pojawić się nawet gdy strona jest otwarta</li>
          </ol>

          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
              🔧 Naprawione problemy:
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li><strong>Android Chrome:</strong> Naprawiono błąd "Illegal constructor" - test powiadomień teraz używa Service Worker (działa na Android!)</li>
              <li><strong>Subskrypcje Android:</strong> Teraz działają prawidłowo. W dashboardzie OneSignal mogą się wyświetlać jako "Linux armv8l"</li>
              <li><strong>Wyświetlanie powiadomień:</strong> Dodano obsługę foreground notifications - powiadomienia będą się wyświetlać nawet gdy strona jest otwarta</li>
              <li><strong>Service Worker:</strong> Dodano handlery dla lepszej obsługi kliknięć w powiadomienia</li>
              <li><strong>Debugging:</strong> Dodano szczegółowe logi na każdym etapie: otrzymanie → wyświetlenie → kliknięcie</li>
              <li><strong>Tag matching:</strong> Naprawiono problem "All included players are not subscribed" - tag "street_test_device" jest teraz poprawnie dodawany</li>
            </ul>
          </div>

          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2">
              💡 Wskazówki debugowania:
            </h3>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li><strong>🩺 NOWE: "Diagnoza subskrypcji"</strong> - Kliknij to NAJPIERW na Androidzie! Pokaże dokładnie dlaczego subskrypcja nie działa</li>
              <li><strong>Problem Android:</strong> Jeśli Android pokazuje "registered but not subscribed", użyj "Diagnoza subskrypcji" aby zobaczyć co jest nie tak</li>
              <li><strong>🧪 Test przeglądarki:</strong> Sprawdza czy powiadomienia w ogóle działają (pomija OneSignal)</li>
              <li><strong>🔍 Pełny status:</strong> Pokazuje service worker, uprawnienia, tagi i wszystkie szczegóły</li>
              <li><strong>WAŻNE:</strong> Jeśli masz tag ale błąd "All included players are not subscribed", problem to optedIn=false</li>
              <li>Sprawdź console przeglądarki (F12) - wszystkie logi mają wyraźne nagłówki z ===</li>
              <li>Na Androidzie upewnij się że Chrome ma włączone powiadomienia w ustawieniach systemu</li>
              <li>Logi będą pokazywać: 🔔🔔🔔 otrzymane → ✅✅✅ wyświetlone → 👆👆👆 kliknięte</li>
            </ul>
          </div>
        </div>

        {/* Received Notifications History */}
        {receivedNotifications.length > 0 && (
          <div className="space-y-4 p-6 bg-card rounded-lg border">
            <h2 className="text-lg font-semibold">Odebrane powiadomienia ({receivedNotifications.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {receivedNotifications.map((notif, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg border">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium">{notif.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {notif.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.body}</p>
                  {notif.data && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Dane (kliknij aby rozwinąć)
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                        {JSON.stringify(notif.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Viewer */}
        <div className="mt-6">
          <ConsoleViewer />
        </div>

        <footer className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t border-border text-sm">
          <Link to="/" className="text-primary hover:underline">
            Strona główna
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/statystyki" className="text-primary hover:underline">
            Statystyki
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/rss" className="text-primary hover:underline">
            RSS
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Push;
