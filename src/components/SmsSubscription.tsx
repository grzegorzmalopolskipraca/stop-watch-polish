import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

interface SmsSubscriptionProps {
  selectedStreet: string;
}

export const SmsSubscription = ({ selectedStreet }: SmsSubscriptionProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [goToWorkHour, setGoToWorkHour] = useState("");
  const [goToWorkMinute, setGoToWorkMinute] = useState("");
  const [backToHomeHour, setBackToHomeHour] = useState("");
  const [backToHomeMinute, setBackToHomeMinute] = useState("");
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateTime = (hour: string, minute: string, fieldName: string): boolean => {
    if (!hour || !minute) {
      toast.error(`Proszę wypełnić ${fieldName}`);
      return false;
    }

    const h = parseInt(hour);
    const m = parseInt(minute);

    if (isNaN(h) || isNaN(m)) {
      toast.error(`${fieldName} musi zawierać liczby`);
      return false;
    }

    if (h < 0 || h > 23) {
      toast.error(`Godzina w ${fieldName} musi być między 0 a 23`);
      return false;
    }

    if (m < 0 || m > 59) {
      toast.error(`Minuty w ${fieldName} muszą być między 0 a 59`);
      return false;
    }

    return true;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, "");
    
    if (cleanPhone.length !== 8 && cleanPhone.length !== 9) {
      toast.error("Numer telefonu musi mieć 8 lub 9 cyfr");
      return false;
    }

    if (!/^\d+$/.test(cleanPhone)) {
      toast.error("Numer telefonu może zawierać tylko cyfry");
      return false;
    }

    return true;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      toast.error("Podaj prawidłowy adres e-mail");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Validate that at least phone or email is provided
    if (!phoneNumber && !email) {
      toast.error("Podaj numer telefonu lub adres e-mail");
      return;
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return;
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return;
    }

    // Validate work hours if provided
    if ((goToWorkHour || goToWorkMinute) && !validateTime(goToWorkHour, goToWorkMinute, "godziny wyjazdu do pracy")) {
      return;
    }

    // Validate home hours if provided
    if ((backToHomeHour || backToHomeMinute) && !validateTime(backToHomeHour, backToHomeMinute, "godziny powrotu z pracy")) {
      return;
    }

    // Validate consents
    if (!consentDataProcessing) {
      toast.error("Wymagana jest zgoda na przetwarzanie danych osobowych");
      return;
    }

    if (!consentMarketing) {
      toast.error("Wymagana jest zgoda na otrzymywanie komunikacji elektroniczną");
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToInsert: any = {
        street: selectedStreet,
        consent_data_processing: consentDataProcessing,
        consent_marketing: consentMarketing,
        consent_timestamp: new Date().toISOString(),
      };

      // Add phone number if provided
      if (phoneNumber) {
        dataToInsert.phone_number = `+48${phoneNumber.replace(/\s/g, "")}`;
      }

      // Add email if provided
      if (email) {
        dataToInsert.email = email.trim();
      }

      // Add hours if provided
      if (goToWorkHour && goToWorkMinute) {
        dataToInsert.go_to_work_hour = `${goToWorkHour.padStart(2, '0')}:${goToWorkMinute.padStart(2, '0')}`;
      }

      if (backToHomeHour && backToHomeMinute) {
        dataToInsert.back_to_home_hour = `${backToHomeHour.padStart(2, '0')}:${backToHomeMinute.padStart(2, '0')}`;
      }

      const { error } = await supabase
        .from("sms_subscriptions")
        .insert(dataToInsert);

      if (error) throw error;

      toast.success("Zapisano na powiadomienia!");
      
      // Clear form
      setPhoneNumber("");
      setEmail("");
      setGoToWorkHour("");
      setGoToWorkMinute("");
      setBackToHomeHour("");
      setBackToHomeMinute("");
      setConsentDataProcessing(false);
      setConsentMarketing(false);
    } catch (error: any) {
      console.error("Error saving subscription:", error);
      toast.error("Wystąpił błąd podczas zapisywania. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-blue-100 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        Zapisz się na ważne powiadomienia SMS/E-mail
      </h3>
      
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
        Otrzymasz SMS lub e-mail, gdy wystąpi <span className="font-semibold">Blokada</span> lub inne nagłe zdarzenie potwierdzone przez kilka osób. 
        To pozwoli Ci uniknąć nieprzyjemności.
      </p>
      
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
        Raz w tygodniu w <span className="font-semibold">Poniedziałek rano</span> otrzymasz wiadomość z godzinami <span className="font-semibold">Zielonej Fali</span>, 
        by dobrze zacząć tydzień i pojechać do pracy bez korków.
      </p>

      <div className="space-y-5">
        {/* Phone Number */}
        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Numer telefonu (opcjonalnie)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600">
              +48
            </span>
            <Input
              id="phone"
              type="tel"
              placeholder="123456789"
              maxLength={9}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              className="flex-1"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Adres e-mail (opcjonalnie)
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Go to Work Time */}
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Przeważnie wyjeżdżam do pracy o (opcjonalnie):
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="HH"
              maxLength={2}
              value={goToWorkHour}
              onChange={(e) => setGoToWorkHour(e.target.value.replace(/\D/g, ""))}
              className="w-20 text-center"
            />
            <span className="text-xl font-bold text-gray-700 dark:text-gray-300">:</span>
            <Input
              type="text"
              placeholder="MM"
              maxLength={2}
              value={goToWorkMinute}
              onChange={(e) => setGoToWorkMinute(e.target.value.replace(/\D/g, ""))}
              className="w-20 text-center"
            />
          </div>
        </div>

        {/* Back to Home Time */}
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Wracam z pracy o godzinie (opcjonalnie):
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="HH"
              maxLength={2}
              value={backToHomeHour}
              onChange={(e) => setBackToHomeHour(e.target.value.replace(/\D/g, ""))}
              className="w-20 text-center"
            />
            <span className="text-xl font-bold text-gray-700 dark:text-gray-300">:</span>
            <Input
              type="text"
              placeholder="MM"
              maxLength={2}
              value={backToHomeMinute}
              onChange={(e) => setBackToHomeMinute(e.target.value.replace(/\D/g, ""))}
              className="w-20 text-center"
            />
          </div>
        </div>

        {/* RODO Consents */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Data Processing Consent */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent-data"
              checked={consentDataProcessing}
              onCheckedChange={(checked) => setConsentDataProcessing(checked as boolean)}
              className="mt-1"
            />
            <Label
              htmlFor="consent-data"
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer"
            >
              Wyrażam zgodę na przetwarzanie moich danych osobowych (numer telefonu i/lub adres e-mail, godziny wyjazdu i dojazdu) przez eJedzie.pl w celu otrzymywania powiadomień SMS lub e-mail o nowościach w aplikacji oraz o zagrożeniach na drodze. Zgoda jest dobrowolna i może zostać w każdej chwili cofnięta.
            </Label>
          </div>

          {/* Marketing Consent */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent-marketing"
              checked={consentMarketing}
              onCheckedChange={(checked) => setConsentMarketing(checked as boolean)}
              className="mt-1"
            />
            <Label
              htmlFor="consent-marketing"
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer"
            >
              Wyrażam zgodę na otrzymywanie informacji handlowych drogą elektroniczną (SMS, e-mail) od eJedzie.pl zgodnie z ustawą o świadczeniu usług drogą elektroniczną.
            </Label>
          </div>

          {/* Information Clause */}
          <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="font-semibold">Informacja RODO:</span> Administratorem danych jest eJedzie.pl. Dane będą przetwarzane wyłącznie w celu wysyłki powiadomień i nie będą przekazywane innym podmiotom. Szczegóły znajdują się w Polityce prywatności.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          {isSubmitting ? "Zapisywanie..." : "Zapisz na powiadomienia"}
        </Button>

        {/* Disclaimer */}
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-4">
          <p>* Dane będą używane wyłącznie do ważnych powiadomień (bez spamu, nie za często)</p>
          <p>(Można się wypisać w każdej chwili pisząc do mnie mail a w nim podając numer lub adres e-mail)</p>
        </div>
      </div>
    </div>
  );
};
