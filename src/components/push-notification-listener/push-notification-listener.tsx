"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { getFirebaseMessaging } from "../../lib/firebaseMessaging";
import { listenForForegroundMessages } from "../../services/pushNotificationService";

export function PushNotificationListener() {
  const { currentUser } = useAuth();
  const { showInfo } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      unsubscribe = listenForForegroundMessages(messaging, ({ title, body, data }) => {
        if (document.visibilityState === "visible" && "Notification" in window) {
          if (Notification.permission === "granted") {
            const notification = new Notification(title, {
              body,
              icon: "/vite.svg",
            });
            notification.onclick = () => {
              const link = data?.link || "/envios";
              window.focus();
              navigate(link);
              notification.close();
            };
            return;
          }
        }

        showInfo(body ? `${title}: ${body}` : title, 8000);
      });
    };

    setup().catch((error) => {
      console.warn("[FCM] Falha ao configurar listener foreground:", error);
    });

    return () => {
      unsubscribe?.();
    };
  }, [currentUser?.uid, navigate, showInfo]);

  return null;
}
